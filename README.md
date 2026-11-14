# Renewable Energy-Aware Load Prediction Model for Smart Grids
**Focus Case Study: Pavagada Solar Park (2,050 MW), Tumkur District, Karnataka**

---

## 1. Project Overview & Multi-Tier Architecture
This project develops an end-to-end, reproducible time-series forecasting framework designed for modern power grid dispatch operations. It addresses three interconnected forecasting challenges:
1. **Solar Power Generation ($P_{\text{solar}}$)**: Anticipating generation across Pavagada Solar Park (Tumkur, Karnataka).
2. **System Demand ($P_{\text{demand}}$)**: Modeling statewide load driven by diurnal habits and temperature.
3. **Net Load ($P_{\text{net}} = P_{\text{demand}} - P_{\text{solar}}$)**: Quantifying the residual power required from conventional dispatchable power plants to prepare for evening ramps (the "duck curve").

> [!NOTE]
> **Data Disclosure**: The underlying dataset contains hourly  data ($N = 43,824$ records from 2021-03-01 to 2026-02-28 IST). Solar figures are generated from weather physics; models achieve high accuracy on physics-derived data, demonstrating pipeline correctness.

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
├── dashboard/               # M11: GridPulse Interactive React + ECharts Frontend
│   ├── public/data/         # Verified JSON telemetry bundles (test_2026, val_2025, benchmarks, manifest)
│   ├── public/favicon.svg   # GridPulse d ↔ p Yin-Yang brand icon
│   ├── src/
│   │   ├── components/      # StoryCanvas (60fps 3D terrain & vortex engine), StoryIntro (5-scene animation), GridPulseLogo (d ↔ p swing), SpotlightTour, ControlRoomShell
│   │   ├── rooms/           # MissionControl, NeuralMixer, CloudRadar, DigitalTwin, VivaWarRoom, KsldcCompliance
│   │   ├── store/           # Zustand real-time telemetry state & tour manager
│   │   └── utils/           # Live RMSE/MAE/R²/Skill computation, Web Audio SFX & tour guides
│   └── package.json
├── data/
│   ├── raw/                 # Untouched original file (final_dataset.csv)
│   ├── interim/             # Cleaned hourly dataset (clean_hourly.csv, .parquet)
│   └── processed/           # Model-ready features, train/val/test splits & sequences
├── models/
│   ├── linear_statistical/  # M6a: Linear & Statistical Notebooks (Linear, Ridge, Lasso, etc. + summary)
│   ├── classic_ml/          # M6b: Classic ML Notebooks (RandomForest, XGBoost, LightGBM, etc. + summary)
│   └── deep_learning/       # M7: Deep Learning Notebooks (LSTM, GRU, CNN_LSTM, BiLSTM, DLinear + summary)
├── notebooks/
│   ├── 00_data_audit.ipynb
│   ├── 01_preprocessing.ipynb
│   ├── 02_eda.ipynb
│   ├── 03_features_and_splits.ipynb
│   ├── 04_baselines.ipynb
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
│   ├── models_dl.py         # PyTorch architectures: LSTM, GRU, CNN-LSTM, BiLSTM, DLinear
│   ├── models_prob.py       # Quantile models, NGBoost, DeepAR
│   ├── ensemble.py          # Averaging, stacking, hybrid, correlation pruning
│   ├── postprocess.py       # Physical constraints: night=0, capacity, ramp, demand bounds
│   ├── execute_m8.py        # Optuna HPO, quantile LGBM, and ensemble training runner
│   ├── execute_m9.py        # M9 physical post-processing validation runner
│   ├── execute_m10.py       # M10 quarantined 2026 test set full-funnel benchmark runner
│   ├── export_dashboard_data.py # M11 verified telemetry JSON bundle exporter for GridPulse
│   ├── audit.py             # Data verification and audit report engine
│   └── evaluate.py          # Unified scoring harness
├── tests/
│   ├── test_environment.py
│   ├── test_audit.py
│   ├── test_preprocess.py
│   ├── test_eda.py
│   ├── test_features.py
│   ├── test_baselines.py
│   ├── test_models_stat.py
│   ├── test_models_ml.py
│   ├── test_models_dl.py
│   ├── test_ensemble.py
│   ├── test_postprocess.py
│   ├── test_m10.py
│   └── test_m11_dashboard.py
├── results/
│   ├── tables/              # Evaluation tables, audit logs, and summaries (CSV / MD)
│   ├── figures/             # Partitioned: eda/, baselines/, linear_statistical/, classic_ml/, deep_learning/
│   ├── models/              # Saved model checkpoints and scalers (joblib / pt)
│   └── predictions/         # Validation and test predictions (parquet)
├── requirements.txt
└── README.md
```

---

## 4. Git Collaboration & Remote Setup

To collaborate or pull the latest changes:
```powershell
# Clone the repository:
git clone https://github.com/eveRsor47/Major-project.git
cd Major-project

# Setup virtual environment:
uv venv .venv --python 3.12
uv pip install -r requirements.txt --python .venv\Scripts\python.exe

# Run test suite:
.venv\Scripts\pytest -v

# Launch GridPulse Interactive Frontend:
cd dashboard
npm install
npm run dev
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
| **Commit 7 (`4ef86be`)** | **M5: Baselines (6)** | Implemented Section 12 evaluation metrics in `src/metrics.py` (RMSE, MAE, nMAE by capacity, MAPE for demand, sMAPE, R2, skill vs persistence) and baseline generator in `src/evaluate.py`. Evaluated all 6 baselines (Persistence t-1, t-24, t-168, Clear-Sky, Smart Persistence, Mean of t-24 & t-168) across all 4 problems on 2025 validation set. Generated official `results/tables/baselines.csv` and `baselines.md`, saved predictions in `baseline_val_predictions.parquet`, created `fig11_baselines_comparison.png`, executed and baked `notebooks/04_baselines.ipynb`, and passed `tests/test_baselines.py`. | **VERIFIED (40/40 Tests Pass)** |
| **Commit 8 (`f951542`)** | **M6a: Linear & Statistical Models** | Implemented `src/models_stat.py` and dedicated subfolder `models/linear_statistical/` containing 10 standalone executed notebooks (Linear.ipynb, Ridge.ipynb, Lasso.ipynb, ElasticNet.ipynb, Huber.ipynb, SARIMAX.ipynb, Prophet.ipynb, RANSAC.ipynb, HoltWinters.ipynb, and summary.ipynb). Evaluated across all 4 problems on 2025 validation set against M5 baselines. Generated `results/tables/linear_stat_results.csv` and `.md`, saved 36 model checkpoints to `results/models/`, validation predictions to `results/predictions/`, over 40 diagnostic plots to `results/figures/linear_statistical/`, and passed `tests/test_models_stat.py`. | **VERIFIED (44/44 Tests Pass)** |
| **Commit 9 (`41d7af4` / `5504cf9`)** | **M6b: Classic Machine Learning Models** | Implemented `src/models_ml.py` and dedicated subfolder `models/classic_ml/` containing 11 standalone executed notebooks (RandomForest.ipynb, XGBoost.ipynb, LightGBM.ipynb, CatBoost.ipynb, MLP.ipynb, ExtraTrees.ipynb, HistGradientBoosting.ipynb, GradientBoosting.ipynb, SVR.ipynb, KNN.ipynb, and summary.ipynb). Evaluated across all 4 problems on 2025 validation set. Achieved state-of-the-art results: MLP reached RMSE 219.61 MW (MAPE 1.38%, R2 0.9892) on D1 and 401.15 MW (MAPE 2.55%) on D24; LightGBM reached 40.62 MW on S1; GradientBoosting reached 48.62 MW on S24. Generated `results/tables/classic_ml_results.csv` and `.md`, saved 40 model artifacts, validation predictions, over 40 diagnostic plots to `results/figures/classic_ml/`, and passed 48 unit tests. | **VERIFIED (48/48 Tests Pass)** |
| **Commit 10 (`db48a6f`)** | **M7: Deep Learning Models** | Implemented `src/models_dl.py` and dedicated subfolder `models/deep_learning/` containing 6 standalone executed notebooks (LSTM.ipynb, GRU.ipynb, CNN_LSTM.ipynb, BiLSTM.ipynb, DLinear.ipynb, and summary.ipynb). Evaluated across all 4 problems on 2025 validation set against M5 baselines, M6a linear models, and M6b classic ML. Achieved state-of-the-art results: DLinear achieved all-time project record RMSE 195.69 MW (MAPE 1.26%, Skill +70.79%) on D1; BiLSTM reached 48.40 MW on S1 (Skill +77.07%); GRU reached 53.15 MW on S24 (Skill +74.95%) and 396.20 MW on D24 (Skill +48.63%). Generated `results/tables/dl_results.csv` and `.md`, saved 20 PyTorch `.pt` model artifacts, 20 validation predictions, 43 diagnostic/ranking figures to `results/figures/deep_learning/`, and passed 53 unit tests. | **VERIFIED (53/53 Tests Pass)** |
| **Commit 11 (`dc47a7a`)** | **M8: Tuning, Probabilistic Models & Ensembles** | Full Optuna Bayesian HPO (35 trials × 3-fold temporal CV) across 5 DL champions on all 4 problems (20 studies). Quantile LightGBM probabilistic forecasting (P10/P50/P90, 83.4% empirical coverage on S1, 82.4% on S24). Built 4 formal ensemble methods: Equal-Weight, Non-Negative Least Squares (NNLS), Stacking Ridge, and Residual Hybrid. All-time benchmark records: Stacking Ridge achieved RMSE 41.29 MW (+80.44% Skill) on S1, 48.60 MW (+77.10% Skill) on S24, 162.34 MW (+75.77% Skill) on D1, and 372.82 MW (+51.66% Skill) on D24. Generated `results/tables/m8_ensemble_results.csv`, `m8_seasonal_results.csv`, saved 20 tuned `.pt` models, 8 diagnostic figures to `results/figures/m8_ensemble/`, and passed 24 unit tests. | **VERIFIED (24/24 Tests Pass)** |
| **Commit 12 (`4d08a30` / `c1f1ef6`)** | **M9: Physical Constraints & Post-Processing** | Implemented `src/postprocess.py` and `src/execute_m9.py`. Enforced strict solar night clipping ($0.00$ MW when solar zenith $\ge 90^\circ$ or clear-sky GHI $\le 0$), physical capacity bounds $[0, 2050]$ MW, physical Pavagada sunrise/cloud ramp-rate limiter ($\le 1000$ MW/hr), and Karnataka grid demand bounds $[4000, 20000]$ MW. Enforced conservation of energy Duck Curve net load identity ($\text{Net Load} = \text{Demand} - \text{Solar}$). Post-processing further boosted validation accuracy: Stacking Ridge on S1 improved to RMSE 41.13 MW (**+80.51% Skill**), on S24 to 48.25 MW (**+77.26% Skill**). Generated `results/tables/m9_postprocessing_results.csv`, `results/figures/m9_postprocessing/duck_curve_net_load.png`, and passed 7 unit tests (84/84 full suite passing). | **VERIFIED (84/84 Tests Pass)** |
| **Commit 13 (`d4b7a68`)** | **M10: Test Set Evaluation & Viva Benchmarks** | Implemented `src/execute_m10.py` and unblinded the strictly quarantined Jan–Feb 2026 test set (`N = 1,393` sequence-aligned hours across all 4 problems) with zero test-set leakage. Evaluated full 7-tier model funnel (148 model rows: Baselines, Linear/Stat, Classic ML, Untuned DL, Optuna-Tuned DL, 4 Ensembles, Physical Post-Processed Champion) plus Quantile LightGBM P10/P50/P90 uncertainty intervals and 2025 Val vs 2026 Test generalization audit. Pre-registered Stacking Ridge + Physical Constraints achieved: **S1: 24.95 MW RMSE (+88.76% Skill, $R^2=0.9984$)**, **S24: 29.00 MW RMSE (+80.82% Skill, $R^2=0.9979$)**, **D1: 160.28 MW RMSE (+76.41% Skill, MAPE 0.96%, $R^2=0.9922$)**, **D24: 373.18 MW RMSE (+52.01% Skill, MAPE 2.25%, $R^2=0.9575$)**, and 1-hr Net Load Duck Curve RMSE **161.35 MW ($R^2=0.9903$)**. Generated `results/tables/m10_test_benchmark.csv`, `.md`, `m10_val_vs_test_generalization.csv`, `m10_test_probabilistic.csv`, 17 test prediction parquets, 15 publication-grade figures in `results/figures/m10_test_evaluation/`, and added 8 new integration tests (`tests/test_m10.py`). | **VERIFIED (92/92 Tests Pass)** |
| **M11 (Latest)** | **M11: GridPulse Interactive Frontend Dashboard** | Implemented `src/export_dashboard_data.py` exporting verified M8/M9/M10 JSON telemetry (`test_2026.json` 1,393 hrs, `val_2025.json` 8,737 hrs, `benchmarks.json` 148 test rows, `manifest.json`), plus the full React 19 + TypeScript + Tailwind + Apache ECharts `GridPulse` web app in `dashboard/`. Opens with a 5-scene animated narrative story leading into the signature animated **`d ↔ p` Yin-Yang Swing** brand reveal and background telemetry loader, followed by per-room **SVG Spotlight Walkthroughs** (`Skip Tour` / `? Screen Guide`) and 6 specialized KSLDC command rooms: **Mission Control**, **AI Neural Weight Mixer**, **Cloud Radar & Micro-Ramp Interceptor**, **Pavagada 8-Block Spatial Digital Twin**, **Viva Examiner War Room**, and **KSLDC DSM Compliance Suite**. Verified via `vite build`, headless Chromium QA (`1366×768`), and `tests/test_m11_dashboard.py`. | **VERIFIED (97/97 Tests Pass)** |
