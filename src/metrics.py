from typing import Dict, Optional, Any, List
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

from src import config

def compute_all_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    problem_id: str,
    baseline_rmse: Optional[float] = None,
    daylight_mask: Optional[np.ndarray] = None
) -> Dict[str, float]:
    y_t = np.asarray(y_true, dtype=float).ravel()
    y_p = np.asarray(y_pred, dtype=float).ravel()
    is_solar = problem_id in ["S1", "S24"]
    
    # 1. Standard Regression Metrics
    rmse = float(np.sqrt(mean_squared_error(y_t, y_p)))
    mae = float(mean_absolute_error(y_t, y_p))
    r2 = float(r2_score(y_t, y_p))
    mbe = float(np.mean(y_p - y_t))
    
    # 2. Normalized MAE (nMAE)
    if is_solar:
        # nMAE by rated plant capacity (2,050 MW)
        nmae = float(mae / config.PLANT_CAPACITY_MW * 100.0)
    else:
        # nMAE by mean demand
        mean_dem = float(np.mean(y_t))
        nmae = float(mae / mean_dem * 100.0) if mean_dem > 0 else 0.0

    # 3. MAPE & sMAPE
    # MAPE only for demand (never for solar, as night division explodes)
    if not is_solar:
        non_zero = y_t > 0
        mape = float(np.mean(np.abs((y_t[non_zero] - y_p[non_zero]) / y_t[non_zero])) * 100.0)
    else:
        mape = float("nan")

    # sMAPE: symmetric MAPE
    denom_smape = (np.abs(y_t) + np.abs(y_p)) / 2.0
    valid_smape = denom_smape > 1e-4
    if np.sum(valid_smape) > 0:
        smape = float(np.mean(np.abs(y_t[valid_smape] - y_p[valid_smape]) / denom_smape[valid_smape]) * 100.0)
    else:
        smape = 0.0

    # 4. Skill Score vs Reference Persistence
    skill_score = 0.0
    if baseline_rmse is not None and baseline_rmse > 0:
        skill_score = float((1.0 - (rmse / baseline_rmse)) * 100.0)

    out = {
        "rmse": rmse,
        "mae": mae,
        "nmae_pct": nmae,
        "mape_pct": mape,
        "smape_pct": smape,
        "r2": r2,
        "mbe": mbe,
        "skill_vs_persistence": skill_score,
    }

    # 5. Daylight specific metrics for solar
    if is_solar and daylight_mask is not None:
        mask = np.asarray(daylight_mask).ravel().astype(bool)
        if np.sum(mask) > 0:
            yt_day = y_t[mask]
            yp_day = y_p[mask]
            out["daylight_rmse"] = float(np.sqrt(mean_squared_error(yt_day, yp_day)))
            out["daylight_mae"] = float(mean_absolute_error(yt_day, yp_day))
            out["daylight_nmae_pct"] = float(out["daylight_mae"] / config.PLANT_CAPACITY_MW * 100.0)
        else:
            out["daylight_rmse"] = 0.0
            out["daylight_mae"] = 0.0
            out["daylight_nmae_pct"] = 0.0

    return out

def clip_predictions(
    y_pred: np.ndarray,
    is_solar: bool = False,
    elevation: Optional[np.ndarray] = None,
    max_capacity: float = config.PLANT_CAPACITY_MW
) -> np.ndarray:
    preds = np.asarray(y_pred, dtype=float).copy()
    preds = np.maximum(preds, 0.0)
    if is_solar:
        preds = np.minimum(preds, max_capacity)
        if elevation is not None:
            elev = np.asarray(elevation).ravel()
            preds = np.where(elev <= 0.0, 0.0, preds)
    return preds
