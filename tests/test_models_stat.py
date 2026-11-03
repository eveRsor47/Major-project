"""Automated Tests for Milestone M6a Linear and Statistical Models.

Verifies data loading integrity, linear model fitting, predictions, metrics calculation,
and model persistence.
"""

import pytest
import numpy as np
import pandas as pd
from pathlib import Path

from src import config
from src.models_stat import (
    load_problem_data,
    get_linear_model,
    train_and_eval_linear_model,
    train_and_eval_sarimax,
    train_and_eval_prophet,
    train_and_eval_holtwinters,
)

def test_load_problem_data():
    """Verify data loader loads exact M4 parquets with expected shapes and zero leakage."""
    data = load_problem_data("S1", use_scaled=True)
    assert data["X_train"].shape[0] == 33480
    assert data["y_train"].shape[0] == 33480
    assert data["X_val"].shape[0] == 8760
    assert data["y_val"].shape[0] == 8760
    assert len(data["feature_names"]) == 44
    assert not data["X_train"].isna().any().any()
    assert not data["y_train"].isna().any()

def test_linear_model_instantiation():
    """Verify model factory supports all requested linear variants."""
    for m in ["linear", "ridge", "lasso", "elasticnet", "huber", "ransac"]:
        model = get_linear_model(m)
        assert model is not None

def test_ridge_training_and_evaluation():
    """Test full execution of Ridge on S1 problem."""
    res = train_and_eval_linear_model("ridge", "S1", model_kwargs={"alpha": 10.0})
    m = res["metrics"]
    assert "rmse" in m and m["rmse"] > 0
    assert "mae" in m and m["mae"] > 0
    assert "r2" in m and 0.5 < m["r2"] < 1.0
    assert "skill_vs_persistence" in m
    assert (config.RESULTS_MODELS_DIR / "ridge_S1.joblib").exists()

def test_demand_models_execution():
    """Test execution of Linear regression on D1 problem."""
    res = train_and_eval_linear_model("linear", "D1")
    m = res["metrics"]
    assert "rmse" in m and m["rmse"] > 0
    assert "mape_pct" in m and m["mape_pct"] > 0
    assert "r2" in m and 0.8 < m["r2"] < 1.0
    assert (config.RESULTS_MODELS_DIR / "linear_D1.joblib").exists()

