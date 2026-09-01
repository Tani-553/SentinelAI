"""Request and response schemas for the SentinelAI Risk Engine API."""

from enum import Enum
import math

from pydantic import BaseModel, ConfigDict, model_validator


class RiskMode(str, Enum):
    """Operating modes supported by the saved threshold analysis."""

    FRAUD_PROTECTION = "fraud_protection"
    BALANCED = "balanced"
    CUSTOMER_FRIENDLY = "customer_friendly"


class TransactionFeatures(BaseModel):
    """The exact 30 feature columns expected by the existing preprocessor."""

    model_config = ConfigDict(extra="forbid")

    Time: float
    V1: float
    V2: float
    V3: float
    V4: float
    V5: float
    V6: float
    V7: float
    V8: float
    V9: float
    V10: float
    V11: float
    V12: float
    V13: float
    V14: float
    V15: float
    V16: float
    V17: float
    V18: float
    V19: float
    V20: float
    V21: float
    V22: float
    V23: float
    V24: float
    V25: float
    V26: float
    V27: float
    V28: float
    Amount: float

    @model_validator(mode="after")
    def validate_finite_values(self) -> "TransactionFeatures":
        """Reject NaN and infinity before they reach the saved ML artifacts."""
        if not all(math.isfinite(value) for value in self.model_dump().values()):
            raise ValueError("Transaction feature values must be finite numbers.")
        return self


class PredictionRequest(BaseModel):
    """A transaction and the desired operating mode."""

    model_config = ConfigDict(extra="forbid")

    transaction: TransactionFeatures
    risk_mode: RiskMode = RiskMode.BALANCED


class PredictionResponse(BaseModel):
    """Model score and threshold-based action for one transaction."""

    fraud_probability: float
    risk_score: float
    risk_mode: RiskMode
    threshold_used: float
    decision: str
    explanation: str
