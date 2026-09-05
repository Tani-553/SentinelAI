"""Load the existing SentinelAI artifacts and produce risk decisions."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from backend.app.schemas import PredictionResponse, RiskFactor, RiskMode, TransactionFeatures


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

    def _get_risk_factors(
        self, transaction_frame: pd.DataFrame, base_probability: float
    ) -> list[RiskFactor]:
        """Estimate local sensitivity by replacing one input at a time with its train median."""
        medians = self.preprocessor.named_steps["imputer"].statistics_
        baseline_frames: list[pd.DataFrame] = []
        for index, feature in enumerate(self.feature_names):
            baseline_frame = transaction_frame.copy()
            baseline_frame.iloc[0, index] = medians[index]
            baseline_frames.append(baseline_frame)
        baseline_values = self.model.predict_proba(
            self.preprocessor.transform(pd.concat(baseline_frames, ignore_index=True))
        )[:, 1]
        factors: list[RiskFactor] = []
        for index, feature in enumerate(self.feature_names):
            impact = base_probability - float(baseline_values[index])
            factors.append(
                RiskFactor(
                    feature=feature,
                    observed_value=float(transaction_frame.iloc[0, index]),
                    baseline_value=float(medians[index]),
                    impact=round(impact, 6),
                    direction=(
                        "increases risk"
                        if impact > 0.000001
                        else "reduces risk"
                        if impact < -0.000001
                        else "no material change"
                    ),
                )
            )
        return sorted(factors, key=lambda factor: abs(factor.impact), reverse=True)[:3]

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
            risk_factors=self._get_risk_factors(transaction_frame, fraud_probability),
        )
