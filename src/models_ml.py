"""Classic Machine Learning Models Execution Module for Pavagada Solar + Demand Forecasting.

Centralizes data loading, training, prediction, metric computation, visualization,
and artifact persistence for all Milestone M6b models:
- Random Forest (Bagged decision trees)
- XGBoost (Extreme Gradient Boosting)
- LightGBM (Leaf-wise histogram boosting)
- CatBoost (Symmetric oblivious trees)
- MLP (Multi-Layer Perceptron / Feedforward Neural Net)
- Extra Trees (Extremely Randomized Trees)
- HistGradientBoosting (Scikit-Learn histogram boosting)
- Gradient Boosting (Classical Friedman Gradient Boosting)
- SVR (Support Vector Regression)
- KNN (K-Nearest Neighbors Regression)
"""

from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import (
    RandomForestRegressor,
    ExtraTreesRegressor,
    HistGradientBoostingRegressor,
    GradientBoostingRegressor,
)
from sklearn.neural_network import MLPRegressor
from sklearn.svm import SVR
from sklearn.neighbors import KNeighborsRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor

from src import config
from src.metrics import compute_all_metrics, clip_predictions

# Reference Persistence RMSE values from Milestone M5 for Skill Score calculation
REFERENCE_PERSISTENCE_RMSE: Dict[str, float] = {
    "S1": 211.06,    # persistence_t1
    "S24": 212.21,   # persistence_t24
    "D1": 669.96,    # persistence_t1
    "D24": 771.30,   # persistence_t24
}

MODELS_REQUIRING_SCALED_DATA = {"mlp", "svr", "knn"}

def load_problem_data_ml(problem_id: str, use_scaled: bool = False) -> Dict[str, Any]:
    """Load processed M4 parquet files for a given problem with zero leakage."""
    scale_suffix = "_scaled" if use_scaled else ""
    
    train_x_path = config.PROCESSED_DATA_DIR / f"X_train_{problem_id}{scale_suffix}.parquet"
    train_y_path = config.PROCESSED_DATA_DIR / f"y_train_{problem_id}.parquet"
    val_x_path = config.PROCESSED_DATA_DIR / f"X_val_{problem_id}{scale_suffix}.parquet"
    val_y_path = config.PROCESSED_DATA_DIR / f"y_val_{problem_id}.parquet"
    test_x_path = config.PROCESSED_DATA_DIR / f"X_test_{problem_id}{scale_suffix}.parquet"
    test_y_path = config.PROCESSED_DATA_DIR / f"y_test_{problem_id}.parquet"
    
    unscaled_val_x_path = config.PROCESSED_DATA_DIR / f"X_val_{problem_id}.parquet"
    
    print("=" * 70)
    print(f"LOADING PROCESSED DATASET FOR PROBLEM: {problem_id}")
    print(f"Target: {config.PROBLEMS[problem_id]['target']} | Horizon: {config.PROBLEMS[problem_id]['horizon_hours']}h")
    print(f"Using Scaled Features: {use_scaled}")
    print(f"• Training Features Path:   {train_x_path}")
    print(f"• Training Target Path:     {train_y_path}")
    print(f"• Validation Features Path: {val_x_path}")
    print(f"• Validation Target Path:   {val_y_path}")
    print(f"• Test Features Path:       {test_x_path} (QUARANTINED - NOT TOUCHED)")
    print("=" * 70)
    
    X_train = pd.read_parquet(train_x_path)
    y_train = pd.read_parquet(train_y_path).iloc[:, 0]
    X_val = pd.read_parquet(val_x_path)
    y_val = pd.read_parquet(val_y_path).iloc[:, 0]
    X_unscaled_val = pd.read_parquet(unscaled_val_x_path)
    
    return {
        "problem_id": problem_id,
        "is_solar": problem_id in ["S1", "S24"],
        "target_col": config.PROBLEMS[problem_id]["target"],
        "horizon": config.PROBLEMS[problem_id]["horizon_hours"],
        "X_train": X_train,
        "y_train": y_train,
        "X_val": X_val,
        "y_val": y_val,
        "X_unscaled_val": X_unscaled_val,
        "feature_names": list(X_train.columns),
        "solar_elevation_val": X_unscaled_val.get("solar_elevation_deg", None),
        "is_daylight_val": X_unscaled_val.get("is_daylight", None),
    }

def get_ml_model(model_name: str, **kwargs) -> Any:
    """Instantiate classical machine learning estimators with reproducible seeds."""
    m_name = model_name.lower().replace("_", "")
    seed = config.RANDOM_SEED
    
    if m_name in ["randomforest", "rf"]:
        return RandomForestRegressor(
            n_estimators=kwargs.get("n_estimators", 100),
            max_depth=kwargs.get("max_depth", 15),
            min_samples_leaf=kwargs.get("min_samples_leaf", 2),
            n_jobs=kwargs.get("n_jobs", -1),
            random_state=seed,
        )
    elif m_name in ["xgboost", "xgb"]:
        return XGBRegressor(
            n_estimators=kwargs.get("n_estimators", 150),
            max_depth=kwargs.get("max_depth", 6),
            learning_rate=kwargs.get("learning_rate", 0.08),
            subsample=kwargs.get("subsample", 0.85),
            colsample_bytree=kwargs.get("colsample_bytree", 0.85),
            n_jobs=kwargs.get("n_jobs", -1),
            random_state=seed,
        )
    elif m_name in ["lightgbm", "lgb", "lgbm"]:
        return LGBMRegressor(
            n_estimators=kwargs.get("n_estimators", 150),
            max_depth=kwargs.get("max_depth", 6),
            num_leaves=kwargs.get("num_leaves", 31),
            learning_rate=kwargs.get("learning_rate", 0.08),
            subsample=kwargs.get("subsample", 0.85),
            colsample_bytree=kwargs.get("colsample_bytree", 0.85),
            n_jobs=kwargs.get("n_jobs", -1),
            random_state=seed,
            verbose=-1,
        )
    elif m_name in ["catboost", "cb"]:
        return CatBoostRegressor(
            iterations=kwargs.get("iterations", 200),
            depth=kwargs.get("depth", 6),
            learning_rate=kwargs.get("learning_rate", 0.08),
            random_seed=seed,
            verbose=0,
        )
    elif m_name in ["extratrees", "et"]:
        return ExtraTreesRegressor(
            n_estimators=kwargs.get("n_estimators", 100),
            max_depth=kwargs.get("max_depth", 15),
            min_samples_leaf=kwargs.get("min_samples_leaf", 2),
            n_jobs=kwargs.get("n_jobs", -1),
            random_state=seed,
        )
    elif m_name in ["histgradientboosting", "histgb", "hgb"]:
        return HistGradientBoostingRegressor(
            max_iter=kwargs.get("max_iter", 150),
            max_depth=kwargs.get("max_depth", 8),
            learning_rate=kwargs.get("learning_rate", 0.08),
            random_state=seed,
        )
    elif m_name in ["gradientboosting", "gb", "gbr"]:
        return GradientBoostingRegressor(
            n_estimators=kwargs.get("n_estimators", 100),
            max_depth=kwargs.get("max_depth", 5),
            learning_rate=kwargs.get("learning_rate", 0.08),
            random_state=seed,
        )
    elif m_name == "mlp":
        return MLPRegressor(
            hidden_layer_sizes=kwargs.get("hidden_layer_sizes", (128, 64)),
            activation="relu",
            max_iter=kwargs.get("max_iter", 200),
            early_stopping=True,
            n_iter_no_change=10,
            random_state=seed,
        )
    elif m_name == "svr":
        return SVR(
            C=kwargs.get("C", 10.0),
            epsilon=kwargs.get("epsilon", 0.1),
        )
    elif m_name == "knn":
        return KNeighborsRegressor(
            n_neighbors=kwargs.get("n_neighbors", 7),
            weights="distance",
            n_jobs=kwargs.get("n_jobs", -1),
        )
    else:
        raise ValueError(f"Unknown ML model name: {model_name}")

def train_and_eval_ml_model(
    model_name: str,
    problem_id: str,
    model_kwargs: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Train a classic ML model, evaluate on validation set, and return results."""
    clean_name = model_name.lower().replace("_", "")
    use_scaled = clean_name in MODELS_REQUIRING_SCALED_DATA
    
    data = load_problem_data_ml(problem_id, use_scaled=use_scaled)
    model = get_ml_model(model_name, **(model_kwargs or {}))
    
    # SVR has O(N^2) complexity: on 33k rows, subsample recent 10,000 training hours for high speed
    if clean_name == "svr":
        print(f"\nTraining SVR on {problem_id} (using recent 10,000 training hours for computational efficiency)...")
        X_tr = data["X_train"].iloc[-10000:]
        y_tr = data["y_train"].iloc[-10000:]
    else:
        print(f"\nTraining {model_name.upper()} on {problem_id} ({len(data['feature_names'])} features, {data['X_train'].shape[0]} rows)...")
        X_tr = data["X_train"]
        y_tr = data["y_train"]
        
    model.fit(X_tr, y_tr)
    
    # Predict on validation set
    raw_preds = model.predict(data["X_val"])
    
    # Physical bounds clipping
    elevation = data["solar_elevation_val"].values if data["solar_elevation_val"] is not None else None
    preds = clip_predictions(
        raw_preds,
        is_solar=data["is_solar"],
        elevation=elevation,
        max_capacity=config.PLANT_CAPACITY_MW
    )
    
    # Compute metrics
    base_rmse = REFERENCE_PERSISTENCE_RMSE.get(problem_id, None)
    daylight_mask = data["is_daylight_val"].values if data["is_daylight_val"] is not None else None
    
    metrics = compute_all_metrics(
        y_true=data["y_val"].values,
        y_pred=preds,
        problem_id=problem_id,
        baseline_rmse=base_rmse,
        daylight_mask=daylight_mask
    )
    
    # Save trained model artifact
    model_save_path = config.RESULTS_MODELS_DIR / f"{model_name}_{problem_id}.joblib"
    joblib.dump(model, model_save_path)
    print(f"Saved model artifact: {model_save_path}")
    
    return {
        "model_name": model_name,
        "problem_id": problem_id,
        "model": model,
        "metrics": metrics,
        "y_true": data["y_val"],
        "y_pred": pd.Series(preds, index=data["y_val"].index, name=f"{model_name}_pred"),
        "feature_names": data["feature_names"],
        "is_solar": data["is_solar"],
    }

def plot_ml_diagnostics(
    res: Dict[str, Any],
    sample_start: str = "2025-06-01 00:00:00",
    sample_end: str = "2025-06-07 23:00:00"
) -> List[Path]:
    """Generate the required 5 diagnostic visualizations and save to results/figures/."""
    model_name = res["model_name"]
    problem_id = res["problem_id"]
    y_true = res["y_true"]
    y_pred = res["y_pred"]
    residuals = y_true - y_pred
    unit = "MW"
    
    saved_paths = []
    sns.set_theme(style="darkgrid")
    
    # 1. Actual vs Predicted (Full Validation Scatter & 1-Week Time Series)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    
    ax1.scatter(y_true, y_pred, alpha=0.25, color="#1e88e5", s=10)
    min_val = min(y_true.min(), y_pred.min())
    max_val = max(y_true.max(), y_pred.max())
    ax1.plot([min_val, max_val], [min_val, max_val], "r--", linewidth=1.5, label="1:1 Perfect Forecast")
    ax1.set_xlabel(f"Actual ({unit})", fontsize=11, fontweight="bold")
    ax1.set_ylabel(f"Predicted ({unit})", fontsize=11, fontweight="bold")
    ax1.set_title(f"{model_name.upper()} ({problem_id}): Actual vs Predicted (Val 2025)\nR² = {res['metrics']['r2']:.4f}", fontsize=12)
    ax1.legend()
    
    idx_mask = (y_true.index >= sample_start) & (y_true.index <= sample_end)
    if idx_mask.sum() > 0:
        ax2.plot(y_true.index[idx_mask], y_true[idx_mask], label="Actual", color="#222222", linewidth=1.8)
        ax2.plot(y_true.index[idx_mask], y_pred[idx_mask], label=f"{model_name.upper()} Forecast", color="#00e676", linewidth=1.8, linestyle="--")
        ax2.set_title(f"1-Week Detailed Profile ({sample_start[:10]} to {sample_end[:10]})", fontsize=12)
        ax2.set_ylabel(f"Power ({unit})", fontsize=11, fontweight="bold")
        ax2.tick_params(axis="x", rotation=30)
        ax2.legend()
    
    plt.tight_layout()
    fig1_path = config.RESULTS_FIGURES_DIR / f"{model_name}_{problem_id}_actual_vs_predicted.png"
    plt.savefig(fig1_path, dpi=200)
    plt.close()
    saved_paths.append(fig1_path)
    
    # 2. Residual Plot & Prediction Error Distribution
    fig, (ax3, ax4) = plt.subplots(1, 2, figsize=(16, 5))
    
    ax3.scatter(y_pred, residuals, alpha=0.25, color="#d81b60", s=10)
    ax3.axhline(0, color="black", linestyle="--", linewidth=1.2)
    ax3.set_xlabel(f"Predicted ({unit})", fontsize=11, fontweight="bold")
    ax3.set_ylabel(f"Residual [Actual - Predicted] ({unit})", fontsize=11, fontweight="bold")
    ax3.set_title(f"{model_name.upper()} ({problem_id}): Residuals vs Predicted", fontsize=12)
    
    sns.histplot(residuals, kde=True, ax=ax4, color="#8e24aa", bins=50)
    ax4.axvline(0, color="red", linestyle="--", label="Zero Error")
    ax4.axvline(res['metrics']['mbe'], color="orange", linestyle=":", label=f"Mean Bias ({res['metrics']['mbe']:.1f} MW)")
    ax4.set_xlabel(f"Prediction Error ({unit})", fontsize=11, fontweight="bold")
    ax4.set_title(f"{model_name.upper()} ({problem_id}): Error Distribution (RMSE: {res['metrics']['rmse']:.1f} MW)", fontsize=12)
    ax4.legend()
    
    plt.tight_layout()
    fig2_path = config.RESULTS_FIGURES_DIR / f"{model_name}_{problem_id}_residuals_distribution.png"
    plt.savefig(fig2_path, dpi=200)
    plt.close()
    saved_paths.append(fig2_path)
    
    # 3. Feature Importance Plot (for Tree Models)
    model = res.get("model")
    importances = None
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    elif hasattr(model, "get_feature_importance"):
        importances = model.get_feature_importance()
        
    if importances is not None and len(importances) == len(res["feature_names"]):
        imp_df = pd.DataFrame({
            "feature": res["feature_names"],
            "importance": importances
        }).sort_values(by="importance", ascending=False).head(20)
        
        plt.figure(figsize=(12, 7))
        sns.barplot(x="importance", y="feature", data=imp_df, palette="viridis")
        plt.title(f"{model_name.upper()} ({problem_id}): Top 20 Feature Importances", fontsize=13, fontweight="bold")
        plt.xlabel("Importance Score", fontsize=11, fontweight="bold")
        plt.ylabel("Feature", fontsize=11)
        plt.tight_layout()
        
        fig3_path = config.RESULTS_FIGURES_DIR / f"{model_name}_{problem_id}_feature_importance.png"
        plt.savefig(fig3_path, dpi=200)
        plt.close()
        saved_paths.append(fig3_path)
        
    return saved_paths

def save_and_record_ml_results(all_results: List[Dict[str, Any]], model_name: str) -> pd.DataFrame:
    """Save consolidated validation predictions and metrics for the ML model."""
    pred_dict = {}
    rows = []
    
    for r in all_results:
        p_id = r["problem_id"]
        pred_dict[f"{p_id}_actual"] = r["y_true"].values
        pred_dict[f"{p_id}_{model_name}"] = r["y_pred"].values
        
        m = r["metrics"]
        rows.append({
            "model": model_name,
            "problem": p_id,
            "target": config.PROBLEMS[p_id]["target"],
            "horizon": f"{config.PROBLEMS[p_id]['horizon_hours']}h",
            "rmse": round(m["rmse"], 2),
            "mae": round(m["mae"], 2),
            "nmae_pct": round(m["nmae_pct"], 2),
            "mape_pct": round(m["mape_pct"], 2) if not np.isnan(m["mape_pct"]) else None,
            "smape_pct": round(m["smape_pct"], 2),
            "r2": round(m["r2"], 4),
            "mbe": round(m["mbe"], 2),
            "skill_vs_persistence": round(m["skill_vs_persistence"], 2),
            "daylight_rmse": round(m["daylight_rmse"], 2) if "daylight_rmse" in m else None,
            "daylight_mae": round(m["daylight_mae"], 2) if "daylight_mae" in m else None,
            "daylight_nmae_pct": round(m["daylight_nmae_pct"], 2) if "daylight_nmae_pct" in m else None,
        })
        
    # Save predictions parquet
    pred_df = pd.DataFrame(pred_dict, index=all_results[0]["y_true"].index)
    pred_path = config.RESULTS_PREDICTIONS_DIR / f"{model_name}_val_predictions.parquet"
    pred_df.to_parquet(pred_path)
    print(f"\nSaved validation predictions to: {pred_path}")
    
    # Save metrics CSV & Markdown
    metrics_df = pd.DataFrame(rows)
    csv_path = config.RESULTS_TABLES_DIR / f"{model_name}_val_metrics.csv"
    metrics_df.to_csv(csv_path, index=False)
    print(f"Saved validation metrics table to: {csv_path}")
    
    # Append or update master classic_ml_results table
    master_csv = config.RESULTS_TABLES_DIR / "classic_ml_results.csv"
    if master_csv.exists():
        existing_df = pd.read_csv(master_csv)
        existing_df = existing_df[existing_df["model"] != model_name]
        combined_df = pd.concat([existing_df, metrics_df], ignore_index=True)
    else:
        combined_df = metrics_df
    combined_df.to_csv(master_csv, index=False)
    combined_df.to_markdown(config.RESULTS_TABLES_DIR / "classic_ml_results.md", index=False)
    
    return metrics_df

