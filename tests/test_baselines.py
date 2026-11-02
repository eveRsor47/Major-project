import numpy as np
import pandas as pd
import pytest

from src import config
from src.metrics import compute_all_metrics, clip_predictions
from src.evaluate import generate_baseline_predictions, run_all_baselines

def test_metrics_formulas():
    y_true = np.array([100.0, 200.0, 300.0, 400.0])
    y_pred = np.array([110.0, 190.0, 310.0, 390.0])
    
    # Solar test (nMAE by 2050 capacity)
    m_solar = compute_all_metrics(y_true, y_pred, problem_id="S1", baseline_rmse=20.0)
    assert np.isclose(m_solar["mae"], 10.0)
    assert np.isclose(m_solar["rmse"], 10.0)
    assert np.isclose(m_solar["nmae_pct"], 10.0 / 2050.0 * 100.0)
    assert np.isnan(m_solar["mape_pct"]) # Solar MAPE must be NaN (night division explodes)
    assert np.isclose(m_solar["skill_vs_persistence"], 50.0) # (1 - 10/20) * 100
    
    # Demand test (nMAE by mean demand, MAPE calculated)
    m_demand = compute_all_metrics(y_true, y_pred, problem_id="D1", baseline_rmse=20.0)
    assert np.isclose(m_demand["nmae_pct"], 10.0 / 250.0 * 100.0)
    assert not np.isnan(m_demand["mape_pct"])
    assert np.isclose(m_demand["skill_vs_persistence"], 50.0)

def test_clipping_sanity():
    preds = np.array([-50.0, 100.0, 2500.0, 500.0])
    elev = np.array([15.0, 20.0, 30.0, -5.0])
    clipped = clip_predictions(preds, is_solar=True, elevation=elev, max_capacity=2050.0)
    
    assert clipped[0] == 0.0 # non-negative
    assert clipped[1] == 100.0
    assert clipped[2] == 2050.0 # capacity cap
    assert clipped[3] == 0.0 # night solar

def test_baseline_generation_and_horizon_rules():
    for pid in ["S1", "S24", "D1", "D24"]:
        X_tr = pd.read_parquet(config.PROCESSED_DATA_DIR / f"X_train_{pid}.parquet")
        y_tr = pd.read_parquet(config.PROCESSED_DATA_DIR / f"y_train_{pid}.parquet").iloc[:, 0]
        X_v = pd.read_parquet(config.PROCESSED_DATA_DIR / f"X_val_{pid}.parquet")
        y_v = pd.read_parquet(config.PROCESSED_DATA_DIR / f"y_val_{pid}.parquet").iloc[:, 0]
        
        preds = generate_baseline_predictions(X_tr, y_tr, X_v, y_v, pid)
        horizon = config.PROBLEMS[pid]["horizon_hours"]
        is_solar = pid in ["S1", "S24"]
        
        # Verify length
        for bname, p in preds.items():
            assert len(p) == len(y_v), f"Length mismatch for {pid} {bname}"
            assert (p >= 0.0).all(), f"Negative values in {pid} {bname}"
            if is_solar:
                assert (p <= config.PLANT_CAPACITY_MW).all()
                
        # Horizon rules
        if horizon == 24:
            assert "persistence_t1" not in preds, f"Persistence t-1 cannot be in 24h problem {pid}"
        else:
            assert "persistence_t1" in preds, f"Persistence t-1 must be in 1h problem {pid}"
            
        if is_solar:
            assert "clearsky" in preds
            assert "smart_persistence" in preds
            assert "mean_t24_t168" not in preds # Demand only
        else:
            assert "mean_t24_t168" in preds
            assert "clearsky" not in preds

def test_baselines_checkpoint_artifacts():
    csv_file = config.RESULTS_TABLES_DIR / "baselines.csv"
    md_file = config.RESULTS_TABLES_DIR / "baselines.md"
    pred_file = config.RESULTS_PREDICTIONS_DIR / "baseline_val_predictions.parquet"
    
    assert csv_file.exists(), "results/tables/baselines.csv missing"
    assert md_file.exists(), "results/tables/baselines.md missing"
    assert pred_file.exists(), "results/predictions/baseline_val_predictions.parquet missing"
    
    df = pd.read_csv(csv_file)
    assert len(df) == 16, f"Expected 16 baseline evaluations, got {len(df)}"
    assert set(df["problem"].unique()) == {"S1", "S24", "D1", "D24"}
