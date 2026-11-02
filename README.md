# Renewable Energy-Aware Load Prediction Model for Smart Grids
**Focus Case Study: Pavagada Solar Park (2,050 MW), Tumkur District, Karnataka**

## 1. Project Overview
This project develops an end-to-end time-series forecasting framework designed for modern power grid dispatch operations. It addresses three interconnected forecasting challenges:
1. **Solar Power Generation Forecasting ($P_{\text{solar}}$)**: Anticipating generation across Pavagada Solar Park.
2. **System Demand Forecasting ($P_{\text{demand}}$)**: Modeling load across Karnataka driven by diurnal habits and temperature.
3. **Net Load Prediction ($P_{\text{net}} = P_{\text{demand}} - P_{\text{solar}}$)**: Quantifying residual power required from conventional dispatchable power plants to prepare for evening ramps (the "duck curve").

> [!NOTE]
> **Data Disclosure**: The underlying dataset contains hourly simulated data ($N = 43,824$ records from 2021-03-01 to 2026-02-28 IST). Solar numbers are generated from weather physics; models achieve high accuracy on physics-derived data, demonstrating pipeline correctness.

---

## 2. Project Architecture & Directory Layout
```
pavagada-forecast/
├── data/
│   ├── raw/                 # Original untouched dataset (final_dataset.csv)
│   ├── interim/             # Cleaned hourly dataset (clean_hourly.csv, .parquet)
│   └── processed/           # Scaled, lagged, train/val/test splits & sequences
├── notebooks/               # Thin, explanatory Jupyter notebooks (00 to 09)
├── src/
│   ├── __init__.py
│   ├── config.py            # Central parameters, paths, split dates, random seed
│   ├── preprocess.py        # Cleaning, physical bounds, reindexing, outage flags
│   ├── features.py          # Lags, rolling statistics, solar geometry, cyclical time
│   ├── metrics.py           # RMSE, MAE, nMAE (by capacity), sMAPE, R2, skill score
│   ├── models_ml.py         # Tabular ML pipelines (Ridge, RF, XGB, LGBM, CatBoost)
│   ├── models_dl.py         # PyTorch sequence models (LSTM, GRU, CNN-LSTM)
│   └── evaluate.py          # Unified evaluation harness
├── tests/                   # Pytest test suite (leakage tests, preprocessing, splits)
├── results/
│   ├── tables/              # Evaluation tables, audit logs, and summaries
│   ├── figures/             # Diagnostic plots, error distributions, duck curve
│   ├── models/              # Saved model checkpoints and scalers (joblib / pt)
│   └── predictions/         # Out-of-fold and test predictions
├── requirements.txt         # Pinned project dependencies
└── README.md
```

---

## 3. Milestones Roadmap (M0 to M11)
- **M0: Setup & Environment**: Repository structure, virtual environment, configuration, and import verification. *(Current)*
- **M1: Data Audit**: Comprehensive inspection of raw records, schemas, missing values, and physical checks.
- **M2: Preprocessing**: Timezone alignment, gap filling, physical capping, and flag preservation.
- **M3: Exploratory Data Analysis**: Seasonal profiles, weather-demand interactions, and duck curve preview.
- **M4: Features & Splits**: Strict chronological splitting (Train $\le$ 2024, Val = 2025, Test $\ge$ 2026), leak-free lags ($\ge$ horizon), rolling statistics, and sequence windowing.
- **M5: Baselines**: Persistence ($t-24$), seasonal naive ($t-168$), and clear-sky scaling baselines.
- **M6: Machine Learning Models**: Ridge, Random Forest, XGBoost, LightGBM, CatBoost, and MLP across 4 problems ($S_1, S_{24}, D_1, D_{24}$).
- **M7: Deep Learning Models**: LSTM, GRU, Bi-LSTM, 1D-CNN, and CNN-LSTM architectures.
- **M8: Ensembles & Hyperparameter Tuning**: Optuna hyperparameter optimization, stacking, weighted ensembles, and walk-forward CV.
- **M9: Net Load Integration**: Approach A (separate subtraction) vs Approach B (direct prediction) vs Demand-only baseline.
- **M10: Final Test Evaluation**: Single-pass evaluation on unseen 2026 test set.
- **M11: Final Report, Viva Prep & Interactive Dashboard**: Project report, viva prep, and dashboard.

---

## 4. Setup & Quickstart

### Environment Setup
```powershell
# Create virtual environment and install dependencies
uv venv .venv --python 3.12
uv pip install -r requirements.txt --python .venv\Scripts\python.exe

# Run test suite
.venv\Scripts\pytest -v
```
