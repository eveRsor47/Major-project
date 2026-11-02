import json
import re
import joblib
import numpy as np
import pandas as pd
import pytest

from src import config
from src.features import (
    create_problem_features,
    split_chronological,
    build_sequences,
    process_and_save_all_problems
)

@pytest.fixture(scope="module")
def clean_data():
    return pd.read_parquet(config.CLEAN_DATA_PARQUET)

def test_feature_shapes_and_completeness(clean_data):
    for pid in ["S1", "S24", "D1", "D24"]:
        X, y, features = create_problem_features(clean_data, pid)
        splits = split_chronological(X, y)
        
        assert len(splits["X_train"]) == 33480
        assert len(splits["X_val"]) == 8760
        assert len(splits["X_test"]) == 1416
        
        assert splits["X_train"].isnull().sum().sum() == 0
        assert splits["X_val"].isnull().sum().sum() == 0
        assert splits["X_test"].isnull().sum().sum() == 0
        assert splits["y_train"].isnull().sum() == 0
        assert splits["y_val"].isnull().sum() == 0
        assert splits["y_test"].isnull().sum() == 0

def test_anti_leakage_future_perturbation(clean_data):
    pivot_ts = pd.Timestamp("2023-06-15 12:00:00")
    
    corrupted_data = clean_data.copy()
    if not isinstance(corrupted_data.index, pd.DatetimeIndex):
        corrupted_data["timestamp_ist"] = pd.to_datetime(corrupted_data["timestamp_ist"])
        future_mask = corrupted_data["timestamp_ist"] > pivot_ts
    else:
        future_mask = corrupted_data.index > pivot_ts
        
    corrupted_data.loc[future_mask, "solar_power_mw"] = 999999.0
    corrupted_data.loc[future_mask, "demand_mw"] = 888888.0
    corrupted_data.loc[future_mask, "ghi_wm2"] = 777777.0
    corrupted_data.loc[future_mask, "temperature_2m_c"] = 666666.0
    
    for pid in ["S1", "S24", "D1", "D24"]:
        X_orig, _, _ = create_problem_features(clean_data, pid)
        X_corr, _, _ = create_problem_features(corrupted_data, pid)
        
        row_orig = X_orig.loc[pivot_ts].values
        row_corr = X_corr.loc[pivot_ts].values
        
        max_diff = np.max(np.abs(row_orig - row_corr))
        assert max_diff < 1e-7, f"Future leakage detected in problem {pid}! Max diff: {max_diff}"

def test_day_ahead_horizon_constraint(clean_data):
    for pid in ["S24", "D24"]:
        X, _, features = create_problem_features(clean_data, pid)
        for col in features:
            match = re.search(r"lag(\d+)", col)
            if match:
                lag_num = int(match.group(1))
                assert lag_num >= 24, f"Forbidden short lag {lag_num} found in {pid}: {col}"
            assert "roll_mean_3h" not in col, f"3h rolling mean without 24h shift in {pid}: {col}"

def test_strict_chronological_split_boundaries(clean_data):
    for pid in ["S1", "S24", "D1", "D24"]:
        X, y, _ = create_problem_features(clean_data, pid)
        splits = split_chronological(X, y)
        
        train_end = splits["X_train"].index.max()
        val_start = splits["X_val"].index.min()
        val_end = splits["X_val"].index.max()
        test_start = splits["X_test"].index.min()
        test_end = splits["X_test"].index.max()
        
        assert train_end == pd.Timestamp(config.TRAIN_END_DATE)
        assert val_start == pd.Timestamp(config.VAL_START_DATE)
        assert val_end == pd.Timestamp(config.VAL_END_DATE)
        assert test_start == pd.Timestamp(config.TEST_START_DATE)
        assert test_end == pd.Timestamp(config.TEST_END_DATE)
        
        assert train_end < val_start
        assert val_end < test_start

def test_scaler_fitted_strictly_on_train(clean_data):
    for pid in ["S1", "S24", "D1", "D24"]:
        scaler_file = config.RESULTS_MODELS_DIR / f"scaler_{pid}.joblib"
        assert scaler_file.exists(), f"Scaler file {scaler_file} does not exist"
        scaler = joblib.load(scaler_file)
        
        X_train = pd.read_parquet(config.PROCESSED_DATA_DIR / f"X_train_{pid}.parquet")
        X_val = pd.read_parquet(config.PROCESSED_DATA_DIR / f"X_val_{pid}.parquet")
        
        train_mean = X_train.mean().values
        assert np.allclose(scaler.mean_, train_mean, atol=1e-5), f"Scaler mean does not match X_train for {pid}"
        assert not np.allclose(scaler.mean_, X_val.mean().values, atol=1e-2), f"Scaler appears contaminated by validation set for {pid}"

def test_sequence_builder_shapes_and_alignment(clean_data):
    X, y, _ = create_problem_features(clean_data, "S1")
    splits = split_chronological(X, y)
    
    window = 24
    X_seq, y_seq = build_sequences(splits["X_train"].values, splits["y_train"].values, window_size=window)
    
    expected_samples = len(splits["X_train"]) - window + 1
    assert X_seq.shape == (expected_samples, window, splits["X_train"].shape[1])
    assert y_seq.shape == (expected_samples,)
    assert np.isclose(y_seq[0], splits["y_train"].iloc[window - 1])
    assert np.isclose(y_seq[-1], splits["y_train"].iloc[-1])
