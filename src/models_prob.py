"""
Milestone M8 — src/models_prob.py
Probabilistic forecasting: Quantile LightGBM for P10 / P50 / P90.
Evaluates Pinball Loss and 80% Empirical Coverage.
"""

from __future__ import annotations
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor


# ──────────────────────────────────────────────────────────────────────────────
# Pinball loss & coverage
# ──────────────────────────────────────────────────────────────────────────────

def pinball_loss(y_true: np.ndarray, y_pred: np.ndarray, q: float) -> float:
    """Mean pinball (quantile) loss for quantile q ∈ (0,1)."""
    err   = y_true - y_pred
    return float(np.mean(np.where(err >= 0, q * err, (q - 1) * err)))


def empirical_coverage(
    y_true: np.ndarray,
    y_lo: np.ndarray,
    y_hi: np.ndarray,
) -> float:
    """Fraction of actuals within [y_lo, y_hi] — nominal 80% for P10/P90."""
    return float(np.mean((y_true >= y_lo) & (y_true <= y_hi)))


def interval_width(y_lo: np.ndarray, y_hi: np.ndarray) -> float:
    return float(np.mean(y_hi - y_lo))


# ──────────────────────────────────────────────────────────────────────────────
# Quantile LightGBM
# ──────────────────────────────────────────────────────────────────────────────

QUANTILES = [0.10, 0.50, 0.90]


def train_quantile_lgbm(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    quantiles: list = None,
    n_estimators: int = 400,
    learning_rate: float = 0.05,
    num_leaves: int = 63,
    seed: int = 42,
) -> Tuple[Dict[float, LGBMRegressor], Dict[str, float]]:
    """
    Train one Quantile LightGBM per quantile.
    Returns (model_dict, metrics_dict).
    """
    if quantiles is None:
        quantiles = QUANTILES

    models: Dict[float, LGBMRegressor] = {}
    q_preds: Dict[float, np.ndarray]   = {}

    for q in quantiles:
        lgbm = LGBMRegressor(
            objective="quantile",
            alpha=q,
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            num_leaves=num_leaves,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_samples=20,
            random_state=seed,
            verbose=-1,
            n_jobs=-1,
        )
        lgbm.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            callbacks=[__import__("lightgbm").early_stopping(50, verbose=False),
                       __import__("lightgbm").log_evaluation(period=-1)],
        )
        models[q]  = lgbm
        q_preds[q] = np.clip(lgbm.predict(X_val), 0, None)

    # Metrics
    metrics: Dict[str, float] = {}
    for q in quantiles:
        metrics[f"pinball_q{int(q*100):02d}"] = pinball_loss(y_val, q_preds[q], q)

    if 0.10 in q_preds and 0.90 in q_preds:
        metrics["coverage_80pct"] = empirical_coverage(y_val, q_preds[0.10], q_preds[0.90])
        metrics["interval_width"] = interval_width(q_preds[0.10], q_preds[0.90])

    return models, q_preds, metrics


def load_flat_features(problem_id: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Load 2D (flat) train/val feature arrays for ML-style probabilistic models."""
    from src import config
    proc = config.PROCESSED_DATA_DIR
    target_col = config.PROBLEMS[problem_id]["target"]

    X_tr = pd.read_parquet(proc / f"X_train_{problem_id}_scaled.parquet").values.astype(np.float32)
    X_va = pd.read_parquet(proc / f"X_val_{problem_id}_scaled.parquet").values.astype(np.float32)
    y_tr = pd.read_parquet(proc / f"y_train_{problem_id}.parquet")[target_col].values.astype(np.float32)
    y_va = pd.read_parquet(proc / f"y_val_{problem_id}.parquet")[target_col].values.astype(np.float32)

    return X_tr, y_tr, X_va, y_va

