"""Project configuration module for Pavagada Solar + Load Forecasting.

Centralizes paths, target definitions, split dates, random seeds,
and plant specifications as defined in the project roadmap.
"""

from pathlib import Path
from typing import Dict, List

# ---------------------------------------------------------------------------
# Base Directories
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
INTERIM_DATA_DIR = DATA_DIR / "interim"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

RESULTS_DIR = PROJECT_ROOT / "results"
RESULTS_TABLES_DIR = RESULTS_DIR / "tables"
RESULTS_FIGURES_DIR = RESULTS_DIR / "figures"
RESULTS_MODELS_DIR = RESULTS_DIR / "models"
RESULTS_PREDICTIONS_DIR = RESULTS_DIR / "predictions"

RAW_DATA_FILE = RAW_DATA_DIR / "final_dataset.csv"
CLEAN_DATA_CSV = INTERIM_DATA_DIR / "clean_hourly.csv"
CLEAN_DATA_PARQUET = INTERIM_DATA_DIR / "clean_hourly.parquet"

# Ensure runtime directories exist
for _dir in [
    RAW_DATA_DIR,
    INTERIM_DATA_DIR,
    PROCESSED_DATA_DIR,
    RESULTS_TABLES_DIR,
    RESULTS_FIGURES_DIR,
    RESULTS_MODELS_DIR,
    RESULTS_PREDICTIONS_DIR,
]:
    _dir.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Project Constants & Specifications
# ---------------------------------------------------------------------------
RANDOM_SEED: int = 42

# Pavagada Solar Park (Karnataka) specifications
PLANT_CAPACITY_MW: float = 2050.0
PLANT_LATITUDE: float = 14.281
PLANT_LONGITUDE: float = 77.425
PLANT_ALTITUDE_M: float = 600.0
TIMEZONE: str = "Asia/Kolkata"

# Primary targets
TARGET_SOLAR: str = "solar_power_mw"
TARGET_DEMAND: str = "demand_mw"
TARGET_NET_LOAD: str = "net_load_mw"

# ---------------------------------------------------------------------------
# Time Splits (Strict Chronological, Never Shuffled)
# ---------------------------------------------------------------------------
# Train: Start (2021-03-01 00:00 IST) through 2024-12-31 23:00 IST
TRAIN_START_DATE: str = "2021-03-01 00:00:00"
TRAIN_END_DATE: str = "2024-12-31 23:00:00"

# Validation: 2025-01-01 00:00 IST through 2025-12-31 23:00 IST
VAL_START_DATE: str = "2025-01-01 00:00:00"
VAL_END_DATE: str = "2025-12-31 23:00:00"

# Test: 2026-01-01 00:00 IST onward (evaluated only in M10)
TEST_START_DATE: str = "2026-01-01 00:00:00"
TEST_END_DATE: str = "2026-02-28 23:00:00"

# ---------------------------------------------------------------------------
# Problem Definitions
# ---------------------------------------------------------------------------
PROBLEMS: Dict[str, Dict[str, object]] = {
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

# ---------------------------------------------------------------------------
# Data Columns Hygiene
# ---------------------------------------------------------------------------
# Timestamp column names (format: DD-MM-YY H:MM in raw file)
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

# Static constants or generator internals to drop
COLUMNS_TO_DROP: List[str] = [
    "installed_capacity_mw_ac",
    "installed_capacity_mw_dc",
    "dc_ac_ratio",
    "data_type",
    "generation_method",
    "timestamp_utc",
    "soiling_loss_pct",
    "degradation_factor",
]
