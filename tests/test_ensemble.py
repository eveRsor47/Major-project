"""tests/test_ensemble.py — Unit tests for M8 ensemble & probabilistic modules."""
import numpy as np
import pandas as pd
import pytest
from pathlib import Path

from src.ensemble import (
    equal_weight_average,
    nnls_weighted_average,
    stacking_ridge,
    residual_hybrid,
    ensemble_metrics,
    walk_forward_seasonal,
)
from src.models_prob import pinball_loss, empirical_coverage, interval_width


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_data():
    rng  = np.random.default_rng(42)
    N    = 500
    true = rng.uniform(0, 2050, N).astype(np.float32)
    p1   = true + rng.normal(0, 50, N)
    p2   = true + rng.normal(0, 70, N)
    p3   = true + rng.normal(0, 60, N)
    preds = {"m1": p1, "m2": p2, "m3": p3}
    ts    = pd.date_range("2025-01-01", periods=N, freq="h")
    return true, preds, ts


# ── equal_weight_average ─────────────────────────────────────────────────────

def test_equal_weight_shape(mock_data):
    y, preds, _ = mock_data
    out = equal_weight_average(preds)
    assert out.shape == y.shape, "Equal-weight output shape mismatch"


def test_equal_weight_value(mock_data):
    _, preds, _ = mock_data
    out = equal_weight_average(preds)
    expected = np.stack(list(preds.values())).mean(axis=0)
    np.testing.assert_allclose(out, expected, rtol=1e-5)


def test_equal_weight_beats_worst(mock_data):
    y, preds, _ = mock_data
    out       = equal_weight_average(preds)
    rmse_ens  = np.sqrt(np.mean((y - out) ** 2))
    rmse_worst = max(np.sqrt(np.mean((y - p) ** 2)) for p in preds.values())
    assert rmse_ens <= rmse_worst, "Ensemble should not be worse than worst member"


# ── nnls_weighted_average ─────────────────────────────────────────────────────

def test_nnls_weights_sum_to_one(mock_data):
    y, preds, _ = mock_data
    _, weights  = nnls_weighted_average(y, preds, n_restarts=5)
    assert abs(sum(weights.values()) - 1.0) < 1e-6, "NNLS weights must sum to 1"


def test_nnls_weights_non_negative(mock_data):
    y, preds, _ = mock_data
    _, weights  = nnls_weighted_average(y, preds, n_restarts=5)
    assert all(w >= -1e-8 for w in weights.values()), "NNLS weights must be ≥ 0"


def test_nnls_beats_equal_weight(mock_data):
    y, preds, _ = mock_data
    y_eq        = equal_weight_average(preds)
    y_nn, _     = nnls_weighted_average(y, preds, n_restarts=10)
    rmse_eq     = np.sqrt(np.mean((y - y_eq) ** 2))
    rmse_nn     = np.sqrt(np.mean((y - y_nn) ** 2))
    assert rmse_nn <= rmse_eq + 0.1, "NNLS should match or beat equal-weight"


def test_nnls_output_shape(mock_data):
    y, preds, _ = mock_data
    out, _      = nnls_weighted_average(y, preds, n_restarts=3)
    assert out.shape == y.shape


# ── stacking_ridge ───────────────────────────────────────────────────────────

def test_stacking_output_shape(mock_data):
    y, preds, _ = mock_data
    out, meta   = stacking_ridge(y, preds, n_splits=3)
    assert out.shape == y.shape, "Stacking output shape mismatch"


def test_stacking_meta_model_type(mock_data):
    from sklearn.linear_model import Ridge
    y, preds, _ = mock_data
    _, meta     = stacking_ridge(y, preds, n_splits=3)
    assert isinstance(meta, Ridge), "Meta-model should be Ridge"


# ── residual_hybrid ───────────────────────────────────────────────────────────

def test_residual_hybrid_output_shape(mock_data):
    y, preds, _ = mock_data
    base, resid = list(preds.values())[:2]
    out, alpha  = residual_hybrid(y, base, resid)
    assert out.shape == y.shape
    assert 0.0 <= alpha <= 1.0, "Alpha must be in [0,1]"


def test_residual_hybrid_non_negative(mock_data):
    y, preds, _ = mock_data
    base, resid = list(preds.values())[:2]
    out, _      = residual_hybrid(y, base, resid)
    assert np.all(out >= 0), "Residual hybrid outputs must be ≥ 0"


# ── ensemble_metrics ─────────────────────────────────────────────────────────

def test_ensemble_metrics_keys(mock_data):
    y, preds, _ = mock_data
    out = equal_weight_average(preds)
    m   = ensemble_metrics(y, out, "S1", "test")
    for key in ["rmse", "mae", "r2", "skill_vs_persistence"]:
        assert key in m, f"Missing key: {key}"


def test_ensemble_metrics_skill_positive(mock_data):
    y, preds, _ = mock_data
    out = equal_weight_average(preds)
    m   = ensemble_metrics(y, out, "S1", "test")
    assert m["skill_vs_persistence"] > 0, "Skill should be positive for good ensemble"


def test_ensemble_metrics_r2_bounded(mock_data):
    y, preds, _ = mock_data
    out = equal_weight_average(preds)
    m   = ensemble_metrics(y, out, "S1", "test")
    assert -1.0 <= m["r2"] <= 1.0, "R² must be in [-1, 1]"


# ── walk_forward_seasonal ────────────────────────────────────────────────────

def test_seasonal_df_structure(mock_data):
    y, preds, ts = mock_data
    out = equal_weight_average(preds)
    df  = walk_forward_seasonal(y, out, ts, "S1", "equal_weight")
    assert isinstance(df, pd.DataFrame)
    assert "season" in df.columns
    assert "rmse"   in df.columns
    assert "skill"  in df.columns


def test_seasonal_rmse_positive(mock_data):
    y, preds, ts = mock_data
    out = equal_weight_average(preds)
    df  = walk_forward_seasonal(y, out, ts, "S1", "equal_weight")
    assert (df["rmse"] > 0).all(), "All seasonal RMSE should be positive"


# ── Probabilistic metrics ─────────────────────────────────────────────────────

def test_pinball_loss_q50_is_half_mae():
    rng    = np.random.default_rng(0)
    y_true = rng.uniform(0, 500, 1000)
    y_pred = rng.uniform(0, 500, 1000)
    p50    = pinball_loss(y_true, y_pred, 0.5)
    mae    = np.mean(np.abs(y_true - y_pred))
    np.testing.assert_allclose(p50, mae / 2, rtol=1e-5)


def test_pinball_loss_non_negative():
    rng    = np.random.default_rng(1)
    y_true = rng.uniform(0, 500, 500)
    y_pred = rng.uniform(0, 500, 500)
    for q in [0.1, 0.25, 0.5, 0.75, 0.9]:
        assert pinball_loss(y_true, y_pred, q) >= 0


def test_empirical_coverage_perfect():
    y = np.ones(100) * 50.0
    assert empirical_coverage(y, y - 1, y + 1) == 1.0


def test_empirical_coverage_zero():
    y  = np.ones(100) * 50.0
    lo = np.ones(100) * 100.0
    hi = np.ones(100) * 200.0
    assert empirical_coverage(y, lo, hi) == 0.0


def test_interval_width_positive():
    lo = np.zeros(100)
    hi = np.ones(100) * 10.0
    assert interval_width(lo, hi) == pytest.approx(10.0)


# ── No test-set leakage guard ─────────────────────────────────────────────────

def test_no_test_predictions_exist():
    """Ensure no unauthorized test-set prediction files exist in results/predictions/."""
    pred_dir = Path("results/predictions")
    if not pred_dir.exists():
        return
    test_files = list(pred_dir.glob("*test*"))
    # Pre-M10 quarantine: no test files allowed before M10 benchmark exists.
    # Post-M10 unblinding: only official m10_*test* files generated in M10 are permitted.
    m10_done = Path("results/tables/m10_test_benchmark.csv").exists()
    if not m10_done:
        assert len(test_files) == 0, f"Test-set predictions found pre-M10: {test_files}"
    else:
        unauthorized = [f for f in test_files if not f.name.startswith("m10_")]
        assert len(unauthorized) == 0, f"Unauthorized non-M10 test files found: {unauthorized}"


def test_optuna_params_saved():
    """Check that optuna_best_params.json exists after M8 run."""
    p = Path("results/models/optuna_best_params.json")
    if not p.exists():
        pytest.skip("M8 not yet run — skipping params file check")
    with open(p) as f:
        data = __import__("json").load(f)
    assert len(data) > 0, "optuna_best_params.json should not be empty"


def test_m8_ensemble_csv_exists():
    """Check that m8_ensemble_results.csv exists after M8 run."""
    p = Path("results/tables/m8_ensemble_results.csv")
    if not p.exists():
        pytest.skip("M8 not yet run — skipping CSV check")
    df = pd.read_csv(p)
    assert "rmse" in df.columns
    assert len(df) >= 4, "Should have at least 4 rows (one per problem)"
