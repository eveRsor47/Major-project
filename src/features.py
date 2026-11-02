from pathlib import Path
from typing import Dict, List, Tuple, Any
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler

from src import config

def get_base_feature_columns() -> Tuple[List[str], List[str]]:
    calendar_cols = [
        "hour_sin", "hour_cos", "doy_sin", "doy_cos",
        "month_sin", "month_cos", "dow_sin", "dow_cos",
        "is_weekend", "is_holiday"
    ]
    weather_cols = [
        "ghi_wm2", "dni_wm2", "dhi_wm2", "poa_irradiance_wm2",
        "clearsky_ghi_wm2", "clearsky_index",
        "temperature_2m_c", "module_temp_c", "relative_humidity_pct",
        "wind_speed_10m_ms", "wind_direction_deg",
        "cloud_cover_total_pct", "cloud_cover_low_pct", "cloud_cover_mid_pct", "cloud_cover_high_pct",
        "precipitation_mm", "surface_pressure_hpa", "aerosol_optical_depth",
        "solar_zenith_deg", "solar_azimuth_deg", "solar_elevation_deg", "is_daylight"
    ]
    return calendar_cols, weather_cols

def compute_cyclical_features(df: pd.DataFrame) -> pd.DataFrame:
    df_out = df.copy()
    if "month_sin" not in df_out.columns:
        df_out["month_sin"] = np.sin(2 * np.pi * df_out["month"] / 12)
        df_out["month_cos"] = np.cos(2 * np.pi * df_out["month"] / 12)
    if "dow_sin" not in df_out.columns:
        df_out["dow_sin"] = np.sin(2 * np.pi * df_out["day_of_week"] / 7)
        df_out["dow_cos"] = np.cos(2 * np.pi * df_out["day_of_week"] / 7)
    return df_out

def create_problem_features(df: pd.DataFrame, problem_id: str) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    if problem_id not in config.PROBLEMS:
        raise ValueError(f"Unknown problem_id: {problem_id}. Expected one of {list(config.PROBLEMS.keys())}")
    
    prob_cfg = config.PROBLEMS[problem_id]
    target_col = prob_cfg["target"]
    horizon = prob_cfg["horizon_hours"]
    
    df_feat = compute_cyclical_features(df)
    if not isinstance(df_feat.index, pd.DatetimeIndex):
        df_feat["timestamp_ist"] = pd.to_datetime(df_feat["timestamp_ist"])
        df_feat = df_feat.set_index("timestamp_ist").sort_index()

    calendar_cols, weather_cols = get_base_feature_columns()
    feature_cols = calendar_cols + weather_cols
    
    if problem_id == "S1":
        for lag in [1, 2, 3, 24, 48, 168]:
            col_name = f"{target_col}_lag{lag}"
            df_feat[col_name] = df_feat[target_col].shift(lag)
            feature_cols.append(col_name)
        
        df_feat[f"{target_col}_roll_mean_3h"] = df_feat[target_col].shift(1).rolling(3, min_periods=1).mean()
        df_feat[f"{target_col}_roll_std_3h"] = df_feat[target_col].shift(1).rolling(3, min_periods=1).std().fillna(0.0)
        df_feat[f"{target_col}_roll_mean_24h"] = df_feat[target_col].shift(1).rolling(24, min_periods=1).mean()
        df_feat[f"{target_col}_roll_std_24h"] = df_feat[target_col].shift(1).rolling(24, min_periods=1).std().fillna(0.0)
        feature_cols.extend([
            f"{target_col}_roll_mean_3h", f"{target_col}_roll_std_3h",
            f"{target_col}_roll_mean_24h", f"{target_col}_roll_std_24h"
        ])
        
        df_feat["ghi_wm2_lag1"] = df_feat["ghi_wm2"].shift(1)
        df_feat["ghi_wm2_lag24"] = df_feat["ghi_wm2"].shift(24)
        feature_cols.extend(["ghi_wm2_lag1", "ghi_wm2_lag24"])

    elif problem_id == "S24":
        for lag in [24, 48, 168]:
            col_name = f"{target_col}_lag{lag}"
            df_feat[col_name] = df_feat[target_col].shift(lag)
            feature_cols.append(col_name)
        
        df_feat[f"{target_col}_roll_mean_24h"] = df_feat[target_col].shift(24).rolling(24, min_periods=1).mean()
        df_feat[f"{target_col}_roll_std_24h"] = df_feat[target_col].shift(24).rolling(24, min_periods=1).std().fillna(0.0)
        df_feat[f"{target_col}_roll_mean_168h"] = df_feat[target_col].shift(24).rolling(168, min_periods=1).mean()
        df_feat[f"{target_col}_roll_std_168h"] = df_feat[target_col].shift(24).rolling(168, min_periods=1).std().fillna(0.0)
        feature_cols.extend([
            f"{target_col}_roll_mean_24h", f"{target_col}_roll_std_24h",
            f"{target_col}_roll_mean_168h", f"{target_col}_roll_std_168h"
        ])
        
        df_feat["ghi_wm2_lag24"] = df_feat["ghi_wm2"].shift(24)
        df_feat["ghi_wm2_lag48"] = df_feat["ghi_wm2"].shift(48)
        feature_cols.extend(["ghi_wm2_lag24", "ghi_wm2_lag48"])

    elif problem_id == "D1":
        for lag in [1, 2, 3, 24, 48, 168]:
            col_name = f"{target_col}_lag{lag}"
            df_feat[col_name] = df_feat[target_col].shift(lag)
            feature_cols.append(col_name)
        
        df_feat[f"{target_col}_roll_mean_3h"] = df_feat[target_col].shift(1).rolling(3, min_periods=1).mean()
        df_feat[f"{target_col}_roll_std_3h"] = df_feat[target_col].shift(1).rolling(3, min_periods=1).std().fillna(0.0)
        df_feat[f"{target_col}_roll_mean_24h"] = df_feat[target_col].shift(1).rolling(24, min_periods=1).mean()
        df_feat[f"{target_col}_roll_std_24h"] = df_feat[target_col].shift(1).rolling(24, min_periods=1).std().fillna(0.0)
        feature_cols.extend([
            f"{target_col}_roll_mean_3h", f"{target_col}_roll_std_3h",
            f"{target_col}_roll_mean_24h", f"{target_col}_roll_std_24h"
        ])
        
        df_feat["temperature_2m_c_lag1"] = df_feat["temperature_2m_c"].shift(1)
        df_feat["temperature_2m_c_lag24"] = df_feat["temperature_2m_c"].shift(24)
        feature_cols.extend(["temperature_2m_c_lag1", "temperature_2m_c_lag24"])

    elif problem_id == "D24":
        for lag in [24, 48, 168]:
            col_name = f"{target_col}_lag{lag}"
            df_feat[col_name] = df_feat[target_col].shift(lag)
            feature_cols.append(col_name)
        
        df_feat[f"{target_col}_roll_mean_24h"] = df_feat[target_col].shift(24).rolling(24, min_periods=1).mean()
        df_feat[f"{target_col}_roll_std_24h"] = df_feat[target_col].shift(24).rolling(24, min_periods=1).std().fillna(0.0)
        df_feat[f"{target_col}_roll_mean_168h"] = df_feat[target_col].shift(24).rolling(168, min_periods=1).mean()
        df_feat[f"{target_col}_roll_std_168h"] = df_feat[target_col].shift(24).rolling(168, min_periods=1).std().fillna(0.0)
        feature_cols.extend([
            f"{target_col}_roll_mean_24h", f"{target_col}_roll_std_24h",
            f"{target_col}_roll_mean_168h", f"{target_col}_roll_std_168h"
        ])
        
        df_feat["temperature_2m_c_lag24"] = df_feat["temperature_2m_c"].shift(24)
        df_feat["temperature_2m_c_lag48"] = df_feat["temperature_2m_c"].shift(48)
        feature_cols.extend(["temperature_2m_c_lag24", "temperature_2m_c_lag48"])

    max_lag = 168
    df_valid = df_feat.iloc[max_lag:].copy()
    X = df_valid[feature_cols].copy()
    y = df_valid[target_col].copy()
    return X, y, feature_cols

def split_chronological(X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
    X_train = X.loc[:config.TRAIN_END_DATE].copy()
    y_train = y.loc[:config.TRAIN_END_DATE].copy()
    
    X_val = X.loc[config.VAL_START_DATE:config.VAL_END_DATE].copy()
    y_val = y.loc[config.VAL_START_DATE:config.VAL_END_DATE].copy()
    
    X_test = X.loc[config.TEST_START_DATE:config.TEST_END_DATE].copy()
    y_test = y.loc[config.TEST_START_DATE:config.TEST_END_DATE].copy()
    
    assert len(X_train) > 0, "Train split is empty"
    assert len(X_val) > 0, "Validation split is empty"
    assert len(X_test) > 0, "Test split is empty"
    assert X_train.index.max() < X_val.index.min(), "Leakage: Train overlaps with Validation"
    assert X_val.index.max() < X_test.index.min(), "Leakage: Validation overlaps with Test"
    
    return {
        "X_train": X_train, "y_train": y_train,
        "X_val": X_val, "y_val": y_val,
        "X_test": X_test, "y_test": y_test,
    }

def fit_and_apply_scalers(
    X_train: pd.DataFrame,
    X_val: pd.DataFrame,
    X_test: pd.DataFrame,
    problem_id: str,
    scaler_type: str = "standard"
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Any]:
    scaler = StandardScaler() if scaler_type == "standard" else MinMaxScaler()
    scaler.fit(X_train)
    
    scaler_path = config.RESULTS_MODELS_DIR / f"scaler_{problem_id}.joblib"
    joblib.dump(scaler, scaler_path)
    
    X_train_scaled = pd.DataFrame(scaler.transform(X_train), index=X_train.index, columns=X_train.columns)
    X_val_scaled = pd.DataFrame(scaler.transform(X_val), index=X_val.index, columns=X_val.columns)
    X_test_scaled = pd.DataFrame(scaler.transform(X_test), index=X_test.index, columns=X_test.columns)
    
    return X_train_scaled, X_val_scaled, X_test_scaled, scaler

def build_sequences(X: np.ndarray, y: np.ndarray, window_size: int = 24) -> Tuple[np.ndarray, np.ndarray]:
    n_samples = len(X) - window_size + 1
    if n_samples <= 0:
        raise ValueError(f"Array length ({len(X)}) is smaller than sequence window ({window_size})")
    X_seq = np.lib.stride_tricks.sliding_window_view(X, (window_size, X.shape[1])).squeeze(1)
    y_seq = y[window_size - 1:]
    return X_seq, y_seq

def process_and_save_all_problems(
    clean_data_path: Path = config.CLEAN_DATA_PARQUET,
    output_dir: Path = config.PROCESSED_DATA_DIR
) -> Dict[str, Any]:
    df = pd.read_parquet(clean_data_path)
    metadata: Dict[str, Any] = {"problems": {}}
    
    for pid in ["S1", "S24", "D1", "D24"]:
        X, y, feature_cols = create_problem_features(df, pid)
        splits = split_chronological(X, y)
        
        X_train_s, X_val_s, X_test_s, _ = fit_and_apply_scalers(
            splits["X_train"], splits["X_val"], splits["X_test"], pid
        )
        
        splits["X_train"].to_parquet(output_dir / f"X_train_{pid}.parquet")
        splits["y_train"].to_frame().to_parquet(output_dir / f"y_train_{pid}.parquet")
        splits["X_val"].to_parquet(output_dir / f"X_val_{pid}.parquet")
        splits["y_val"].to_frame().to_parquet(output_dir / f"y_val_{pid}.parquet")
        splits["X_test"].to_parquet(output_dir / f"X_test_{pid}.parquet")
        splits["y_test"].to_frame().to_parquet(output_dir / f"y_test_{pid}.parquet")
        
        X_train_s.to_parquet(output_dir / f"X_train_{pid}_scaled.parquet")
        X_val_s.to_parquet(output_dir / f"X_val_{pid}_scaled.parquet")
        X_test_s.to_parquet(output_dir / f"X_test_{pid}_scaled.parquet")
        
        metadata["problems"][pid] = {
            "target": config.PROBLEMS[pid]["target"],
            "horizon_hours": config.PROBLEMS[pid]["horizon_hours"],
            "description": config.PROBLEMS[pid]["description"],
            "num_features": len(feature_cols),
            "features": feature_cols,
            "train_samples": len(splits["X_train"]),
            "train_start": str(splits["X_train"].index.min()),
            "train_end": str(splits["X_train"].index.max()),
            "val_samples": len(splits["X_val"]),
            "val_start": str(splits["X_val"].index.min()),
            "val_end": str(splits["X_val"].index.max()),
            "test_samples": len(splits["X_test"]),
            "test_start": str(splits["X_test"].index.min()),
            "test_end": str(splits["X_test"].index.max()),
        }
    
    with open(output_dir / "feature_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    return metadata
