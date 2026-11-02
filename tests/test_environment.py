"""Environment and configuration verification tests for Milestone 0."""

import importlib
import pytest
from pathlib import Path


@pytest.mark.parametrize(
    "pkg",
    [
        "pandas",
        "numpy",
        "scipy",
        "sklearn",
        "xgboost",
        "lightgbm",
        "catboost",
        "statsmodels",
        "torch",
        "optuna",
        "matplotlib",
        "seaborn",
        "pvlib",
        "openpyxl",
        "pytest",
        "joblib",
        "pyarrow",
    ],
)
def test_required_libraries_import(pkg: str):
    """Verify that all required core and ML libraries can be imported cleanly."""
    mod = importlib.import_module(pkg)
    assert mod is not None


def test_config_integrity():
    """Verify that src/config.py contains all required parameters and correct paths."""
    from src import config

    assert config.PLANT_CAPACITY_MW == 2050.0
    assert config.RANDOM_SEED == 42
    assert config.TARGET_SOLAR == "solar_power_mw"
    assert config.TARGET_DEMAND == "demand_mw"
    assert config.TARGET_NET_LOAD == "net_load_mw"
    assert config.TRAIN_END_DATE == "2024-12-31 23:00:00"
    assert config.VAL_START_DATE == "2025-01-01 00:00:00"
    assert config.TEST_START_DATE == "2026-01-01 00:00:00"
    assert set(config.PROBLEMS.keys()) == {"S1", "S24", "D1", "D24"}


def test_raw_dataset_exists():
    """Verify that final_dataset.csv is present in data/raw."""
    from src import config

    assert config.RAW_DATA_FILE.exists(), f"Raw file missing at {config.RAW_DATA_FILE}"
    assert config.RAW_DATA_FILE.stat().st_size > 0
