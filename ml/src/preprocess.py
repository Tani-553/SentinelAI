"""Create reproducible train/test data and preprocessing artifacts for SentinelAI."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler


RANDOM_SEED = 42
TEST_SIZE = 0.20
ML_DIR = Path(__file__).resolve().parents[1]
RAW_DATA_PATH = ML_DIR / "data" / "raw" / "creditcard.csv"
PROCESSED_DIR = ML_DIR / "data" / "processed"
MODELS_DIR = ML_DIR / "models"


def load_and_validate_data(file_path: Path) -> pd.DataFrame:
    """Load the source CSV and perform checks needed by this binary classifier."""
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset was not found: {file_path}")

    data = pd.read_csv(file_path)
    if data.empty:
        raise ValueError("The dataset is empty.")
    if "Class" not in data.columns:
        raise ValueError("Expected a 'Class' target column in the dataset.")
    if data["Class"].isna().any():
        # A row without a label cannot be used for supervised training.
        data = data.dropna(subset=["Class"]).copy()
    if data["Class"].nunique() != 2:
        raise ValueError("The 'Class' target must contain exactly two classes.")

    feature_columns = [column for column in data.columns if column != "Class"]
    non_numeric = data[feature_columns].select_dtypes(exclude=np.number).columns.tolist()
    if non_numeric:
        raise ValueError(f"All features must be numeric. Non-numeric columns: {non_numeric}")
    if np.isinf(data[feature_columns].to_numpy()).any():
        raise ValueError("Feature values contain infinity, which cannot be modeled safely.")

    return data


def main() -> None:
    """Split data before fitting preprocessing so the held-out test set stays unseen."""
    data = load_and_validate_data(RAW_DATA_PATH)
    feature_names = [column for column in data.columns if column != "Class"]
    features = data[feature_names]
    target = data["Class"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=TEST_SIZE,
        stratify=target,
        random_state=RANDOM_SEED,
    )

    # This pipeline is fit on train data only: test-set values never influence it.
    preprocessor = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", RobustScaler()),
        ]
    )
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        PROCESSED_DIR / "train_data.npz",
        X=X_train_processed,
        y=y_train.to_numpy(),
    )
    np.savez_compressed(
        PROCESSED_DIR / "test_data.npz",
        X=X_test_processed,
        y=y_test.to_numpy(),
    )
    joblib.dump(preprocessor, MODELS_DIR / "preprocessor.joblib")

    summary = {
        "source_file": str(RAW_DATA_PATH.relative_to(ML_DIR)),
        "target_column": "Class",
        "feature_names": feature_names,
        "random_seed": RANDOM_SEED,
        "test_size": TEST_SIZE,
        "total_rows": int(len(data)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "class_distribution": {
            str(label): int(count)
            for label, count in target.value_counts().sort_index().items()
        },
        "missing_feature_values": int(features.isna().sum().sum()),
    }
    with (PROCESSED_DIR / "data_summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, indent=2)

    print(f"Preprocessing complete. Train shape: {X_train_processed.shape}")
    print(f"Test shape: {X_test_processed.shape}")
    print(f"Saved inference preprocessor to: {MODELS_DIR / 'preprocessor.joblib'}")


if __name__ == "__main__":
    main()
