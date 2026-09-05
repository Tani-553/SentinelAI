"""FastAPI entry point for the SentinelAI Risk Engine."""

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.schemas import PredictionRequest, PredictionResponse
from backend.app.services.risk_engine import RiskEngine


app = FastAPI(title="SentinelAI Risk Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
risk_engine = RiskEngine()


@app.get("/health")
def health_check() -> dict[str, str]:
    """Report whether the API service is available."""
    return {"status": "ok", "service": "SentinelAI Risk Engine"}


@app.get("/metrics")
def get_metrics() -> dict[str, Any]:
    """Return the real held-out evaluation metrics saved by the ML module."""
    return risk_engine.get_metrics()


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    """Score one transaction using the existing saved model and preprocessor."""
    return risk_engine.predict(request.transaction, request.risk_mode)
