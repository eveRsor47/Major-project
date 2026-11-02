from pathlib import Path
from typing import Tuple
import numpy as np
import pandas as pd

from src import config


def load_raw_data(filepath: Path = config.RAW_DATA_FILE) -> pd.DataFrame:
    df = pd.read_csv(filepath)
    df[config.TIMESTAMP_COL] = pd.to_datetime(
        df[config.TIMESTAMP_COL], format=config.TIMESTAMP_RAW_FORMAT
    )
    df = df.sort_values(config.TIMESTAMP_COL).drop_duplicates(subset=[config.TIMESTAMP_COL])
    return df


def reindex_hourly(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    dt_min = df[config.TIMESTAMP_COL].min()
    dt_max = df[config.TIMESTAMP_COL].max()
    full_range = pd.date_range(start=dt_min, end=dt_max, freq="h", name=config.TIMESTAMP_COL)
    
    initial_len = len(df)
    df_reindexed = df.set_index(config.TIMESTAMP_COL).reindex(full_range).reset_index()
    hours_added = len(df_reindexed) - initial_len
    return df_reindexed, hours_added


def apply_physical_limits(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    if "relative_humidity_pct" in df.columns:
        df["relative_humidity_pct"] = df["relative_humidity_pct"].clip(lower=0.0, upper=100.0)
        
    if config.TARGET_SOLAR in df.columns:
        df[config.TARGET_SOLAR] = df[config.TARGET_SOLAR].clip(lower=0.0, upper=config.PLANT_CAPACITY_MW)
        night_mask = (df["solar_elevation_deg"] <= 0) | (df["is_daylight"] == 0)
        df.loc[night_mask, config.TARGET_SOLAR] = 0.0

    if "ghi_wm2" in df.columns and "clearsky_ghi_wm2" in df.columns:
        night_mask = (df["solar_elevation_deg"] <= 0) | (df["is_daylight"] == 0)
        df.loc[night_mask, "ghi_wm2"] = 0.0
        day_mask = ~night_mask & df["clearsky_ghi_wm2"].notna()
        df.loc[day_mask, "ghi_wm2"] = np.minimum(
            df.loc[day_mask, "ghi_wm2"],
            df.loc[day_mask, "clearsky_ghi_wm2"] * 1.25 + 50.0
        )
    return df


def flag_demand_outliers(df: pd.DataFrame, window: int = 168, threshold: float = 3.5) -> pd.DataFrame:
    df = df.copy()
    if config.TARGET_DEMAND in df.columns:
        rolling_median = df[config.TARGET_DEMAND].rolling(window=window, min_periods=24, center=True).median()
        rolling_mad = (
            (df[config.TARGET_DEMAND] - rolling_median)
            .abs()
            .rolling(window=window, min_periods=24, center=True)
            .median()
        )
        robust_z = (df[config.TARGET_DEMAND] - rolling_median).abs() / (1.4826 * rolling_mad + 1e-6)
        
        if "is_outlier" in df.columns:
            df["is_demand_outlier"] = ((robust_z > threshold) | (df["is_outlier"] == 1)).astype(int)
        else:
            df["is_demand_outlier"] = (robust_z > threshold).astype(int)
    return df


def fill_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    initial_nulls = df[numeric_cols].isnull().any(axis=1)
    df["is_filled"] = initial_nulls.astype(int)
    
    # 1. Short gaps (<= 3 hours): time-based linear interpolation
    df[numeric_cols] = df[numeric_cols].interpolate(method="linear", limit=3, limit_direction="both")
    
    # 2. Longer gaps: seasonal lag fallback (same hour previous week, 168h)
    for col in numeric_cols:
        if df[col].isnull().any():
            seasonal_fill = df[col].shift(168).bfill().ffill()
            df[col] = df[col].fillna(seasonal_fill)
            
    # Final safety fill for edge boundaries if any
    df[numeric_cols] = df[numeric_cols].bfill().ffill()
    return df


def drop_unneeded_and_leaky_columns(df: pd.DataFrame) -> pd.DataFrame:
    cols_to_remove = set(config.COLUMNS_TO_DROP)
    
    # Drop leaky target-derived channels, while keeping TARGET_NET_LOAD
    leaky_to_remove = set(config.LEAKY_COLUMNS) - {config.TARGET_NET_LOAD}
    cols_to_remove = cols_to_remove.union(leaky_to_remove)
    
    cols_existing = [c for c in cols_to_remove if c in df.columns]
    df = df.drop(columns=cols_existing)
    
    # Ensure net_load_mw is consistently defined
    if config.TARGET_DEMAND in df.columns and config.TARGET_SOLAR in df.columns:
        df[config.TARGET_NET_LOAD] = df[config.TARGET_DEMAND] - df[config.TARGET_SOLAR]
        
    return df


def run_preprocessing_pipeline() -> Tuple[pd.DataFrame, pd.DataFrame]:
    df_raw = load_raw_data(config.RAW_DATA_FILE)
    
    df_reindexed, _ = reindex_hourly(df_raw)
    df_physical = apply_physical_limits(df_reindexed)
    df_flagged = flag_demand_outliers(df_physical)
    df_filled = fill_missing_values(df_flagged)
    df_clean = drop_unneeded_and_leaky_columns(df_filled)
    
    # Save clean interim files
    config.INTERIM_DATA_DIR.mkdir(parents=True, exist_ok=True)
    df_clean.to_csv(config.CLEAN_DATA_CSV, index=False)
    df_clean.to_parquet(config.CLEAN_DATA_PARQUET, index=False)
    
    return df_raw, df_clean


if __name__ == "__main__":
    raw, clean = run_preprocessing_pipeline()
    print(f"Preprocessed dataset successfully saved:")
    print(f"  CSV:     {config.CLEAN_DATA_CSV} (Shape: {clean.shape})")
    print(f"  Parquet: {config.CLEAN_DATA_PARQUET}")
