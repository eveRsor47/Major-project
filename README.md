# Renewable Energy-Aware Load Prediction Model for Smart Grids
**Focus Case Study: Pavagada Solar Park (2,050 MW), Tumkur District, Karnataka**

---

## 1. Project Overview & Multi-Tier Architecture
This project develops an end-to-end, reproducible time-series forecasting framework designed for modern power grid dispatch operations. It addresses three interconnected forecasting challenges:
1. **Solar Power Generation ($P_{\text{solar}}$)**: Anticipating generation across Pavagada Solar Park (Tumkur, Karnataka).
2. **System Demand ($P_{\text{demand}}$)**: Modeling statewide load driven by diurnal habits and temperature.
3. **Net Load ($P_{\text{net}} = P_{\text{demand}} - P_{\text{solar}}$)**: Quantifying the residual power required from conventional dispatchable power plants to prepare for evening ramps (the "duck curve").

> [!NOTE]
> **Data Disclosure**: The underlying dataset contains hourly simulated data ($N = 43,824$ records from 2021-03-01 to 2026-02-28 IST). Solar figures are generated from weather physics; models achieve high accuracy on physics-derived data, demonstrating pipeline correctness.

---

## 2. Updated 47-Model Funnel & Tier Structure

Models are evaluated across 4 problems (**S1, S24, D1, D24**) through a validation funnel:
- **Tier 1 (Mandatory - Must Train First)**:
  - **Baselines (6)**: Persistence ($t-1$ for 1h, $t-24$ for solar/demand, $t-168$ seasonal naive, Clear-sky, Smart persistence, Mean of $t-24$ & $t-168$).
  - **Linear & Statistical (3)**: Linear Regression, Ridge, Lasso.
  - **Classic ML (5)**: Random Forest, XGBoost, LightGBM, CatBoost, MLP.
  - **Deep Learning (3)**: LSTM, GRU, CNN-LSTM.
  - **Probabilistic (2)**: Quantile LightGBM, Quantile XGBoost (P10, P50, P90).
- **Tier 2 (Should - Evaluated after Tier 1 Review)**:
  - **Linear & Statistical**: ElasticNet, Huber, SARIMAX (subset/daily), Prophet.
  - **Classic ML**: Extra Trees, HistGradientBoosting, Gradient Boosting, SVR, KNN.
  - **Deep Learning**: Stacked LSTM, Bi-LSTM, Bi-GRU, 1D-CNN, CNN-GRU, LSTM with attention, TCN, DLinear, N-HiTS.
- **Tier 3 (Stretch / Future Work)**:
  - RANSAC, Holt-Winters (ETS), Decision Tree, Bagging, AdaBoost, Seq2Seq, Transformer encoder, Informer, PatchTST, TFT, N-BEATS, NGBoost, DeepAR.

### Funnel & Ensemble Policy
1. **Screening**: Screen Tier 1 and Tier 2 models with default hyperparameters on validation (2025).
2. **Shortlisting**: Retain top 8 models per problem.
3. **Tuning**: Tune top 3 with Optuna (30–50 trials) using `TimeSeriesSplit` on train only.
4. **Pruning Rule**: Calculate pairwise validation residual correlation; if $\rho > 0.95$, retain only the stronger model to guarantee diversity.
5. **Ensembles**: Simple Average $\to$ Non-negative Weighted Average $\to$ Ridge Stacking (fitted on out-of-fold walk-forward predictions) $\to$ Hybrid (XGBoost + LSTM on residuals).

---

## 3. Directory & Notebook Layout
```
MAJOR PROJECT/
├── data/
│   ├── raw/                 # Untouched original file (final_dataset.csv)
│   ├── interim/             # Cleaned hourly dataset (clean_hourly.csv, .parquet)
│   └── processed/           # Model-ready features, train/val/test splits & sequences
├── notebooks/
│   ├── 00_data_audit.ipynb
│   ├── 01_preprocessing.ipynb
│   ├── 02_eda.ipynb
│   ├── 03_features_and_splits.ipynb
│   ├── 04_baselines.ipynb
│   ├── 05a_linear_statistical.ipynb
│   ├── 05b_classic_ml.ipynb
│   ├── 06_dl_models.ipynb
│   ├── 07_tuning_ensemble.ipynb
│   ├── 08_net_load.ipynb
│   └── 09_final_results.ipynb
├── src/
│   ├── config.py            # Central parameters, paths, split dates, 47-model tiers
│   ├── preprocess.py        # Cleaning, physical bounds, reindexing, outlier & fill flags
│   ├── eda.py               # 8 diagnostic plotting functions and findings generator
│   ├── features.py          # Lags, rolling statistics, solar geometry, cyclical time
│   ├── metrics.py           # RMSE, MAE, nMAE, MAPE (demand), sMAPE, R2, skill, pinball
│   ├── models_stat.py       # Linear, SARIMAX, Holt-Winters, Prophet
│   ├── models_ml.py         # Sklearn, XGBoost, LightGBM, CatBoost
│   ├── models_dl.py         # LSTM, GRU, CNN-LSTM sequence builders
│   ├── models_prob.py       # Quantile models, NGBoost, DeepAR
│   ├── ensemble.py          # Averaging, stacking, hybrid, correlation pruning
│   ├── audit.py             # Data verification and audit report engine
│   └── evaluate.py          # Unified scoring harness
├── tests/
│   ├── test_environment.py
│   ├── test_audit.py
│   ├── test_preprocess.py
│   ├── test_eda.py
│   ├── test_features.py
│   └── test_split.py
├── results/
│   ├── tables/              # Evaluation tables, audit logs, and summaries
│   ├── figures/             # Diagnostic plots, error distributions, duck curve
│   ├── models/              # Saved model checkpoints and scalers (joblib / pt)
│   └── predictions/         # Out-of-fold and test predictions
├── requirements.txt
└── README.md
```

---

## 4. Git Collaboration & Remote Setup

To collaborate with a friend or pull the latest changes:
```powershell
# Clone the repository:
git clone https://github.com/eveRsor47/Major-project.git
cd Major-project

# Setup virtual environment:
uv venv .venv --python 3.12
uv pip install -r requirements.txt --python .venv\Scripts\python.exe

# Run test suite:
.venv\Scripts\pytest -v
```

---

## 5. Project Changelog & Commit History

| Commit / Push | Milestone | Scope & Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Commit 1 (`4a1486f`)** | **M0: Setup** | Initialized repository layout, Python 3.12 virtual environment, `src/config.py`, copied raw `final_dataset.csv`, pinned `requirements.txt`, and wrote `tests/test_environment.py`. | **VERIFIED (19/19 Tests Pass)** |
| **Commit 1 (`4a1486f`)** | **M1: Data Audit** | Implemented `src/audit.py`, generated `results/tables/data_audit.md`, created `notebooks/00_data_audit.ipynb`, verified 43,824 rows, 0 gaps, 0 duplicates, night solar = 0, and passed `tests/test_audit.py`. | **VERIFIED (22/22 Tests Pass)** |
| **Commit 2 (`f199592`)** | **Roadmap Update & Remote Sync** | Synced repository with GitHub remote `eveRsor47/Major-project`, updated `src/config.py` with 47-model multi-tier taxonomy, installed `shap`, and documented workflow. | **VERIFIED (22/22 Tests Pass)** |
| **Commit 3 (`593fe92`)** | **M2: Preprocessing** | Implemented `src/preprocess.py`, full hourly reindexing, physical limit clipping (night solar = 0, solar $\le 2050$ MW, humidity $[0, 100]\%$, GHI capped), robust rolling MAD demand outlier detection (80 flagged), localized interpolation + seasonal recurrence (482 imputed, `is_filled=1`), dropped leaky target derivatives and unneeded constants, exported `clean_hourly.csv` and `.parquet`, created `notebooks/01_preprocessing.ipynb`, and added `tests/test_preprocess.py`. | **VERIFIED (26/26 Tests Pass)** |
| **Commit 4 (`dea2476` / `a4ee977`)** | **M3: EDA & Statistical Validation** | Built `src/eda.py`, generated 10 publication-grade diagnostic plots in `results/figures/`, computed Augmented Dickey-Fuller (ADF) stationarity metrics (`results/tables/stationarity_tests.csv`), ramp distributions (`results/tables/ramp_rate_statistics.csv`), compiled `results/tables/eda_findings.md`, created `notebooks/02_eda.ipynb`, compiled 7-page executive briefing PDF (`Pavagada_Solar_Forecasting_Team_Briefing_M0_M3.pdf`), and passed `tests/test_eda.py`. | **VERIFIED (30/30 Tests Pass)** |
| **Commit 5 (`3f12079`)** | **Notebooks: Baked Cell Outputs** | Pre-rendered and embedded all execution streams, statistical tables, and high-res figures into `00_data_audit.ipynb`, `01_preprocessing.ipynb`, and `02_eda.ipynb` for instant standalone viewing. | **VERIFIED (30/30 Tests Pass)** |
| **Commit 6 (`dc418de`)** | **M4: Features & Splits** | Engineered horizon-aware features in `src/features.py` for 4 problems (S1, S24, D1, D24), chronological train/val/quarantined test splits, train-fitted `StandardScaler` (`results/models/`), sliding window 3D sequence builder `(N, 24, F)`, empirical anti-leakage perturbation tests, generated and pre-rendered `notebooks/03_features_and_splits.ipynb`, exported 36 dataset parquets to `data/processed/`, and passed `tests/test_features.py`. | **VERIFIED (36/36 Tests Pass)** |
| **Commit 7 (4ef86be)** | **M5: Baselines (6)** | Implemented Section 12 evaluation metrics in `src/metrics.py` (RMSE, MAE, nMAE by capacity, MAPE for demand, sMAPE, R2, skill vs persistence) and baseline generator in `src/evaluate.py`. Evaluated all 6 baselines (Persistence t-1, t-24, t-168, Clear-Sky, Smart Persistence, Mean of t-24 & t-168) across all 4 problems on 2025 validation set. Generated official `results/tables/baselines.csv` and `baselines.md`, saved predictions in `baseline_val_predictions.parquet`, created `fig11_baselines_comparison.png`, executed and baked `notebooks/04_baselines.ipynb`, and passed `tests/test_baselines.py`. | **VERIFIED (40/40 Tests Pass)** |
| **Commit 8 (951542)** | **M6a: Linear & Statistical Models** | Implemented src/models_stat.py and dedicated subfolder models/linear_statistical/ containing 10 standalone executed notebooks (Linear.ipynb, Ridge.ipynb, Lasso.ipynb, ElasticNet.ipynb, Huber.ipynb, SARIMAX.ipynb, Prophet.ipynb, RANSAC.ipynb, HoltWinters.ipynb, and summary.ipynb). Evaluated across all 4 problems on 2025 validation set against M5 baselines. Generated 
esults/tables/linear_stat_results.csv and .md, saved 36 model checkpoints to 
esults/models/, validation predictions to 
esults/predictions/, over 40 diagnostic plots to 
esults/figures/, and passed 	ests/test_models_stat.py. | **VERIFIED (44/44 Tests Pass)** |
| **Commit 9 (Current)** | **M6b: Classic Machine Learning Models** | Implemented src/models_ml.py and dedicated subfolder models/classic_ml/ containing 11 standalone executed notebooks (RandomForest.ipynb, XGBoost.ipynb, LightGBM.ipynb, CatBoost.ipynb, MLP.ipynb, ExtraTrees.ipynb, HistGradientBoosting.ipynb, GradientBoosting.ipynb, SVR.ipynb, KNN.ipynb, and summary.ipynb). Evaluated across all 4 problems on 2025 validation set. Achieved state-of-the-art results: MLP reached RMSE 219.61 MW (MAPE 1.38%, R2 0.9892) on D1 and 401.15 MW (MAPE 2.55%) on D24; LightGBM reached 40.62 MW on S1; GradientBoosting reached 48.62 MW on S24. Generated 
esults/tables/classic_ml_results.csv, saved 40 model artifacts, validation predictions, and passed 48 unit tests. | **VERIFIED (48/48 Tests Pass)** |
| *Upcoming* | **M7: Deep Learning Models** | Implement sequential and recurrent neural network architectures (models/deep_learning/: LSTM, Bi-LSTM, GRU, 1D-CNN, CNN-LSTM, TCN, N-BEATS, N-HiTS, etc.) using PyTorch. | *Pending Review* | Implement Tier 1 linear/statistical (Linear, Ridge, Lasso in M6a) and classic ML (Random Forest, XGBoost, LightGBM, CatBoost, MLP in M6b) models with `05a_linear_statistical.ipynb` and `05b_classic_ml.ipynb`. | *Pending Review* |
