import pandas as pd
import numpy as np
from src import config
from src.preprocess import run_preprocessing_pipeline


def test_clean_dataset_shape_and_continuity():
    assert config.CLEAN_DATA_PARQUET.exists()
    assert config.CLEAN_DATA_CSV.exists()
    
    df = pd.read_parquet(config.CLEAN_DATA_PARQUET)
    assert len(df) == 43824
    
    # Check no duplicate timestamps
    df["dt"] = pd.to_datetime(df[config.TIMESTAMP_COL])
    assert df["dt"].duplicated().sum() == 0
    
    # Check continuous hourly frequency
    diffs = df["dt"].diff().dropna()
    assert (diffs == pd.Timedelta(hours=1)).all()


def test_clean_dataset_physical_bounds():
    df = pd.read_parquet(config.CLEAN_DATA_PARQUET)
    
    # Humidity within [0, 100]
    assert (df["relative_humidity_pct"] >= 0).all()
    assert (df["relative_humidity_pct"] <= 100).all()
    
    # Solar is 0 whenever elevation is below 0 or is_daylight is 0
    night_mask = (df["solar_elevation_deg"] <= 0) | (df["is_daylight"] == 0)
    assert (df.loc[night_mask, config.TARGET_SOLAR] == 0.0).all()
    
    # Solar within capacity limits
    assert (df[config.TARGET_SOLAR] >= 0.0).all()
    assert (df[config.TARGET_SOLAR] <= config.PLANT_CAPACITY_MW).all()
    
    # GHI is non-negative and 0 at night
    assert (df["ghi_wm2"] >= 0.0).all()
    assert (df.loc[night_mask, "ghi_wm2"] == 0.0).all()


def test_clean_dataset_no_missing_values():
    df = pd.read_parquet(config.CLEAN_DATA_PARQUET)
    assert df.isnull().sum().sum() == 0
    assert "is_filled" in df.columns
    assert "is_demand_outlier" in df.columns
    assert "is_curtailed_or_outage" in df.columns


def test_clean_dataset_target_consistency():
    df = pd.read_parquet(config.CLEAN_DATA_PARQUET)
    assert config.TARGET_NET_LOAD in df.columns
    diff = np.abs((df[config.TARGET_DEMAND] - df[config.TARGET_SOLAR]) - df[config.TARGET_NET_LOAD])
    assert (diff < 1e-4).all()
