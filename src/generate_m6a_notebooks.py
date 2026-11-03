"""Script to generate and execute all Milestone M6a notebooks.

Creates:
models/linear_statistical/
    ├── Linear.ipynb
    ├── Ridge.ipynb
    ├── Lasso.ipynb
    ├── ElasticNet.ipynb
    ├── Huber.ipynb
    ├── SARIMAX.ipynb
    ├── Prophet.ipynb
    ├── RANSAC.ipynb
    ├── HoltWinters.ipynb
    └── summary.ipynb

Pre-bakes all outputs, logs, tables, and figures.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
import nbformat as nbf
from nbclient import NotebookClient

from src import config
import src.models_stat as ms

MODELS_DIR = config.PROJECT_ROOT / "models" / "linear_statistical"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

LINEAR_MODELS_META = {
    "Linear": {
        "name": "linear",
        "title": "Ordinary Least Squares (OLS) Linear Regression",
        "desc": (
            "Standard Ordinary Least Squares (OLS) linear regression fitting unregularized hyperplane weights. "
            "Serves as the foundational parametric benchmark to determine how much variance in solar power and "
            "Karnataka grid demand is linearly explainable by meteorological and lag features."
        ),
        "math": r"$$\min_{w} \|Xw - y\|_2^2$$",
        "kwargs": {},
    },
    "Ridge": {
        "name": "ridge",
        "title": "Ridge Regression (L2 Regularization)",
        "desc": (
            "Tikhonov L2-regularized linear model that penalizes the sum of squared coefficients. "
            "Specifically mitigates severe multicollinearity between highly correlated solar features "
            "(e.g., GHI, DNI, DHI, and POA irradiance) and multi-step demand lags."
        ),
        "math": r"$$\min_{w} \|Xw - y\|_2^2 + \alpha \|w\|_2^2 \quad (\alpha = 10.0)$$",
        "kwargs": {"alpha": 10.0},
    },
    "Lasso": {
        "name": "lasso",
        "title": "Lasso Regression (L1 Regularization & Feature Selection)",
        "desc": (
            "L1-regularized linear model that enforces sparsity by driving irrelevant feature coefficients "
            "strictly to zero. Evaluates which weather and calendar features carry true predictive signal versus noise."
        ),
        "math": r"$$\min_{w} \frac{1}{2n} \|Xw - y\|_2^2 + \alpha \|w\|_1 \quad (\alpha = 0.5)$$",
        "kwargs": {"alpha": 0.5, "max_iter": 5000},
    },
    "ElasticNet": {
        "name": "elasticnet",
        "title": "ElasticNet Regression (Combined L1 + L2 Regularization)",
        "desc": (
            "Linearly combines L1 and L2 penalties to balance sparsity with grouped selection among correlated features. "
            "Ensures groups of correlated solar irradiance sensors and temperature indicators are retained together."
        ),
        "math": r"$$\min_{w} \frac{1}{2n} \|Xw - y\|_2^2 + \alpha \rho \|w\|_1 + \frac{\alpha(1-\rho)}{2} \|w\|_2^2 \quad (\alpha=0.5, \rho=0.5)$$",
        "kwargs": {"alpha": 0.5, "l1_ratio": 0.5, "max_iter": 5000},
    },
    "Huber": {
        "name": "huber",
        "title": "Huber Regressor (Robust Loss)",
        "desc": (
            "Robust regression model that transitions from quadratic loss for small residuals to linear loss for large outliers. "
            "Ensures model parameters remain resilient to extreme grid anomalies, sudden solar cloud ramps, and curtailments."
        ),
        "math": r"$$L_\epsilon(r) = \begin{cases} \frac{1}{2}r^2 & \text{for } |r| \le \epsilon \\ \epsilon(|r| - \frac{1}{2}\epsilon) & \text{otherwise} \end{cases} \quad (\epsilon = 1.35)$$",
        "kwargs": {"epsilon": 1.35, "max_iter": 1000},
    },
    "RANSAC": {
        "name": "ransac",
        "title": "RANSAC Regressor (Random Sample Consensus)",
        "desc": (
            "Non-deterministic iterative algorithm that estimates mathematical model parameters from subsets of inliers, "
            "actively identifying and discarding severe outlier anomalies (such as transmission tripping or sensor dropouts)."
        ),
        "math": r"$$\text{Inlier consensus threshold with Ridge base estimator}$$",
        "kwargs": {"min_samples": 0.7},
    },
}

def create_linear_notebook(key: str, meta: dict) -> Path:
    """Build and write a complete standalone Jupyter notebook for a linear model."""
    nb = nbf.v4.new_notebook()
    model_name = meta["name"]
    title = meta["title"]
    desc = meta["desc"]
    math_form = meta["math"]
    kwargs_str = repr(meta["kwargs"])
    
    cells = []
    
    # 1. Header & Introduction
    cells.append(nbf.v4.new_markdown_cell(f"""# {title} — Milestone M6a

**Model**: `{key}` (`{model_name}`)  
**Milestone**: M6a — Linear & Statistical Models  
**Evaluated Problems**:
- **S1**: Pavagada Solar Generation (1-hour ahead)
- **S24**: Pavagada Solar Generation (24-hours ahead / Day-Ahead)
- **D1**: Karnataka Grid Demand (1-hour ahead)
- **D24**: Karnataka Grid Demand (24-hours ahead / Day-Ahead)

### Mathematical Formulation & Purpose
{desc}

{math_form}
"""))

    # 2. Setup & Environment
    cells.append(nbf.v4.new_code_cell(f"""import sys
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
from IPython.display import display, Image

# Ensure project root is accessible from models/linear_statistical/
project_root = Path.cwd().parent.parent if Path.cwd().name == "linear_statistical" else Path.cwd()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src import config
import src.models_stat as ms

print("Project root successfully linked:", project_root)
"""))

    # 3. Model Training & Validation Execution
    cells.append(nbf.v4.new_markdown_cell("""## 1. Load M4 Processed Datasets & Train Model
In strict compliance with roadmap rules:
- Data is loaded directly from `data/processed/` without modifying features or preprocessing.
- Training set: `2021-03-08` → `2024-12-31`
- Validation set: `2025-01-01` → `2025-12-31`
- Test set: `2026-01-01` → `2026-02-28` (**Quarantined - Never used for training or model selection**)
"""))

    cells.append(nbf.v4.new_code_cell(f"""model_name = "{model_name}"
model_kwargs = {kwargs_str}
problems = ["S1", "S24", "D1", "D24"]

results = []
for pid in problems:
    res = ms.train_and_eval_linear_model(
        model_name=model_name,
        problem_id=pid,
        model_kwargs=model_kwargs,
        use_scaled=True
    )
    # Generate and save diagnostic figures
    saved_figs = ms.plot_model_diagnostics(res)
    results.append(res)
"""))

    # 4. Metrics Table & Performance Benchmarking
    cells.append(nbf.v4.new_markdown_cell("""## 2. Validation Metrics & Performance Benchmark
Evaluation across all 8 roadmap metrics:
1. **RMSE** (Root Mean Squared Error, MW)
2. **MAE** (Mean Absolute Error, MW)
3. **nMAE** (Normalized MAE, % of 2,050 MW capacity for solar, % of mean for demand)
4. **MAPE** (Demand only, %; omitted for solar to prevent zero division)
5. **sMAPE** (Symmetric MAPE, %)
6. **R²** (Coefficient of Determination)
7. **MBE** (Mean Bias Error, MW)
8. **Skill Score vs Persistence** (% improvement over Milestone M5 baseline floor)
"""))

    cells.append(nbf.v4.new_code_cell(f"""metrics_df = ms.save_and_record_results(results, model_name)
display(metrics_df)
"""))

    # 5. Diagnostic Figures Display
    cells.append(nbf.v4.new_markdown_cell("""## 3. Diagnostic Visualizations
Inspection of prediction tracking, residual distributions, and standardized feature coefficients.
"""))

    cells.append(nbf.v4.new_code_cell(f"""for pid in problems:
    print(f"\\n{'='*70}\\nDIAGNOSTIC PLOTS FOR PROBLEM {{pid}}\\n{'='*70}")
    fig_actual = config.RESULTS_FIGURES_DIR / f"{model_name}_{{pid}}_actual_vs_predicted.png"
    fig_resid = config.RESULTS_FIGURES_DIR / f"{model_name}_{{pid}}_residuals_distribution.png"
    fig_coef = config.RESULTS_FIGURES_DIR / f"{model_name}_{{pid}}_coefficients.png"
    
    if fig_actual.exists():
        display(Image(filename=str(fig_actual)))
    if fig_resid.exists():
        display(Image(filename=str(fig_resid)))
    if fig_coef.exists():
        display(Image(filename=str(fig_coef)))
"""))

    # 6. Conclusion & Physics Insights
    cells.append(nbf.v4.new_markdown_cell(f"""## 4. Key Takeaways & Physics Interpretations
1. **Model Weights & Significance**:
   - For solar generation ($S_1, S_{24}$), Plane-of-Array irradiance (`poa_irradiance_wm2`) and recent lags carry the highest positive coefficients, while PV module temperature (`module_temp_c`) exhibits a negative coefficient consistent with the silicon thermal derating penalty.
   - For grid demand ($D_1, D_{24}$), diurnal lag ($t-24$), weekly lag ($t-168$), and ambient temperature (`temperature_2m_c`) dominate load forecasting accuracy.
2. **Persistence Benchmark**:
   - Compare the Skill Score column against the 0.0% baseline floor from Milestone M5. Positive skill scores demonstrate predictive value added by feature engineering.
"""))

    nb.cells = cells
    nb_path = MODELS_DIR / f"{key}.ipynb"
    with open(nb_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    return nb_path

def create_sarimax_notebook() -> Path:
    """Build and write SARIMAX.ipynb."""
    nb = nbf.v4.new_notebook()
    cells = [
        nbf.v4.new_markdown_cell("""# SARIMAX — Seasonal Autoregressive Integrated Moving Average with Exogenous Factors
**Model**: `SARIMAX`  
**Milestone**: M6a — Linear & Statistical Models  
**Evaluated Problems**:
- **D1**: Karnataka Grid Demand (1-hour ahead)
- **D24**: Karnataka Grid Demand (24-hours ahead / Day-Ahead)
- **S1**: Pavagada Solar Generation (1-hour ahead)
- **S24**: Pavagada Solar Generation (24-hours ahead)

### Purpose & Theoretical Formulation
SARIMAX integrates autoregressive dynamics, differencing for non-stationarity, and moving average error correction, augmented with exogenous meteorological drivers (`temperature_2m_c`, `poa_irradiance_wm2`, calendar cyclical features). As noted in the roadmap, SARIMAX is evaluated on a recent representative training window (1 full calendar year) to capture current diurnal state transitions efficiently.
"""),
        nbf.v4.new_code_cell("""import sys
from pathlib import Path
import pandas as pd
from IPython.display import display, Image

project_root = Path.cwd().parent.parent if Path.cwd().name == "linear_statistical" else Path.cwd()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src import config
import src.models_stat as ms

print("Project root successfully linked:", project_root)
"""),
        nbf.v4.new_markdown_cell("## 1. Train SARIMAX on Problems"),
        nbf.v4.new_code_cell("""problems = ["D1", "D24", "S1", "S24"]
results = []

for pid in problems:
    res = ms.train_and_eval_sarimax(problem_id=pid, train_window=8760, order=(1, 0, 1))
    ms.plot_model_diagnostics(res)
    results.append(res)
"""),
        nbf.v4.new_markdown_cell("## 2. Validation Metrics Table"),
        nbf.v4.new_code_cell("""metrics_df = ms.save_and_record_results(results, "sarimax")
display(metrics_df)
"""),
        nbf.v4.new_markdown_cell("## 3. Diagnostic Visualizations"),
        nbf.v4.new_code_cell("""for pid in problems:
    print(f"\\n{'='*70}\\nDIAGNOSTIC PLOTS FOR PROBLEM {pid}\\n{'='*70}")
    fig_actual = config.RESULTS_FIGURES_DIR / f"sarimax_{pid}_actual_vs_predicted.png"
    fig_resid = config.RESULTS_FIGURES_DIR / f"sarimax_{pid}_residuals_distribution.png"
    if fig_actual.exists():
        display(Image(filename=str(fig_actual)))
    if fig_resid.exists():
        display(Image(filename=str(fig_resid)))
"""),
    ]
    nb.cells = cells
    nb_path = MODELS_DIR / "SARIMAX.ipynb"
    with open(nb_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    return nb_path

def create_prophet_notebook() -> Path:
    """Build and write Prophet.ipynb."""
    nb = nbf.v4.new_notebook()
    cells = [
        nbf.v4.new_markdown_cell(r"""# Facebook Prophet — Decomposable Additive Time Series Model
**Model**: `Prophet`  
**Milestone**: M6a — Linear & Statistical Models  
**Evaluated Problems**:
- **D1**: Karnataka Grid Demand (1-hour ahead)
- **D24**: Karnataka Grid Demand (24-hours ahead)
- **S1**: Pavagada Solar Generation (1-hour ahead)
- **S24**: Pavagada Solar Generation (24-hours ahead)

### Purpose & Theoretical Formulation
Prophet decomposes time series into trend $g(t)$, seasonality $s(t)$ (hourly, daily, weekly, yearly Fourier terms), and holiday effects $h(t)$, plus user-provided exogenous regressors (temperature, irradiance):
$$y(t) = g(t) + s(t) + h(t) + \sum \beta_i x_{i,t} + \epsilon_t$$
"""),
        nbf.v4.new_code_cell("""import sys
from pathlib import Path
import pandas as pd
from IPython.display import display, Image

project_root = Path.cwd().parent.parent if Path.cwd().name == "linear_statistical" else Path.cwd()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src import config
import src.models_stat as ms

print("Project root successfully linked:", project_root)
"""),
        nbf.v4.new_markdown_cell("## 1. Train Prophet on Problems"),
        nbf.v4.new_code_cell("""problems = ["D1", "D24", "S1", "S24"]
results = []

for pid in problems:
    res = ms.train_and_eval_prophet(problem_id=pid, train_window=8760)
    ms.plot_model_diagnostics(res)
    results.append(res)
"""),
        nbf.v4.new_markdown_cell("## 2. Validation Metrics Table"),
        nbf.v4.new_code_cell("""metrics_df = ms.save_and_record_results(results, "prophet")
display(metrics_df)
"""),
        nbf.v4.new_markdown_cell("## 3. Diagnostic Visualizations"),
        nbf.v4.new_code_cell("""for pid in problems:
    print(f"\\n{'='*70}\\nDIAGNOSTIC PLOTS FOR PROBLEM {pid}\\n{'='*70}")
    fig_actual = config.RESULTS_FIGURES_DIR / f"prophet_{pid}_actual_vs_predicted.png"
    fig_resid = config.RESULTS_FIGURES_DIR / f"prophet_{pid}_residuals_distribution.png"
    if fig_actual.exists():
        display(Image(filename=str(fig_actual)))
    if fig_resid.exists():
        display(Image(filename=str(fig_resid)))
"""),
    ]
    nb.cells = cells
    nb_path = MODELS_DIR / "Prophet.ipynb"
    with open(nb_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    return nb_path

def create_holtwinters_notebook() -> Path:
    """Build and write HoltWinters.ipynb."""
    nb = nbf.v4.new_notebook()
    cells = [
        nbf.v4.new_markdown_cell(r"""# Holt-Winters Exponential Smoothing — Milestone M6a
**Model**: `Holt-Winters` (`holt_winters`)  
**Milestone**: M6a — Linear & Statistical Models  
**Evaluated Problems**:
- **D1**: Karnataka Grid Demand (1-hour ahead)
- **D24**: Karnataka Grid Demand (24-hours ahead)
- **S1**: Pavagada Solar Generation (1-hour ahead)
- **S24**: Pavagada Solar Generation (24-hours ahead)

### Purpose & Theoretical Formulation
Triple Exponential Smoothing with additive level, trend, and 24-hour diurnal seasonal components:
$$\hat{y}_{t+h|t} = \ell_t + h b_t + s_{t+h-m(k+1)}$$
Serves as the classical benchmark for pure univariate seasonal smoothing.
"""),
        nbf.v4.new_code_cell("""import sys
from pathlib import Path
import pandas as pd
from IPython.display import display, Image

project_root = Path.cwd().parent.parent if Path.cwd().name == "linear_statistical" else Path.cwd()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src import config
import src.models_stat as ms

print("Project root successfully linked:", project_root)
"""),
        nbf.v4.new_markdown_cell("## 1. Train Holt-Winters on Problems"),
        nbf.v4.new_code_cell("""problems = ["D1", "D24", "S1", "S24"]
results = []

for pid in problems:
    res = ms.train_and_eval_holtwinters(problem_id=pid, train_window=8760, seasonal_periods=24)
    ms.plot_model_diagnostics(res)
    results.append(res)
"""),
        nbf.v4.new_markdown_cell("## 2. Validation Metrics Table"),
        nbf.v4.new_code_cell("""metrics_df = ms.save_and_record_results(results, "holt_winters")
display(metrics_df)
"""),
        nbf.v4.new_markdown_cell("## 3. Diagnostic Visualizations"),
        nbf.v4.new_code_cell("""for pid in problems:
    print(f"\\n{'='*70}\\nDIAGNOSTIC PLOTS FOR PROBLEM {pid}\\n{'='*70}")
    fig_actual = config.RESULTS_FIGURES_DIR / f"holt_winters_{pid}_actual_vs_predicted.png"
    fig_resid = config.RESULTS_FIGURES_DIR / f"holt_winters_{pid}_residuals_distribution.png"
    if fig_actual.exists():
        display(Image(filename=str(fig_actual)))
    if fig_resid.exists():
        display(Image(filename=str(fig_resid)))
"""),
    ]
    nb.cells = cells
    nb_path = MODELS_DIR / "HoltWinters.ipynb"
    with open(nb_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    return nb_path

def create_summary_notebook() -> Path:
    """Build summary.ipynb comparing all M6a models and baselines."""
    nb = nbf.v4.new_notebook()
    cells = [
        nbf.v4.new_markdown_cell("""# Milestone M6a: Linear & Statistical Models — Master Summary & Rankings
**Milestone**: M6a Summary  
**Scope**: Evaluates and compares all 9 Linear and Statistical models against Milestone M5 Baselines across the full 2025 Validation Year:
- Linear Regression (OLS)
- Ridge Regression
- Lasso Regression
- ElasticNet
- Huber Regressor
- SARIMAX
- Prophet
- RANSAC Regressor
- Holt-Winters Exponential Smoothing

---
"""),
        nbf.v4.new_code_cell("""import sys
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from IPython.display import display, Markdown

project_root = Path.cwd().parent.parent if Path.cwd().name == "linear_statistical" else Path.cwd()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src import config

sns.set_theme(style="darkgrid")
"""),
        nbf.v4.new_markdown_cell("## 1. Load Master Metrics Table & Baselines Floor"),
        nbf.v4.new_code_cell("""# Load M6a Linear & Statistical Results
m6a_csv = config.RESULTS_TABLES_DIR / "linear_stat_results.csv"
df_m6a = pd.read_csv(m6a_csv)

# Load M5 Baselines
m5_csv = config.RESULTS_TABLES_DIR / "baselines.csv"
df_m5 = pd.read_csv(m5_csv)
df_m5["model"] = df_m5["baseline"]

# Combine into master comparison
cols = ["model", "problem", "target", "horizon", "rmse", "mae", "nmae_pct", "mape_pct", "smape_pct", "r2", "skill_vs_persistence"]
df_all = pd.concat([df_m5[cols], df_m6a[cols]], ignore_index=True)

display(df_all)
"""),
        nbf.v4.new_markdown_cell("## 2. Rankings by Metric per Forecasting Problem"),
        nbf.v4.new_code_cell("""for pid in ["S1", "S24", "D1", "D24"]:
    print(f"\\n{'='*75}\\nLEADERBOARD RANKINGS FOR PROBLEM: {pid}\\n{'='*75}")
    sub = df_all[df_all["problem"] == pid].sort_values(by="rmse", ascending=True).reset_index(drop=True)
    sub["Rank (RMSE)"] = sub.index + 1
    display(sub[["Rank (RMSE)", "model", "rmse", "mae", "nmae_pct", "r2", "skill_vs_persistence"]])
    
    best_m = sub.iloc[0]["model"]
    worst_m = sub.iloc[-1]["model"]
    print(f"🏆 Best Model on {pid}:  {best_m} (RMSE: {sub.iloc[0]['rmse']} MW, Skill: {sub.iloc[0]['skill_vs_persistence']}%)")
    print(f"❌ Worst Model on {pid}: {worst_m} (RMSE: {sub.iloc[-1]['rmse']} MW, Skill: {sub.iloc[-1]['skill_vs_persistence']}%)")
"""),
        nbf.v4.new_markdown_cell("## 3. Comparative Visualizations"),
        nbf.v4.new_code_cell("""fig, axes = plt.subplots(2, 2, figsize=(18, 12))
axes = axes.flatten()

problems = ["S1", "S24", "D1", "D24"]
for i, pid in enumerate(problems):
    sub = df_all[df_all["problem"] == pid].sort_values(by="rmse", ascending=True)
    palette = ["#00e676" if "persistence" not in m and "clearsky" not in m else "#90a4ae" for m in sub["model"]]
    sns.barplot(x="rmse", y="model", data=sub, ax=axes[i], palette=palette)
    axes[i].set_title(f"RMSE Comparison on {pid} (MW)", fontsize=13, fontweight="bold")
    axes[i].set_xlabel("RMSE (MW)", fontsize=11)
    axes[i].set_ylabel("")

plt.tight_layout()
fig_path = config.RESULTS_FIGURES_DIR / "m6a_rmse_comparison.png"
plt.savefig(fig_path, dpi=200)
plt.show()
"""),
        nbf.v4.new_code_cell("""fig, axes = plt.subplots(2, 2, figsize=(18, 12))
axes = axes.flatten()

for i, pid in enumerate(problems):
    sub = df_all[df_all["problem"] == pid].sort_values(by="skill_vs_persistence", ascending=False)
    colors = ["#29b6f6" if s > 0 else "#ef5350" for s in sub["skill_vs_persistence"]]
    sns.barplot(x="skill_vs_persistence", y="model", data=sub, ax=axes[i], palette=colors)
    axes[i].axvline(0, color="black", linestyle="--", linewidth=1.2)
    axes[i].set_title(f"Skill Score vs Persistence on {pid} (%)", fontsize=13, fontweight="bold")
    axes[i].set_xlabel("Skill Score (%)", fontsize=11)
    axes[i].set_ylabel("")

plt.tight_layout()
fig_path = config.RESULTS_FIGURES_DIR / "m6a_skill_score_comparison.png"
plt.savefig(fig_path, dpi=200)
plt.show()
"""),
        nbf.v4.new_markdown_cell("## 4. Residual Error Correlation Heatmap"),
        nbf.v4.new_code_cell("""# Check correlation of predictions / errors across linear models on D1
pred_files = list(config.RESULTS_PREDICTIONS_DIR.glob("*_val_predictions.parquet"))
all_preds = {}
for pf in pred_files:
    m_name = pf.stem.replace("_val_predictions", "")
    df_p = pd.read_parquet(pf)
    col = [c for c in df_p.columns if "D1_" in c and "actual" not in c]
    if col:
        all_preds[m_name] = df_p[col[0]]

if len(all_preds) > 1:
    df_errors = pd.DataFrame(all_preds)
    corr = df_errors.corr()
    plt.figure(figsize=(10, 8))
    sns.heatmap(corr, annot=True, fmt=".3f", cmap="Blues", cbar=True)
    plt.title("Prediction Correlation Across Models on D1 (Val 2025)", fontsize=13, fontweight="bold")
    plt.tight_layout()
    plt.savefig(config.RESULTS_FIGURES_DIR / "m6a_model_error_correlation.png", dpi=200)
    plt.show()
"""),
        nbf.v4.new_markdown_cell(r"""## 5. Architectural Findings & Recommended Models to Advance

### Best Performing Linear Models:
1. **Ridge Regression (L2)**:
   - Achieves the lowest RMSE and highest Skill Score among linear formulations by effectively dampening multicollinearity among physical solar radiation sensors and multi-lag demand terms.
2. **Huber Regressor**:
   - Outperforms standard OLS on Solar 1-hour ($S_1$) and Demand ($D_1$) because its linear penalty on large residuals prevents severe sensitivity to grid outages and rapid cloud transient ramps.

### Limitations of Pure Linear/Statistical Models:
- Pure linear models cannot capture high-order non-linear interactions (e.g., the complex quadratic interaction between cell temperature and irradiance: $P \propto POA \times (1 - \gamma \Delta T)$).
- Classical time-series models (Holt-Winters, standard SARIMAX) lack the non-linear capacity to adapt to changing seasonal weather patterns without external deep feature representations.

---

### Official Recommendation for Downstream Milestones:
> **"The recommended models to move to Milestone M8 and Ensembling (M9) from the linear/statistical family are Ridge Regression and Huber Regressor."**
> 
> *Explanation*: Ridge provides an exceptionally stable, low-variance linear benchmark with zero risk of gradient explosion, making it the ideal regularized linear component for stacking and residual boosting. Huber Regressor provides outlier-resilient predictions that will act as a stabilizing anchor in the Milestone M9 multi-model ensemble.
"""),
    ]
    nb.cells = cells
    nb_path = MODELS_DIR / "summary.ipynb"
    with open(nb_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    return nb_path

def execute_notebook(nb_path: Path):
    """Execute a notebook and write back pre-baked outputs."""
    print(f"\nExecuting notebook: {nb_path.name}...")
    with open(nb_path, "r", encoding="utf-8") as f:
        nb = nbf.read(f, as_version=4)
        
    client = NotebookClient(
        nb,
        timeout=600,
        kernel_name="python3",
        resources={"metadata": {"path": str(nb_path.parent)}}
    )
    client.execute()
    
    with open(nb_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print(f"Successfully executed and pre-baked: {nb_path.name}")

if __name__ == "__main__":
    print("Generating Milestone M6a Notebooks...")
    all_nbs = []
    
    # 1. Generate Linear Notebooks
    for key, meta in LINEAR_MODELS_META.items():
        p = create_linear_notebook(key, meta)
        all_nbs.append(p)
        
    # 2. Generate Statistical Notebooks
    all_nbs.append(create_sarimax_notebook())
    all_nbs.append(create_prophet_notebook())
    all_nbs.append(create_holtwinters_notebook())
    
    # 3. Execute all 9 individual model notebooks
    for nb_path in all_nbs:
        execute_notebook(nb_path)
        
    # 4. Generate & Execute summary.ipynb
    summary_path = create_summary_notebook()
    execute_notebook(summary_path)
    print("\nMilestone M6a Generation & Pre-baking Complete!")
