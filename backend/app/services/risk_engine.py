"""Load the existing SentinelAI artifacts and produce risk decisions."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from backend.app.schemas import PredictionResponse, RiskMode, TransactionFeatures


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODELS_DIR = PROJECT_ROOT / "ml" / "models"
MODEL_PATH = MODELS_DIR / "best_model.joblib"
PREPROCESSOR_PATH = MODELS_DIR / "preprocessor.joblib"
METRICS_PATH = MODELS_DIR / "test_metrics.json"

THRESHOLDS = {
    RiskMode.FRAUD_PROTECTION: 0.30,
    RiskMode.BALANCED: 0.70,
    RiskMode.CUSTOMER_FRIENDLY: 0.90,
}


class RiskEngine:
    """Small service layer around the model trained by the ML module."""

    def __init__(self) -> None:
        self.model = self._load_artifact(MODEL_PATH)
        self.preprocessor = self._load_artifact(PREPROCESSOR_PATH)
        self.metrics = self._load_json(METRICS_PATH)
        self.feature_names = list(self.preprocessor.feature_names_in_)
        self._validate_artifacts()

    @staticmethod
    def _load_artifact(path: Path) -> Any:
        if not path.exists():
            raise FileNotFoundError(f"Required ML artifact was not found: {path}")
        return joblib.load(path)

    @staticmethod
    def _load_json(path: Path) -> dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"Required ML output was not found: {path}")
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _validate_artifacts(self) -> None:
        """Fail early if saved artifacts cannot be used together safely."""
        expected_schema = list(TransactionFeatures.model_fields)
        if self.feature_names != expected_schema:
            raise ValueError(
                "The API schema does not match the feature order in preprocessor.joblib."
            )
        if self.model.n_features_in_ != len(self.feature_names):
            raise ValueError("The model and preprocessor expect different feature counts.")

    def get_metrics(self) -> dict[str, Any]:
        """Return the persisted test metrics without recalculating them."""
        return self.metrics

    def predict(
        self, transaction: TransactionFeatures, risk_mode: RiskMode
    ) -> PredictionResponse:
        """Preprocess one validated transaction and apply the selected threshold."""
        transaction_frame = pd.DataFrame(
            [transaction.model_dump()], columns=self.feature_names
        )
        processed_transaction = self.preprocessor.transform(transaction_frame)
        fraud_probability = float(
            self.model.predict_proba(processed_transaction)[0, 1]
        )
        threshold = THRESHOLDS[risk_mode]
        is_blocked = fraud_probability >= threshold

        if is_blocked:
            explanation = "Transaction exceeded the configured fraud-risk threshold."
            decision = "BLOCK"
        else:
            explanation = "Transaction remained below the configured fraud-risk threshold."
            decision = "APPROVE"

        return PredictionResponse(
            fraud_probability=fraud_probability,
            risk_score=round(fraud_probability * 100, 2),
            risk_mode=risk_mode,
            threshold_used=threshold,
            decision=decision,
            explanation=explanation,
        )
