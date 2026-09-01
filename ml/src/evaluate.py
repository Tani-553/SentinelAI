"""Evaluate the selected fraud model once on the held-out test set."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


ML_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ML_DIR / "data" / "processed"
MODELS_DIR = ML_DIR / "models"
THRESHOLDS = (0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90)


def load_test_data() -> tuple[np.ndarray, np.ndarray]:
    """Read the untouched test split created by preprocess.py."""
    data_path = PROCESSED_DIR / "test_data.npz"
    if not data_path.exists():
        raise FileNotFoundError("Run 'python ml/src/preprocess.py' before evaluation.")
    with np.load(data_path) as data:
        return data["X"], data["y"]


def analyse_thresholds(
    y_true: np.ndarray, probabilities: np.ndarray
) -> list[dict[str, float | int]]:
    """Calculate classification metrics for each agreed decision threshold."""
    results: list[dict[str, float | int]] = []
    for threshold in THRESHOLDS:
        predictions = (probabilities >= threshold).astype(int)
        true_negative, false_positive, false_negative, true_positive = confusion_matrix(
            y_true, predictions, labels=[0, 1]
        ).ravel()
        results.append(
            {
                "threshold": threshold,
                "precision": float(precision_score(y_true, predictions, zero_division=0)),
                "recall": float(recall_score(y_true, predictions, zero_division=0)),
                "f1_score": float(f1_score(y_true, predictions, zero_division=0)),
                "true_positives": int(true_positive),
                "false_positives": int(false_positive),
                "true_negatives": int(true_negative),
                "false_negatives": int(false_negative),
            }
        )
    return results


def select_recommendations(
    threshold_results: list[dict[str, float | int]]
) -> dict[str, dict[str, float | int | str]]:
    """Select transparent operating points from the requested threshold list."""
    best_f1 = max(
        threshold_results,
        key=lambda result: (float(result["f1_score"]), float(result["precision"])),
    )
    fraud_protection = max(
        threshold_results,
        # Favor catching fraud; use precision to break an equal-recall tie.
        key=lambda result: (float(result["recall"]), float(result["precision"])),
    )
    customer_friendly = max(
        threshold_results,
        # Favor fewer unnecessary transaction reviews; use recall to break a tie.
        key=lambda result: (float(result["precision"]), float(result["recall"])),
    )

    return {
        "best_f1": {
            **best_f1,
            "selection_rule": "Highest F1-score among the evaluated thresholds.",
        },
        "fraud_protection": {
            **fraud_protection,
            "selection_rule": "Highest recall; precision breaks an equal-recall tie.",
        },
        "customer_friendly": {
            **customer_friendly,
            "selection_rule": "Highest precision; recall breaks an equal-precision tie.",
        },
    }


def main() -> None:
    """Write real held-out metrics and a confusion matrix to JSON."""
    model_path = MODELS_DIR / "best_model.joblib"
    if not model_path.exists():
        raise FileNotFoundError("Run 'python ml/src/train.py' before evaluation.")

    X_test, y_test = load_test_data()
    model = joblib.load(model_path)
    probabilities = model.predict_proba(X_test)[:, 1]
    predictions = (probabilities >= 0.50).astype(int)
    threshold_results = analyse_thresholds(y_test, probabilities)

    metrics = {
        "decision_threshold": 0.50,
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1_score": float(f1_score(y_test, predictions, zero_division=0)),
        # Average precision is the commonly reported summary measure for PR-AUC.
        "pr_auc": float(average_precision_score(y_test, probabilities)),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
        "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
        "confusion_matrix_labels": [["true_negative", "false_positive"], ["false_negative", "true_positive"]],
        "test_samples": int(len(y_test)),
        "positive_test_samples": int(y_test.sum()),
    }

    output_path = MODELS_DIR / "test_metrics.json"
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)

    threshold_analysis = {
        "test_set": "held-out test split created by preprocess.py",
        "thresholds_evaluated": list(THRESHOLDS),
        "results": threshold_results,
        "recommendations": select_recommendations(threshold_results),
    }
    threshold_output_path = MODELS_DIR / "threshold_analysis.json"
    with threshold_output_path.open("w", encoding="utf-8") as file:
        json.dump(threshold_analysis, file, indent=2)

    print(json.dumps(metrics, indent=2))
    print(f"Saved test metrics to: {output_path}")
    print(f"Saved threshold analysis to: {threshold_output_path}")


if __name__ == "__main__":
    main()
