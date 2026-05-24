from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Try to import Prophet; if it fails (e.g. during build environment check or binary issues), we use a fallback
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False

app = FastAPI(title="AMX-ERP-2026 AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TimeSeriesPoint(BaseModel):
    day: str
    actual: Optional[float] = None
    pred: Optional[float] = None

class DemandPrediction(BaseModel):
    sku: str
    predictedDemand: int
    confidenceScore: float
    stockoutRisk: str
    recommendedReorder: int
    date: str
    timeSeries: List[TimeSeriesPoint]

class AIForecastResponse(BaseModel):
    jobId: str
    status: str
    predictions: List[DemandPrediction]

# Define SKU reference properties matching seeded database levels
SKU_METADATA = {
    "SKU-1001": {"name": "ThinkPad T14 Gen 3", "current_stock": 45, "safety_threshold": 10, "avg_sales": 2.2, "trend": 0.005},
    "SKU-1002": {"name": "Ergonomic Office Chair", "current_stock": 8, "safety_threshold": 15, "avg_sales": 0.8, "trend": 0.001},
    "SKU-1003": {"name": "Wireless Mouse M720", "current_stock": 120, "safety_threshold": 30, "avg_sales": 5.4, "trend": -0.002},
    "SKU-1004": {"name": "27-inch 4K Monitor", "current_stock": 4, "safety_threshold": 10, "avg_sales": 1.1, "trend": 0.008},
}

def generate_forecast_for_sku(sku: str) -> DemandPrediction:
    meta = SKU_METADATA.get(sku, {"current_stock": 10, "safety_threshold": 5, "avg_sales": 1.0, "trend": 0.0})
    current_stock = meta["current_stock"]
    safety = meta["safety_threshold"]
    avg_sales = meta["avg_sales"]
    trend = meta["trend"]

    # 1. Simulate 180 days of historical sales data
    end_date = datetime.now()
    start_date = end_date - timedelta(days=180)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Create simulated sales series with seasonality (weekly cycle) and trend
    sales = []
    for i, date in enumerate(dates):
        # Base daily sales + linear trend
        base = avg_sales + (i * trend)
        # Weekly seasonality (higher sales on Mon-Wed, lower on weekends)
        seasonality = 1.3 if date.weekday() < 3 else (0.6 if date.weekday() >= 5 else 1.0)
        # Random noise
        noise = np.random.normal(0, avg_sales * 0.25)
        qty = max(0, int(base * seasonality + noise))
        sales.append(qty)

    df = pd.DataFrame({
        'ds': dates,
        'y': sales
    })

    points = []
    # 1.5 Fill the last 15 days of historical simulated sales as actual data
    for i in range(-15, 0):
        hist_date = df['ds'].iloc[i]
        points.append(TimeSeriesPoint(
            day=hist_date.strftime("%b %d"),
            actual=float(df['y'].iloc[i]),
            pred=None
        ))

    # 2. Run forecasting model (Prophet or moving average fallback)
    predicted_qty = 0
    confidence = 0.85
    
    if PROPHET_AVAILABLE:
        try:
            # Instantiate and fit Prophet with minimal settings for high speed
            m = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=False,
                interval_width=0.80
            )
            # Suppress console printing during fit
            m.fit(df)
            
            # Predict next 30 days
            future = m.make_future_dataframe(periods=30, include_history=False)
            forecast = m.predict(future)
            
            # Sum up predictions over the next 30 days
            predicted_qty = int(max(0, forecast['yhat'].sum()))
            
            # Estimate confidence based on prediction uncertainty intervals
            yhat_upper = forecast['yhat_upper'].sum()
            yhat_lower = forecast['yhat_lower'].sum()
            uncertainty = (yhat_upper - yhat_lower) / max(1, predicted_qty)
            confidence = max(0.5, min(0.95, 1.0 - uncertainty))

            # Populate future points from Prophet forecast
            for idx, row in forecast.iterrows():
                pred_date = row['ds']
                points.append(TimeSeriesPoint(
                    day=pred_date.strftime("%b %d"),
                    actual=None,
                    pred=round(max(0.0, float(row['yhat'])), 2)
                ))
        except Exception as e:
            # Fallback to double exponential smoothing if Prophet fails
            alpha = 0.3
            beta = 0.1
            level = df['y'].iloc[0]
            trend_val = df['y'].iloc[1] - df['y'].iloc[0]
            for val in df['y']:
                last_level = level
                level = alpha * val + (1 - alpha) * (level + trend_val)
                trend_val = beta * (level - last_level) + (1 - beta) * trend_val
            
            # Forecast next 30 days
            pred_list = []
            for step in range(1, 31):
                pred_val = level + step * trend_val
                pred_list.append(pred_val)
                pred_date = end_date + timedelta(days=step)
                points.append(TimeSeriesPoint(
                    day=pred_date.strftime("%b %d"),
                    actual=None,
                    pred=round(max(0.0, float(pred_val)), 2)
                ))
            predicted_qty = int(max(0, sum(pred_list)))
            confidence = 0.72
    else:
        # Simple weighted 30-day moving average fallback if Prophet is not installed
        weights = np.arange(1, 181)
        weighted_avg = np.dot(df['y'], weights) / weights.sum()
        predicted_qty = int(weighted_avg * 30)
        confidence = 0.65

        # Populate future points
        for step in range(1, 31):
            pred_date = end_date + timedelta(days=step)
            points.append(TimeSeriesPoint(
                day=pred_date.strftime("%b %d"),
                actual=None,
                pred=round(max(0.0, float(weighted_avg)), 2)
            ))

    # 3. Dynamic Stockout Risk
    if current_stock <= safety:
        stockout_risk = "High"
    elif current_stock < predicted_qty:
        stockout_risk = "Medium"
    else:
        stockout_risk = "Low"

    # 4. Recommended Reorder Quantity
    if stockout_risk in ["High", "Medium"]:
        recommended_reorder = int(np.ceil((predicted_qty + safety - current_stock) / 5.0) * 5)
        # Ensure it is positive and logical
        recommended_reorder = max(10, recommended_reorder)
    else:
        recommended_reorder = 0

    return DemandPrediction(
        sku=sku,
        predictedDemand=predicted_qty,
        confidenceScore=round(float(confidence), 2),
        stockoutRisk=stockout_risk,
        recommendedReorder=recommended_reorder,
        date=datetime.now().strftime("%Y-%m-%d"),
        timeSeries=points
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-service", "prophet_loaded": PROPHET_AVAILABLE}

@app.post("/api/v1/forecast/demand", response_model=AIForecastResponse)
def generate_demand_forecast():
    """
    Generate demand forecast based on historical data.
    Simulates transaction history and fits a real Prophet model dynamically for each ERP product.
    """
    try:
        predictions = []
        for sku in SKU_METADATA.keys():
            predictions.append(generate_forecast_for_sku(sku))
            
        return AIForecastResponse(
            jobId=str(uuid.uuid4()),
            status="Completed",
            predictions=predictions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting engine error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
