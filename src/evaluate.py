from pathlib import Path
from typing import Dict, Tuple, Any, List, Optional
import numpy as np
import pandas as pd

from src import config
from src.metrics import compute_all_metrics, clip_predictions

def generate_baseline_predictions(
    X_train_raw: pd.DataFrame,
    y_train: pd.Series,
    X_val_raw: pd.DataFrame,
    y_val: pd.Series,
    problem_id: str
) -> Dict[str, np.ndarray]:
    is_solar = problem_id in ["S1", "S24"]
    horizon = config.PROBLEMS[problem_id]["horizon_hours"]
    elev = X_val_raw["solar_elevation_deg"].values if is_solar else None
    
    preds: Dict[str, np.ndarray] = {}
    
    # 1. Persistence t-1 (1-hour ahead only)
    if horizon == 1:
        if is_solar:
            preds["persistence_t1"] = X_val_raw["solar_power_mw_lag1"].values
        else:
            preds["persistence_t1"] = X_val_raw["demand_mw_lag1"].values
            
    # 2. Persistence t-24 (same hour yesterday)
    if is_solar:
        preds["persistence_t24"] = X_val_raw["solar_power_mw_lag24"].values
    else:
        preds["persistence_t24"] = X_val_raw["demand_mw_lag24"].values
        
    # 3. Persistence t-168 (same hour last week / seasonal naive)
    if is_solar:
        preds["persistence_t168"] = X_val_raw["solar_power_mw_lag168"].values
    else:
        preds["persistence_t168"] = X_val_raw["demand_mw_lag168"].values
        
    # 4. Clear-Sky Model (solar only)
    if is_solar:
        cs_tr = X_train_raw["clearsky_ghi_wm2"].values
        cs_slope = float(np.sum(cs_tr * y_train.values) / np.maximum(np.sum(cs_tr**2), 1e-6))
        preds["clearsky"] = cs_slope * X_val_raw["clearsky_ghi_wm2"].values
        
    # 5. Smart Persistence (solar only)
    if is_solar:
        cs_v = X_val_raw["clearsky_ghi_wm2"].values
        if horizon == 1:
            ratio = np.where(cs_v > 50.0, X_val_raw["solar_power_mw_lag1"].values / np.maximum(cs_v, 1.0), 0.0)
        else:
            ratio = np.where(cs_v > 50.0, X_val_raw["solar_power_mw_lag24"].values / np.maximum(cs_v, 1.0), 0.0)
        ratio = np.clip(ratio, 0.0, 3.0)
        preds["smart_persistence"] = ratio * cs_v

    # 6. Mean of t-24 and t-168 (demand only)
    if not is_solar:
        preds["mean_t24_t168"] = 0.5 * (X_val_raw["demand_mw_lag24"].values + X_val_raw["demand_mw_lag168"].values)
        
    # Clip all predictions using physical limits
    for k in preds:
        preds[k] = clip_predictions(preds[k], is_solar=is_solar, elevation=elev, max_capacity=config.PLANT_CAPACITY_MW)
        
    return preds

def run_all_baselines(
    output_csv: Path = config.RESULTS_TABLES_DIR / "baselines.csv"
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    all_metrics: List[Dict[str, Any]] = []
    all_preds = pd.DataFrame()
    
    for pid in ["S1", "S24", "D1", "D24"]:
        is_solar = pid in ["S1", "S24"]
        horizon = config.PROBLEMS[pid]["horizon_hours"]
        
        X_tr_raw = pd.read_parquet(config.PROCESSED_DATA_DIR / f"X_train_{pid}.parquet")
        y_tr = pd.read_parquet(config.PROCESSED_DATA_DIR / f"y_train_{pid}.parquet").iloc[:, 0]
        X_v_raw = pd.read_parquet(config.PROCESSED_DATA_DIR / f"X_val_{pid}.parquet")
        y_v = pd.read_parquet(config.PROCESSED_DATA_DIR / f"y_val_{pid}.parquet").iloc[:, 0]
        
        elev = X_v_raw["solar_elevation_deg"].values if is_solar else None
        daylight_mask = (elev > 0) if is_solar else None
        
        # Generate baseline predictions
        preds = generate_baseline_predictions(X_tr_raw, y_tr, X_v_raw, y_v, pid)
        
        # Reference persistence for skill score
        ref_name = "persistence_t1" if horizon == 1 else "persistence_t24"
        ref_pred = preds[ref_name]
        ref_rmse = compute_all_metrics(y_v.values, ref_pred, pid)["rmse"]
        
        for bname, p in preds.items():
            all_preds[f"{pid}_{bname}"] = p
            m = compute_all_metrics(y_v.values, p, pid, baseline_rmse=ref_rmse, daylight_mask=daylight_mask)
            row = {
                "problem": pid,
                "target": config.PROBLEMS[pid]["target"],
                "horizon": f"{horizon}h",
                "baseline": bname,
                **m
            }
            all_metrics.append(row)

    all_preds["timestamp_ist"] = y_v.index
    all_preds.set_index("timestamp_ist", inplace=True)
    all_preds.to_parquet(config.RESULTS_PREDICTIONS_DIR / "baseline_val_predictions.parquet")
    
    metrics_df = pd.DataFrame(all_metrics)
    
    # Clean rounding for presentation
    float_cols = ["rmse", "mae", "nmae_pct", "mape_pct", "smape_pct", "r2", "mbe", "skill_vs_persistence", "daylight_rmse", "daylight_mae", "daylight_nmae_pct"]
    for col in float_cols:
        if col in metrics_df.columns:
            if col == "r2":
                metrics_df[col] = metrics_df[col].round(4)
            else:
                metrics_df[col] = metrics_df[col].round(2)

    metrics_df.to_csv(output_csv, index=False)
    metrics_df.to_markdown(output_csv.with_suffix(".md"), index=False)
    
    return metrics_df, all_preds
