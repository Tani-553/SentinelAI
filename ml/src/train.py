"""Train and select fraud-detection models using validation data only."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_sample_weight


RANDOM_SEED = 42
VALIDATION_SIZE = 0.20
ML_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ML_DIR / "data" / "processed"
MODELS_DIR = ML_DIR / "models"


def load_training_data() -> tuple[np.ndarray, np.ndarray]:
    """Read the training split created by preprocess.py."""
    data_path = PROCESSED_DIR / "train_data.npz"
    if not data_path.exists():
        raise FileNotFoundError("Run 'python ml/src/preprocess.py' before training.")
    with np.load(data_path) as data:
        return data["X"], data["y"]


def calculate_metrics(y_true: np.ndarray, probabilities: np.ndarray) -> dict[str, float]:
    """Calculate selection metrics at the standard 0.50 decision threshold."""
    predictions = (probabilities >= 0.50).astype(int)
    return {
        # Average precision is the commonly reported summary measure for PR-AUC.
        "pr_auc": float(average_precision_score(y_true, probabilities)),
        "precision": float(precision_score(y_true, predictions, zero_division=0)),
        "recall": float(recall_score(y_true, predictions, zero_division=0)),
        "f1_score": float(f1_score(y_true, predictions, zero_division=0)),
    }


def build_models() -> dict[str, object]:
    """Return a simple baseline and a stronger nonlinear tree-based candidate."""
    return {
        "logistic_regression": LogisticRegression(
            class_weight="balanced",
            max_iter=2_000,
            random_state=RANDOM_SEED,
        ),
        "hist_gradient_boosting": HistGradientBoostingClassifier(
            learning_rate=0.08,
            max_iter=200,
            max_leaf_nodes=31,
            l2_regularization=1.0,
            early_stopping=True,
            random_state=RANDOM_SEED,
        ),
    }


def main() -> None:
    """Compare models on a stratified validation split, then retrain the winner."""
    X_train, y_train = load_training_data()
    X_fit, X_validation, y_fit, y_validation = train_test_split(
        X_train,
        y_train,
        test_size=VALIDATION_SIZE,
        stratify=y_train,
        random_state=RANDOM_SEED,
    )

    validation_results: dict[str, dict[str, float]] = {}
    for name, model in build_models().items():
        if name == "hist_gradient_boosting":
            # This estimator accepts sample weights rather than class_weight.
            weights = compute_sample_weight(class_weight="balanced", y=y_fit)
            model.fit(X_fit, y_fit, sample_weight=weights)
        else:
            model.fit(X_fit, y_fit)

        probabilities = model.predict_proba(X_validation)[:, 1]
        validation_results[name] = calculate_metrics(y_validation, probabilities)
        print(f"{name}: {validation_results[name]}")

    # PR-AUC is the primary criterion, with F1 breaking a close comparison.
    best_name = max(
        validation_results,
        key=lambda name: (
            validation_results[name]["pr_auc"],
            validation_results[name]["f1_score"],
        ),
    )
    best_model = build_models()[best_name]
    if best_name == "hist_gradient_boosting":
        weights = compute_sample_weight(class_weight="balanced", y=y_train)
        best_model.fit(X_train, y_train, sample_weight=weights)
    else:
        best_model.fit(X_train, y_train)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_model, MODELS_DIR / "best_model.joblib")
    comparison = {
        "selection_split": "stratified validation split from training data",
        "random_seed": RANDOM_SEED,
        "selection_priority": ["pr_auc", "f1_score"],
        "selected_model": best_name,
        "validation_metrics": validation_results,
    }
    with (MODELS_DIR / "model_comparison.json").open("w", encoding="utf-8") as file:
        json.dump(comparison, file, indent=2)

    print(f"Selected model: {best_name}")
    print(f"Saved model to: {MODELS_DIR / 'best_model.joblib'}")


if __name__ == "__main__":
    main()
