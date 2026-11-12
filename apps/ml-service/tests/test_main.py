from datetime import date, datetime, timedelta, timezone

import pandas as pd
import pytest
from fastapi.testclient import TestClient

import main

TOKEN = "test-internal-token-123"


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("ML_INTERNAL_TOKEN", TOKEN)
    # Keep tests fast and deterministic: never fit Prophet here.
    monkeypatch.setattr(main, "PROPHET_AVAILABLE", False)
    main.cache.clear()
    yield


client = TestClient(main.app)
AUTH = {"X-Internal-Token": TOKEN}


def item(sku="SKU-1", stock=50, safety=10, days=60, qty=3.0):
    today = datetime.now(timezone.utc).date()
    history = [{"date": (today - timedelta(days=i)).isoformat(), "quantity": qty} for i in range(1, days + 1)]
    return {"sku": sku, "name": "Widget", "currentStock": stock, "safetyStock": safety, "history": history}


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_rejects_missing_or_wrong_token():
    body = {"items": [item()]}
    assert client.post("/api/v1/forecast/demand", json=body).status_code == 401
    assert client.post("/api/v1/forecast/demand", json=body, headers={"X-Internal-Token": "nope"}).status_code == 401


def test_refuses_when_token_not_configured(monkeypatch):
    monkeypatch.delenv("ML_INTERNAL_TOKEN")
    assert client.post("/api/v1/forecast/demand", json={"items": [item()]}, headers=AUTH).status_code == 503


def test_forecast_uses_supplied_history():
    res = client.post("/api/v1/forecast/demand", json={"horizonDays": 30, "items": [item(qty=3.0)]}, headers=AUTH)
    assert res.status_code == 200
    pred = res.json()["predictions"][0]
    assert pred["sku"] == "SKU-1"
    assert pred["model"] == "holt"
    # Steady demand of 3/day over the last 60 days → roughly 90 over 30 days
    assert 60 <= pred["predictedDemand"] <= 120
    assert len([p for p in pred["timeSeries"] if p["pred"] is not None]) == 30
    assert pred["currentStock"] == 50
    assert pred["stockoutRisk"] == "Medium"  # 50 in stock < ~90 predicted
    assert pred["recommendedReorder"] > 0


def test_no_history_means_zero_demand():
    res = client.post("/api/v1/forecast/demand", json={"items": [item(days=0, stock=100)]}, headers=AUTH)
    pred = res.json()["predictions"][0]
    assert pred["model"] == "moving_average"
    assert pred["predictedDemand"] == 0
    assert pred["stockoutRisk"] == "Low"


def test_results_are_cached():
    body = {"items": [item()]}
    first = client.post("/api/v1/forecast/demand", json=body, headers=AUTH).json()
    second = client.post("/api/v1/forecast/demand", json=body, headers=AUTH).json()
    assert first["cached"] is False
    assert second["cached"] is True
    assert first["predictions"] == second["predictions"]


@pytest.mark.parametrize(
    "bad",
    [
        {"items": []},
        {"items": [{**item(), "currentStock": -1}]},
        {"items": [{**item(), "history": [{"date": "2026-01-01", "quantity": -5}]}]},
        {"items": [{**item(), "history": [{"date": "2026-01-01", "quantity": 1}, {"date": "2026-01-01", "quantity": 2}]}]},
        {"horizonDays": 365, "items": [item()]},
    ],
)
def test_validates_input(bad):
    assert client.post("/api/v1/forecast/demand", json=bad, headers=AUTH).status_code == 422


def test_no_cors_headers_for_browsers():
    res = client.options(
        "/api/v1/forecast/demand",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in res.headers


def test_daily_series_fills_missing_days_with_zero():
    today = date(2026, 6, 30)  # series ends on 06-29
    it = main.ForecastItem(sku="X", currentStock=0, safetyStock=0, history=[{"date": "2026-06-29", "quantity": 4}])
    s = main.daily_series(it, today)
    assert len(s) == main.HISTORY_DAYS
    assert s.index[-1] == pd.Timestamp("2026-06-29")
    assert s.iloc[-1] == 4 and s.iloc[-2] == 0


def test_intermittent_demand_uses_recent_mean():
    today = datetime.now(timezone.utc).date()
    # one unit every third day → ~0.33/day → ~10 over 30 days
    history = [{"date": (today - timedelta(days=i)).isoformat(), "quantity": 1} for i in range(1, 91) if i % 3 == 0]
    body = {"items": [{"sku": "INT", "currentStock": 100, "safetyStock": 5, "history": history}]}
    pred = client.post("/api/v1/forecast/demand", json=body, headers=AUTH).json()["predictions"][0]
    assert pred["model"] == "moving_average"
    assert 7 <= pred["predictedDemand"] <= 13
