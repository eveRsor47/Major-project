"""Statistical and Linear Models Execution Module for Pavagada Solar + Demand Forecasting.

Centralizes data loading, training, prediction, metric computation, visualization,
and artifact persistence for all Milestone M6a models:
- Linear Regression (OLS)
- Ridge Regression
- Lasso Regression
- ElasticNet
- Huber Regressor
- SARIMAX
- Prophet
- RANSAC Regressor
- Holt-Winters Exponential Smoothing
"""

from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.linear_model import (
    LinearRegression,
    Ridge,
    Lasso,
    ElasticNet,
    HuberRegressor,
    RANSACRegressor
)
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from src import config
from src.metrics import compute_all_metrics, clip_predictions

# Reference Persistence RMSE values from Milestone M5 for Skill Score calculation
REFERENCE_PERSISTENCE_RMSE: Dict[str, float] = {
    "S1": 211.06,    # persistence_t1
    "S24": 212.21,   # persistence_t24
    "D1": 669.96,    # persistence_t1
    "D24": 771.30,   # persistence_t24
}

def load_problem_data(problem_id: str, use_scaled: bool = True) -> Dict[str, Any]:
    """Load processed M4 parquet files for a given problem with zero leakage.
    
    Prints exact dataset paths, sample counts, and verified split ranges.
    """
    scale_suffix = "_scaled" if use_scaled else ""
    
    train_x_path = config.PROCESSED_DATA_DIR / f"X_train_{problem_id}{scale_suffix}.parquet"
    train_y_path = config.PROCESSED_DATA_DIR / f"y_train_{problem_id}.parquet"
    val_x_path = config.PROCESSED_DATA_DIR / f"X_val_{problem_id}{scale_suffix}.parquet"
    val_y_path = config.PROCESSED_DATA_DIR / f"y_val_{problem_id}.parquet"
    test_x_path = config.PROCESSED_DATA_DIR / f"X_test_{problem_id}{scale_suffix}.parquet"
    test_y_path = config.PROCESSED_DATA_DIR / f"y_test_{problem_id}.parquet"
    
    # Also load unscaled validation X to obtain physical solar elevation for solar clipping
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
    
    print(f"Loaded Train: {X_train.shape[0]:,} rows ({X_train.index.min()} to {X_train.index.max()})")
    print(f"Loaded Val:   {X_val.shape[0]:,} rows ({X_val.index.min()} to {X_val.index.max()})")
    print(f"Test Available: {test_x_path.name} ({X_val.shape[1]} features, strictly quarantined)")
    
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

def get_linear_model(model_name: str, **kwargs) -> Any:
    """Instantiate standard linear models with reproducible seeds."""
    m_name = model_name.lower()
    seed = config.RANDOM_SEED
    
    if m_name == "linear":
        return LinearRegression(**kwargs)
    elif m_name == "ridge":
        return Ridge(alpha=kwargs.get("alpha", 10.0), random_state=seed)
    elif m_name == "lasso":
        return Lasso(alpha=kwargs.get("alpha", 0.5), max_iter=kwargs.get("max_iter", 5000), random_state=seed)
    elif m_name == "elasticnet":
        return ElasticNet(
            alpha=kwargs.get("alpha", 0.5),
            l1_ratio=kwargs.get("l1_ratio", 0.5),
            max_iter=kwargs.get("max_iter", 5000),
            random_state=seed
        )
    elif m_name == "huber":
        return HuberRegressor(
            epsilon=kwargs.get("epsilon", 1.35),
            max_iter=kwargs.get("max_iter", 1000)
        )
    elif m_name == "ransac":
        base_estimator = Ridge(alpha=10.0, random_state=seed)
        return RANSACRegressor(
            estimator=base_estimator,
            min_samples=kwargs.get("min_samples", 0.7),
            random_state=seed
        )
    else:
        raise ValueError(f"Unknown linear model name: {model_name}")

def train_and_eval_linear_model(
    model_name: str,
    problem_id: str,
    model_kwargs: Optional[Dict[str, Any]] = None,
    use_scaled: bool = True
) -> Dict[str, Any]:
    """Train a linear regression variant, evaluate on validation set, and return results."""
    data = load_problem_data(problem_id, use_scaled=use_scaled)
    model = get_linear_model(model_name, **(model_kwargs or {}))
    
    print(f"\nTraining {model_name.upper()} on {problem_id} ({len(data['feature_names'])} features)...")
    model.fit(data["X_train"], data["y_train"])
    
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

def plot_model_diagnostics(
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
    is_solar = res["is_solar"]
    unit = "MW"
    
    saved_paths = []
    sns.set_theme(style="darkgrid")
    
    # 1. Actual vs Predicted (Full Validation Scatter & 1-Week Time Series)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    
    # Scatter plot
    ax1.scatter(y_true, y_pred, alpha=0.25, color="#007acc", s=10)
    min_val = min(y_true.min(), y_pred.min())
    max_val = max(y_true.max(), y_pred.max())
    ax1.plot([min_val, max_val], [min_val, max_val], "r--", linewidth=1.5, label="1:1 Perfect Forecast")
    ax1.set_xlabel(f"Actual ({unit})", fontsize=11, fontweight="bold")
    ax1.set_ylabel(f"Predicted ({unit})", fontsize=11, fontweight="bold")
    ax1.set_title(f"{model_name.upper()} ({problem_id}): Actual vs Predicted (Val 2025)\nR² = {res['metrics']['r2']:.4f}", fontsize=12)
    ax1.legend()
    
    # 1-Week Zoom plot
    idx_mask = (y_true.index >= sample_start) & (y_true.index <= sample_end)
    if idx_mask.sum() > 0:
        ax2.plot(y_true.index[idx_mask], y_true[idx_mask], label="Actual", color="#222222", linewidth=1.8)
        ax2.plot(y_true.index[idx_mask], y_pred[idx_mask], label=f"{model_name.upper()} Forecast", color="#00bcd4", linewidth=1.8, linestyle="--")
        ax2.set_title(f"1-Week Detailed Profile ({sample_start[:10]} to {sample_end[:10]})", fontsize=12)
        ax2.set_ylabel(f"Power ({unit})", fontsize=11, fontweight="bold")
        ax2.tick_params(axis="x", rotation=30)
        ax2.legend()
    
    plt.tight_layout()
    fig1_path = config.FIGURES_LINEAR_DIR / f"{model_name}_{problem_id}_actual_vs_predicted.png"
    plt.savefig(fig1_path, dpi=200)
    plt.close()
    saved_paths.append(fig1_path)
    
    # 2. Residual Plot & Prediction Error Distribution
    fig, (ax3, ax4) = plt.subplots(1, 2, figsize=(16, 5))
    
    # Residuals vs Predicted
    ax3.scatter(y_pred, residuals, alpha=0.25, color="#e91e63", s=10)
    ax3.axhline(0, color="black", linestyle="--", linewidth=1.2)
    ax3.set_xlabel(f"Predicted ({unit})", fontsize=11, fontweight="bold")
    ax3.set_ylabel(f"Residual [Actual - Predicted] ({unit})", fontsize=11, fontweight="bold")
    ax3.set_title(f"{model_name.upper()} ({problem_id}): Residuals vs Predicted", fontsize=12)
    
    # Error Histogram & KDE
    sns.histplot(residuals, kde=True, ax=ax4, color="#9c27b0", bins=50)
    ax4.axvline(0, color="red", linestyle="--", label="Zero Error")
    ax4.axvline(res['metrics']['mbe'], color="orange", linestyle=":", label=f"Mean Bias ({res['metrics']['mbe']:.1f} MW)")
    ax4.set_xlabel(f"Prediction Error ({unit})", fontsize=11, fontweight="bold")
    ax4.set_title(f"{model_name.upper()} ({problem_id}): Error Distribution (RMSE: {res['metrics']['rmse']:.1f} MW)", fontsize=12)
    ax4.legend()
    
    plt.tight_layout()
    fig2_path = config.FIGURES_LINEAR_DIR / f"{model_name}_{problem_id}_residuals_distribution.png"
    plt.savefig(fig2_path, dpi=200)
    plt.close()
    saved_paths.append(fig2_path)
    
    # 3. Coefficient Plot (Feature Weights for Linear Models)
    model = res.get("model")
    if hasattr(model, "coef_"):
        coefs = model.coef_
        if hasattr(model, "estimator_") and hasattr(model.estimator_, "coef_"):
            coefs = model.estimator_.coef_
            
        if coefs is not None and len(coefs) == len(res["feature_names"]):
            coef_df = pd.DataFrame({
                "feature": res["feature_names"],
                "coefficient": coefs
            }).sort_values(by="coefficient", key=abs, ascending=False).head(20)
            
            plt.figure(figsize=(12, 7))
            colors = ["#2e7d32" if c > 0 else "#c62828" for c in coef_df["coefficient"]]
            sns.barplot(x="coefficient", y="feature", data=coef_df, palette=colors)
            plt.title(f"{model_name.upper()} ({problem_id}): Top 20 Feature Coefficients (Standardized Scale)", fontsize=13, fontweight="bold")
            plt.xlabel("Coefficient Magnitude", fontsize=11, fontweight="bold")
            plt.ylabel("Feature", fontsize=11)
            plt.tight_layout()
            
            fig3_path = config.FIGURES_LINEAR_DIR / f"{model_name}_{problem_id}_coefficients.png"
            plt.savefig(fig3_path, dpi=200)
            plt.close()
            saved_paths.append(fig3_path)
    
    return saved_paths

def save_and_record_results(all_results: List[Dict[str, Any]], model_name: str) -> pd.DataFrame:
    """Save consolidated validation predictions and metrics for the model."""
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
    
    # Append or update master linear_stat_results table
    master_csv = config.RESULTS_TABLES_DIR / "linear_stat_results.csv"
    if master_csv.exists():
        existing_df = pd.read_csv(master_csv)
        # Drop prior runs of this exact model
        existing_df = existing_df[existing_df["model"] != model_name]
        combined_df = pd.concat([existing_df, metrics_df], ignore_index=True)
    else:
        combined_df = metrics_df
    combined_df.to_csv(master_csv, index=False)
    combined_df.to_markdown(config.RESULTS_TABLES_DIR / "linear_stat_results.md", index=False)
    
    return metrics_df

def train_and_eval_sarimax(
    problem_id: str,
    train_window: int = 8760,
    order: Tuple[int, int, int] = (1, 0, 1),
) -> Dict[str, Any]:
    """Train SARIMAX with key exogenous features on problem."""
    model_name = "sarimax"
    data = load_problem_data(problem_id, use_scaled=False)
    
    # Select key exogenous drivers
    if data["is_solar"]:
        exog_cols = [c for c in ["poa_irradiance_wm2", "temperature_2m_c", "clearsky_ghi_wm2", "hour_sin", "hour_cos"] if c in data["X_train"].columns]
    else:
        exog_cols = [c for c in ["temperature_2m_c", "relative_humidity_pct", "hour_sin", "hour_cos", "is_weekend"] if c in data["X_train"].columns]
        
    print(f"\nTraining SARIMAX on {problem_id} (order={order}, {len(exog_cols)} exogenous variables)...")
    
    y_train_sub = data["y_train"].iloc[-train_window:]
    X_train_sub = data["X_train"][exog_cols].iloc[-train_window:]
    X_val_exog = data["X_val"][exog_cols]
    
    model = SARIMAX(
        endog=y_train_sub.values,
        exog=X_train_sub.values,
        order=order,
        enforce_stationarity=False,
        enforce_invertibility=False
    )
    fitted = model.fit(disp=False, maxiter=50)
    
    raw_preds = fitted.forecast(steps=len(data["y_val"]), exog=X_val_exog.values)
    
    elevation = data["solar_elevation_val"].values if data["solar_elevation_val"] is not None else None
    preds = clip_predictions(
        raw_preds,
        is_solar=data["is_solar"],
        elevation=elevation,
        max_capacity=config.PLANT_CAPACITY_MW
    )
    
    base_rmse = REFERENCE_PERSISTENCE_RMSE.get(problem_id, None)
    daylight_mask = data["is_daylight_val"].values if data["is_daylight_val"] is not None else None
    
    metrics = compute_all_metrics(
        y_true=data["y_val"].values,
        y_pred=preds,
        problem_id=problem_id,
        baseline_rmse=base_rmse,
        daylight_mask=daylight_mask
    )
    
    model_save_path = config.RESULTS_MODELS_DIR / f"{model_name}_{problem_id}.joblib"
    joblib.dump(fitted, model_save_path)
    print(f"Saved SARIMAX artifact: {model_save_path}")
    
    return {
        "model_name": model_name,
        "problem_id": problem_id,
        "model": fitted,
        "metrics": metrics,
        "y_true": data["y_val"],
        "y_pred": pd.Series(preds, index=data["y_val"].index, name=f"{model_name}_pred"),
        "feature_names": exog_cols,
        "is_solar": data["is_solar"],
    }

def train_and_eval_prophet(
    problem_id: str,
    train_window: int = 8760,
) -> Dict[str, Any]:
    """Train Facebook Prophet with holiday components and exogenous weather features."""
    from prophet import Prophet
    model_name = "prophet"
    data = load_problem_data(problem_id, use_scaled=False)
    
    if data["is_solar"]:
        exog_cols = [c for c in ["poa_irradiance_wm2", "temperature_2m_c", "clearsky_ghi_wm2"] if c in data["X_train"].columns]
    else:
        exog_cols = [c for c in ["temperature_2m_c", "relative_humidity_pct"] if c in data["X_train"].columns]
        
    print(f"\nTraining PROPHET on {problem_id} ({len(exog_cols)} exogenous regressors)...")
    
    y_train_sub = data["y_train"].iloc[-train_window:]
    X_train_sub = data["X_train"][exog_cols].iloc[-train_window:]
    
    df_prophet_train = pd.DataFrame({
        "ds": pd.to_datetime(y_train_sub.index),
        "y": y_train_sub.values
    })
    for col in exog_cols:
        df_prophet_train[col] = X_train_sub[col].values
        
    m = Prophet(
        growth="linear",
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=True,
    )
    for col in exog_cols:
        m.add_regressor(col)
        
    m.fit(df_prophet_train)
    
    df_prophet_val = pd.DataFrame({
        "ds": pd.to_datetime(data["y_val"].index)
    })
    for col in exog_cols:
        df_prophet_val[col] = data["X_val"][col].values
        
    forecast = m.predict(df_prophet_val)
    raw_preds = forecast["yhat"].values
    
    elevation = data["solar_elevation_val"].values if data["solar_elevation_val"] is not None else None
    preds = clip_predictions(
        raw_preds,
        is_solar=data["is_solar"],
        elevation=elevation,
        max_capacity=config.PLANT_CAPACITY_MW
    )
    
    base_rmse = REFERENCE_PERSISTENCE_RMSE.get(problem_id, None)
    daylight_mask = data["is_daylight_val"].values if data["is_daylight_val"] is not None else None
    
    metrics = compute_all_metrics(
        y_true=data["y_val"].values,
        y_pred=preds,
        problem_id=problem_id,
        baseline_rmse=base_rmse,
        daylight_mask=daylight_mask
    )
    
    model_save_path = config.RESULTS_MODELS_DIR / f"{model_name}_{problem_id}.joblib"
    joblib.dump(m, model_save_path)
    print(f"Saved Prophet artifact: {model_save_path}")
    
    return {
        "model_name": model_name,
        "problem_id": problem_id,
        "model": m,
        "metrics": metrics,
        "y_true": data["y_val"],
        "y_pred": pd.Series(preds, index=data["y_val"].index, name=f"{model_name}_pred"),
        "feature_names": exog_cols,
        "is_solar": data["is_solar"],
    }

def train_and_eval_holtwinters(
    problem_id: str,
    train_window: int = 8760,
    seasonal_periods: int = 24,
) -> Dict[str, Any]:
    """Train Holt-Winters Triple Exponential Smoothing with 24h diurnal seasonality."""
    model_name = "holt_winters"
    data = load_problem_data(problem_id, use_scaled=False)
    
    print(f"\nTraining HOLT-WINTERS on {problem_id} (seasonal_periods={seasonal_periods})...")
    
    y_train_sub = data["y_train"].iloc[-train_window:]
    
    # Fit additive trend and seasonal components
    hw = ExponentialSmoothing(
        y_train_sub.values,
        seasonal_periods=seasonal_periods,
        trend="add",
        seasonal="add",
        initialization_method="estimated"
    ).fit()
    
    # To forecast validation: repeat 24-hour seasonal pattern + trend projection
    # For day-ahead/hourly time-series, Holt-Winters produces recursive forecast
    raw_preds = hw.forecast(len(data["y_val"]))
    
    elevation = data["solar_elevation_val"].values if data["solar_elevation_val"] is not None else None
    preds = clip_predictions(
        raw_preds,
        is_solar=data["is_solar"],
        elevation=elevation,
        max_capacity=config.PLANT_CAPACITY_MW
    )
    
    base_rmse = REFERENCE_PERSISTENCE_RMSE.get(problem_id, None)
    daylight_mask = data["is_daylight_val"].values if data["is_daylight_val"] is not None else None
    
    metrics = compute_all_metrics(
        y_true=data["y_val"].values,
        y_pred=preds,
        problem_id=problem_id,
        baseline_rmse=base_rmse,
        daylight_mask=daylight_mask
    )
    
    model_save_path = config.RESULTS_MODELS_DIR / f"{model_name}_{problem_id}.joblib"
    joblib.dump(hw, model_save_path)
    print(f"Saved Holt-Winters artifact: {model_save_path}")
    
    return {
        "model_name": model_name,
        "problem_id": problem_id,
        "model": hw,
        "metrics": metrics,
        "y_true": data["y_val"],
        "y_pred": pd.Series(preds, index=data["y_val"].index, name=f"{model_name}_pred"),
        "feature_names": ["lag_diurnal_24h"],
        "is_solar": data["is_solar"],
    }

