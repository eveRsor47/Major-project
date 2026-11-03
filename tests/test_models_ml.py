"""Automated Tests for Milestone M6b Classic Machine Learning Models.

Verifies tree-based and distance-based ML model factories, training, predictions,
metrics calculation, and artifact persistence.
"""

import pytest
import numpy as np
import pandas as pd
from pathlib import Path

from src import config
from src.models_ml import (
    load_problem_data_ml,
    get_ml_model,
    train_and_eval_ml_model,
)

def test_load_problem_data_ml():
    """Verify data loader loads unscaled datasets for tree models with zero leakage."""
    data = load_problem_data_ml("S1", use_scaled=False)
    assert data["X_train"].shape[0] == 33480
    assert data["X_val"].shape[0] == 8760
    assert "poa_irradiance_wm2" in data["X_train"].columns
    assert not data["X_train"].isna().any().any()

def test_ml_model_factory():
    """Verify all 10 classic ML estimators instantiate correctly."""
    models = [
        "random_forest", "xgboost", "lightgbm", "catboost", "mlp",
        "extra_trees", "hist_gradient_boosting", "gradient_boosting", "svr", "knn"
    ]
    for m in models:
        estimator = get_ml_model(m)
        assert estimator is not None

def test_lightgbm_training_and_evaluation():
    """Test full execution of LightGBM on S1 problem."""
    res = train_and_eval_ml_model("lightgbm", "S1", model_kwargs={"n_estimators": 50, "max_depth": 5})
    m = res["metrics"]
    assert "rmse" in m and m["rmse"] > 0
    assert "r2" in m and m["r2"] > 0.8
    assert "skill_vs_persistence" in m and m["skill_vs_persistence"] > 50.0
    assert (config.RESULTS_MODELS_DIR / "lightgbm_S1.joblib").exists()

def test_xgboost_demand_execution():
    """Test full execution of XGBoost on D1 problem."""
    res = train_and_eval_ml_model("xgboost", "D1", model_kwargs={"n_estimators": 50, "max_depth": 5})
    m = res["metrics"]
    assert "rmse" in m and m["rmse"] > 0
    assert "mape_pct" in m and m["mape_pct"] < 5.0
    assert (config.RESULTS_MODELS_DIR / "xgboost_D1.joblib").exists()

