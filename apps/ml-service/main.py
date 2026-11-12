"""AMX-ERP-2026 demand-forecasting service.

Called only by the API (never by browsers). The API sends, per SKU, the real
daily OUT quantities from stock_movements plus current stock; this service
fits a model per SKU and returns a demand forecast.

Security: every forecast request must carry the shared secret in the
X-Internal-Token header (ML_INTERNAL_TOKEN). Without a configured token the
service refuses forecast requests.

Models, chosen per SKU by how much history exists:
  - prophet         >= MIN_POINTS_PROPHET non-zero days and Prophet installed
  - holt            >= 2 days of history (double exponential smoothing)
  - moving_average  otherwise (all-zero / no history)
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import threading
import time
import uuid
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
from typing import List, Literal, Optional

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

try:  # Prophet is heavy; the service still works (with simpler models) without it.
    from prophet import Prophet

    PROPHET_AVAILABLE = True
    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
    logging.getLogger("prophet").setLevel(logging.WARNING)
except ImportError:  # pragma: no cover - depends on the environment
    PROPHET_AVAILABLE = False

log = logging.getLogger("ml-service")

HISTORY_DAYS = 180
MIN_POINTS_PROPHET = 14
# Below this share of non-zero days a series counts as intermittent demand
INTERMITTENT_THRESHOLD = 0.6
CACHE_TTL_SECONDS = int(os.getenv("ML_CACHE_TTL_SECONDS", "3600"))
CACHE_MAX_ENTRIES = int(os.getenv("ML_CACHE_MAX_ENTRIES", "256"))

app = FastAPI(title="AMX-ERP-2026 AI Service", version="0.2.0")


# ── Schemas ───────────────────────────────────────────────────────────────────


class HistoryPoint(BaseModel):
    date: date
    quantity: float = Field(ge=0, le=1_000_000)


class ForecastItem(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: Optional[str] = Field(default=None, max_length=200)
    currentStock: int = Field(ge=0, le=100_000_000)
    safetyStock: int = Field(ge=0, le=100_000_000)
    history: List[HistoryPoint] = Field(default_factory=list, max_length=HISTORY_DAYS + 31)

    @field_validator("history")
    @classmethod
    def unique_dates(cls, v: List[HistoryPoint]) -> List[HistoryPoint]:
        if len({p.date for p in v}) != len(v):
            raise ValueError("history dates must be unique")
        return v


class ForecastRequest(BaseModel):
    horizonDays: int = Field(default=30, ge=7, le=90)
    items: List[ForecastItem] = Field(min_length=1, max_length=20)


class TimeSeriesPoint(BaseModel):
    day: str
    actual: Optional[float] = None
    pred: Optional[float] = None


class DemandPrediction(BaseModel):
    sku: str
    name: Optional[str] = None
    predictedDemand: int
    confidenceScore: float
    stockoutRisk: Literal["Low", "Medium", "High"]
    recommendedReorder: int
    currentStock: int
    model: Literal["prophet", "holt", "moving_average"]
    date: str
    timeSeries: List[TimeSeriesPoint]


class AIForecastResponse(BaseModel):
    jobId: str
    status: Literal["Completed"]
    cached: bool = False
    predictions: List[DemandPrediction]


# ── Auth ──────────────────────────────────────────────────────────────────────


def require_internal_token(x_internal_token: Optional[str] = Header(default=None)) -> None:
    expected = os.getenv("ML_INTERNAL_TOKEN", "")
    if len(expected) < 16:
        raise HTTPException(status_code=503, detail="ML_INTERNAL_TOKEN is not configured")
    if not x_internal_token or not hmac.compare_digest(x_internal_token.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Invalid internal token")


# ── Cache ─────────────────────────────────────────────────────────────────────


class TTLCache:
    """Small thread-safe LRU cache with per-entry expiry."""

    def __init__(self, max_entries: int, ttl: int) -> None:
        self.max_entries = max_entries
        self.ttl = ttl
        self._data: "OrderedDict[str, tuple[float, DemandPrediction]]" = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[DemandPrediction]:
        with self._lock:
            hit = self._data.get(key)
            if not hit:
                return None
            stored_at, value = hit
            if time.monotonic() - stored_at > self.ttl:
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: str, value: DemandPrediction) -> None:
        with self._lock:
            self._data[key] = (time.monotonic(), value)
            self._data.move_to_end(key)
            while len(self._data) > self.max_entries:
                self._data.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


cache = TTLCache(CACHE_MAX_ENTRIES, CACHE_TTL_SECONDS)


def cache_key(item: ForecastItem, horizon: int, today: date) -> str:
    payload = json.dumps(
        {"item": item.model_dump(mode="json"), "h": horizon, "d": today.isoformat(), "p": PROPHET_AVAILABLE},
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


# ── Forecasting ───────────────────────────────────────────────────────────────


def daily_series(item: ForecastItem, today: date) -> pd.Series:
    """Daily demand for the HISTORY_DAYS complete days before today (today is still
    in progress, so it is excluded). Days without movements count as 0."""
    end = today - timedelta(days=1)
    start = end - timedelta(days=HISTORY_DAYS - 1)
    index = pd.date_range(start=start, end=end, freq="D")
    s = pd.Series(0.0, index=index)
    for p in item.history:
        ts = pd.Timestamp(p.date)
        if ts in s.index:
            s[ts] += p.quantity
    return s


def fit_holt(y: np.ndarray, horizon: int, alpha: float = 0.3, beta: float = 0.1, phi: float = 0.9) -> np.ndarray:
    """Damped-trend Holt smoothing: the trend fades out instead of extrapolating forever."""
    level, trend = float(y[0]), 0.0
    for v in y[1:]:
        prev = level
        level = alpha * v + (1 - alpha) * (level + phi * trend)
        trend = beta * (level - prev) + (1 - beta) * phi * trend
    damp = np.cumsum(phi ** np.arange(1, horizon + 1))
    return np.maximum(0.0, level + trend * damp)


def forecast_item(item: ForecastItem, horizon: int, today: date) -> DemandPrediction:
    series = daily_series(item, today)
    y = series.to_numpy()
    nonzero = int((y > 0).sum())
    # Share of selling days, measured from the first sale (new products are not "intermittent")
    first_sale = int(np.argmax(y > 0)) if nonzero else len(y)
    active_share = nonzero / max(1, len(y) - first_sale)

    model: str
    preds: np.ndarray
    confidence: float
    if PROPHET_AVAILABLE and nonzero >= MIN_POINTS_PROPHET:
        try:
            m = Prophet(yearly_seasonality=False, weekly_seasonality=True, daily_seasonality=False, interval_width=0.8)
            m.fit(pd.DataFrame({"ds": series.index, "y": y}))
            fc = m.predict(m.make_future_dataframe(periods=horizon, include_history=False))
            preds = np.maximum(0.0, fc["yhat"].to_numpy())
            total = max(1.0, float(preds.sum()))
            spread = float((fc["yhat_upper"] - fc["yhat_lower"]).sum())
            confidence = max(0.5, min(0.95, 1.0 - spread / (4 * total)))
            model = "prophet"
        except Exception:  # noqa: BLE001 - fall back to a simpler model
            log.exception("Prophet failed for %s; falling back to Holt", item.sku)
            preds, confidence, model = fit_holt(y, horizon), 0.7, "holt"
    elif nonzero >= 2 and active_share >= INTERMITTENT_THRESHOLD:
        preds, confidence, model = fit_holt(y, horizon), 0.7, "holt"
    elif nonzero >= 2:
        # Intermittent demand (mostly zero days): exponential smoothing decays
        # toward zero between sales, so use the recent daily mean instead.
        avg = float(y[-60:].mean())
        preds, confidence, model = np.full(horizon, avg), 0.6, "moving_average"
    else:
        avg = float(y[-30:].mean()) if len(y) else 0.0
        preds, confidence, model = np.full(horizon, avg), 0.5, "moving_average"

    predicted = int(round(float(preds.sum())))

    if item.currentStock <= item.safetyStock:
        risk = "High"
    elif item.currentStock < predicted:
        risk = "Medium"
    else:
        risk = "Low"

    reorder = 0
    if risk != "Low":
        reorder = max(0, int(np.ceil((predicted + item.safetyStock - item.currentStock) / 5.0) * 5))

    points = [TimeSeriesPoint(day=ts.strftime("%b %d"), actual=float(v)) for ts, v in series.iloc[-15:].items()]
    for i, v in enumerate(preds, start=1):
        points.append(TimeSeriesPoint(day=(today + timedelta(days=i - 1)).strftime("%b %d"), pred=round(float(v), 2)))

    return DemandPrediction(
        sku=item.sku,
        name=item.name,
        predictedDemand=predicted,
        confidenceScore=round(float(confidence), 2),
        stockoutRisk=risk,  # type: ignore[arg-type]
        recommendedReorder=reorder,
        currentStock=item.currentStock,
        model=model,  # type: ignore[arg-type]
        date=today.isoformat(),
        timeSeries=points,
    )


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "ml-service", "prophet_loaded": PROPHET_AVAILABLE}


@app.post(
    "/api/v1/forecast/demand",
    response_model=AIForecastResponse,
    dependencies=[Depends(require_internal_token)],
)
def generate_demand_forecast(req: ForecastRequest) -> AIForecastResponse:
    today = datetime.now(timezone.utc).date()
    predictions: List[DemandPrediction] = []
    all_cached = True
    for item in req.items:
        key = cache_key(item, req.horizonDays, today)
        hit = cache.get(key)
        if hit is None:
            all_cached = False
            hit = forecast_item(item, req.horizonDays, today)
            cache.set(key, hit)
        predictions.append(hit)
    return AIForecastResponse(jobId=str(uuid.uuid4()), status="Completed", cached=all_cached, predictions=predictions)


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
