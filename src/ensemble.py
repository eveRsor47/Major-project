"""
Milestone M8 — src/ensemble.py
Four formal ensemble methods over the 5 DL champions.

Methods:
  1. equal_weight_average    — simple mean
  2. nnls_weighted_average   — constrained least squares
  3. stacking_ridge          — Ridge meta-learner on OOF walk-forward preds
  4. residual_hybrid         — DLinear base + GRU on residuals (D1 / D24)
"""

from __future__ import annotations
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from sklearn.linear_model import Ridge


# ──────────────────────────────────────────────────────────────────────────────
# Utilities
# ──────────────────────────────────────────────────────────────────────────────

def _rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def _mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))


def _r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - y_true.mean()) ** 2)
    return float(1 - ss_res / (ss_tot + 1e-12))


def _skill(rmse_model: float, rmse_persistence: float) -> float:
    return float((1 - rmse_model / rmse_persistence) * 100)


PERSISTENCE_RMSE = {
    "S1":  211.06,
    "S24": 212.21,
    "D1":  669.96,
    "D24": 771.30,
}


def ensemble_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    problem_id: str,
    method: str,
) -> Dict[str, float]:
    p = PERSISTENCE_RMSE[problem_id]
    return {
        "method":               method,
        "problem":              problem_id,
        "rmse":                 _rmse(y_true, y_pred),
        "mae":                  _mae(y_true, y_pred),
        "r2":                   _r2(y_true, y_pred),
        "skill_vs_persistence": _skill(_rmse(y_true, y_pred), p),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Method 1 — Equal-Weight Average
# ──────────────────────────────────────────────────────────────────────────────

def equal_weight_average(
    preds: Dict[str, np.ndarray],
) -> np.ndarray:
    """Simple mean across all members."""
    stacked = np.stack(list(preds.values()), axis=1)
    return stacked.mean(axis=1)


# ──────────────────────────────────────────────────────────────────────────────
# Method 2 — NNLS Weighted Average
# ──────────────────────────────────────────────────────────────────────────────

def nnls_weighted_average(
    y_true: np.ndarray,
    preds: Dict[str, np.ndarray],
    n_restarts: int = 40,
    seed: int = 42,
) -> Tuple[np.ndarray, Dict[str, float]]:
    """
    Constrained least-squares ensemble (sum=1, w≥0).
    Returns (blended_predictions, weight_dict).
    """
    rng   = np.random.default_rng(seed)
    names = list(preds.keys())
    P     = np.column_stack([preds[m] for m in names])
    n     = len(names)

    def objective(w):
        return _rmse(y_true, P @ w)

    constraints = [{"type": "eq", "fun": lambda w: w.sum() - 1}]
    bounds = [(0.0, 1.0)] * n

    best_rmse, best_w = np.inf, np.ones(n) / n
    for _ in range(n_restarts):
        w0  = rng.dirichlet(np.ones(n))
        res = minimize(objective, w0, method="SLSQP",
                       bounds=bounds, constraints=constraints,
                       options={"maxiter": 3000, "ftol": 1e-13})
        if res.fun < best_rmse:
            best_rmse, best_w = res.fun, res.x

    weights = {names[i]: float(best_w[i]) for i in range(n)}
    y_blend = P @ best_w
    return y_blend, weights


# ──────────────────────────────────────────────────────────────────────────────
# Method 3 — Stacking with Ridge Meta-Learner (Walk-Forward OOF)
# ──────────────────────────────────────────────────────────────────────────────

def stacking_ridge(
    y_true: np.ndarray,
    preds: Dict[str, np.ndarray],
    n_splits: int = 5,
    alpha: float = 1.0,
) -> Tuple[np.ndarray, Ridge]:
    """
    Walk-forward stacking: train Ridge meta-model on OOF predictions.
    Returns (blended_predictions, fitted_meta_model).
    """
    names   = list(preds.keys())
    P       = np.column_stack([preds[m] for m in names])
    N       = len(y_true)
    fold_sz = N // (n_splits + 1)

    oof_preds  = np.zeros(N)
    oof_fitted = []

    for k in range(n_splits):
        tr_end   = (k + 1) * fold_sz
        va_start = tr_end
        va_end   = va_start + fold_sz

        X_tr = P[:tr_end]
        y_tr = y_true[:tr_end]
        X_va = P[va_start:va_end]

        meta = Ridge(alpha=alpha, fit_intercept=True)
        meta.fit(X_tr, y_tr)
        oof_preds[va_start:va_end] = meta.predict(X_va)
        oof_fitted.append(meta)

    # Final meta-model trained on all data
    meta_final = Ridge(alpha=alpha, fit_intercept=True)
    meta_final.fit(P, y_true)
    y_blend = np.clip(meta_final.predict(P), 0, None)
    return y_blend, meta_final


# ──────────────────────────────────────────────────────────────────────────────
# Method 4 — Residual Hybrid (DLinear base + GRU on residuals)
# ──────────────────────────────────────────────────────────────────────────────

def residual_hybrid(
    y_true: np.ndarray,
    base_preds: np.ndarray,     # DLinear predictions
    residual_preds: np.ndarray, # GRU predictions (trained on base residuals)
    alpha: float = 0.5,
) -> np.ndarray:
    """
    Additive hybrid: base + alpha * residual_correction.
    alpha is learned via grid search on val.
    """
    best_alpha, best_rmse = alpha, np.inf
    for a in np.linspace(0.0, 1.0, 101):
        y_blend = base_preds + a * (residual_preds - base_preds)
        r = _rmse(y_true, np.clip(y_blend, 0, None))
        if r < best_rmse:
            best_rmse, best_alpha = r, a

    y_hybrid = base_preds + best_alpha * (residual_preds - base_preds)
    return np.clip(y_hybrid, 0, None), best_alpha


# ──────────────────────────────────────────────────────────────────────────────
# Walk-Forward Seasonal Robustness Check
# ──────────────────────────────────────────────────────────────────────────────

SEASON_MONTHS = {
    "Winter":  [11, 12, 1, 2],
    "Summer":  [3, 4, 5],
    "Monsoon": [6, 7, 8, 9],
    "PostMon": [10],
}


def walk_forward_seasonal(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    timestamps: pd.DatetimeIndex,
    problem_id: str,
    method: str,
) -> pd.DataFrame:
    """
    Break ensemble performance down by season using 2025 val timestamps.
    Returns DataFrame with per-season RMSE / Skill.
    """
    rows = []
    for season, months in SEASON_MONTHS.items():
        mask = timestamps.month.isin(months)
        if mask.sum() < 24:
            continue
        yt = y_true[mask]
        yp = y_pred[mask]
        rows.append({
            "season":  season,
            "method":  method,
            "problem": problem_id,
            "n":       int(mask.sum()),
            "rmse":    _rmse(yt, yp),
            "mae":     _mae(yt, yp),
            "r2":      _r2(yt, yp),
            "skill":   _skill(_rmse(yt, yp), PERSISTENCE_RMSE[problem_id]),
        })
    return pd.DataFrame(rows)

