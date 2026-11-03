"""Project configuration module for Pavagada Solar + Load Forecasting.

Centralizes paths, target definitions, split dates, random seeds,
model tier mappings, and plant specifications according to the updated roadmap.
"""

from pathlib import Path
from typing import Dict, List, Any

# Base Directories
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
INTERIM_DATA_DIR = DATA_DIR / "interim"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

RESULTS_DIR = PROJECT_ROOT / "results"
RESULTS_TABLES_DIR = RESULTS_DIR / "tables"
RESULTS_FIGURES_DIR = RESULTS_DIR / "figures"
FIGURES_EDA_DIR = RESULTS_FIGURES_DIR / "eda"
FIGURES_BASELINES_DIR = RESULTS_FIGURES_DIR / "baselines"
FIGURES_LINEAR_DIR = RESULTS_FIGURES_DIR / "linear_statistical"
FIGURES_CLASSIC_ML_DIR = RESULTS_FIGURES_DIR / "classic_ml"
FIGURES_DEEP_LEARNING_DIR = RESULTS_FIGURES_DIR / "deep_learning"
RESULTS_MODELS_DIR = RESULTS_DIR / "models"
RESULTS_PREDICTIONS_DIR = RESULTS_DIR / "predictions"

RAW_DATA_FILE = RAW_DATA_DIR / "final_dataset.csv"
CLEAN_DATA_CSV = INTERIM_DATA_DIR / "clean_hourly.csv"
CLEAN_DATA_PARQUET = INTERIM_DATA_DIR / "clean_hourly.parquet"

for d in [
    RAW_DATA_DIR,
    INTERIM_DATA_DIR,
    PROCESSED_DATA_DIR,
    RESULTS_TABLES_DIR,
    RESULTS_FIGURES_DIR,
    FIGURES_EDA_DIR,
    FIGURES_BASELINES_DIR,
    FIGURES_LINEAR_DIR,
    FIGURES_CLASSIC_ML_DIR,
    FIGURES_DEEP_LEARNING_DIR,
    RESULTS_MODELS_DIR,
    RESULTS_PREDICTIONS_DIR,
]:
    d.mkdir(parents=True, exist_ok=True)

# Project Constants & Specifications
RANDOM_SEED: int = 42
PLANT_CAPACITY_MW: float = 2050.0
PLANT_LATITUDE: float = 14.281
PLANT_LONGITUDE: float = 77.425
PLANT_ALTITUDE_M: float = 600.0
TIMEZONE: str = "Asia/Kolkata"

TARGET_SOLAR: str = "solar_power_mw"
TARGET_DEMAND: str = "demand_mw"
TARGET_NET_LOAD: str = "net_load_mw"

# Time Splits (Strict Chronological, Never Shuffled)
TRAIN_START_DATE: str = "2021-03-01 00:00:00"
TRAIN_END_DATE: str = "2024-12-31 23:00:00"

VAL_START_DATE: str = "2025-01-01 00:00:00"
VAL_END_DATE: str = "2025-12-31 23:00:00"

TEST_START_DATE: str = "2026-01-01 00:00:00"
TEST_END_DATE: str = "2026-02-28 23:00:00"

# The Four Forecasting Problems
PROBLEMS: Dict[str, Dict[str, Any]] = {
    "S1": {
        "target": TARGET_SOLAR,
        "horizon_hours": 1,
        "description": "Solar power 1-hour ahead",
    },
    "S24": {
        "target": TARGET_SOLAR,
        "horizon_hours": 24,
        "description": "Solar power 24-hours ahead",
    },
    "D1": {
        "target": TARGET_DEMAND,
        "horizon_hours": 1,
        "description": "Demand 1-hour ahead",
    },
    "D24": {
        "target": TARGET_DEMAND,
        "horizon_hours": 24,
        "description": "Demand 24-hours ahead",
    },
}

# 47 Models Multi-Tier Roadmap Taxonomy
MODEL_TIERS: Dict[str, Dict[str, List[str]]] = {
    "Tier 1": {
        "baselines": [
            "persistence_t1",
            "persistence_t24",
            "persistence_t168",
            "clearsky",
            "smart_persistence",
            "mean_t24_t168",
        ],
        "linear_stat": ["linear", "ridge", "lasso"],
        "classic_ml": ["random_forest", "xgboost", "lightgbm", "catboost", "mlp"],
        "deep_learning": ["lstm", "gru", "cnn_lstm"],
        "probabilistic": ["quantile_lightgbm", "quantile_xgboost"],
    },
    "Tier 2": {
        "linear_stat": ["elasticnet", "huber", "sarimax", "prophet"],
        "classic_ml": [
            "extra_trees",
            "hist_gradient_boosting",
            "gradient_boosting",
            "svr",
            "knn",
        ],
        "deep_learning": [
            "stacked_lstm",
            "bi_lstm",
            "bi_gru",
            "cnn_1d",
            "cnn_gru",
            "lstm_attention",
            "tcn",
            "dlinear",
            "nhits",
        ],
    },
    "Tier 3": {
        "linear_stat": ["ransac", "holt_winters"],
        "classic_ml": ["decision_tree", "bagging", "adaboost"],
        "deep_learning": [
            "seq2seq",
            "transformer_encoder",
            "informer",
            "patchtst",
            "tft",
            "nbeats",
        ],
        "probabilistic": ["ngboost", "deepar"],
    },
}

TIMESTAMP_COL: str = "timestamp_ist"
TIMESTAMP_RAW_FORMAT: str = "%d-%m-%y %H:%M"

# Leaky columns: Never use as predictive features
LEAKY_COLUMNS: List[str] = [
    "solar_generation_mwh",
    "capacity_factor",
    "section_1_mw",
    "section_2_mw",
    "section_3_mw",
    "section_4_mw",
    "section_5_mw",
    "section_6_mw",
    "section_7_mw",
    "section_8_mw",
    "net_load_mw",
    "solar_penetration_pct",
    "ramp_mw_per_hr",
    "demand_met_mw",
    "shortage_mw",
]

# Static constants, metadata, or generator internals to drop
COLUMNS_TO_DROP: List[str] = [
    "installed_capacity_mw_ac",
    "installed_capacity_mw_dc",
    "dc_ac_ratio",
    "data_type",
    "data_source_weather",
    "data_source_demand",
    "generation_method",
    "timestamp_utc",
    "soiling_loss_pct",
    "degradation_factor",
]
