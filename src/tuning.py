"""
Milestone M8 — src/tuning.py
Optuna hyperparameter optimisation for the 5 DL champions.
Strictly uses Train ≤ 2024 with TimeSeriesSplit (no val-year leakage).
"""

from __future__ import annotations
import json
import time
import warnings
from pathlib import Path
from typing import Any, Dict, Tuple

import numpy as np
import optuna
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset, TensorDataset

optuna.logging.set_verbosity(optuna.logging.WARNING)
warnings.filterwarnings("ignore")

from src import config
from src.features import build_sequences
from src.models_dl import (
    BiLSTMModel,
    CNNLSTMModel,
    DLinearModel,
    GRUModel,
    LSTMModel,
    inverse_scale,
    load_sequence_data,
)
from src.metrics import compute_all_metrics


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

def _build_model(trial: optuna.Trial, name: str, F: int, W: int) -> nn.Module:
    """Suggest hyperparameters and instantiate model."""
    n = name.lower()
    if n == "bilstm":
        H      = trial.suggest_categorical("hidden", [64, 96, 128, 192])
        layers = trial.suggest_int("layers", 1, 3)
        drop   = trial.suggest_float("dropout", 0.1, 0.4)
        return BiLSTMModel(F, H=H, layers=layers, drop=drop)

    elif n == "gru":
        H      = trial.suggest_categorical("hidden", [64, 96, 128, 192])
        layers = trial.suggest_int("layers", 1, 3)
        drop   = trial.suggest_float("dropout", 0.1, 0.4)
        return GRUModel(F, H=H, layers=layers, drop=drop)

    elif n == "cnn_lstm":
        C    = trial.suggest_categorical("cnn_filters", [32, 64, 96, 128])
        H    = trial.suggest_categorical("hidden", [64, 96, 128])
        drop = trial.suggest_float("dropout", 0.1, 0.4)
        return CNNLSTMModel(F, C=C, H=H, drop=drop)

    elif n == "dlinear":
        return DLinearModel(F, W)   # DLinear has no dropout; kernel is fixed 5

    elif n == "lstm":
        H      = trial.suggest_categorical("hidden", [64, 96, 128, 192])
        layers = trial.suggest_int("layers", 1, 3)
        drop   = trial.suggest_float("dropout", 0.1, 0.4)
        return LSTMModel(F, H=H, layers=layers, drop=drop)

    else:
        raise ValueError(f"Unknown model for tuning: {name}")


def _train_fold(
    model: nn.Module,
    tr_loader: DataLoader,
    va_loader: DataLoader,
    lr: float,
    epochs: int = 20,
    patience: int = 4,
) -> float:
    """Train one CV fold; return best validation Huber loss."""
    criterion = nn.SmoothL1Loss()
    opt   = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    sched = torch.optim.lr_scheduler.ReduceLROnPlateau(opt, factor=0.5, patience=2)

    best_loss, no_improve = float("inf"), 0

    for _ in range(epochs):
        model.train()
        for Xb, yb in tr_loader:
            opt.zero_grad()
            loss = criterion(model(Xb), yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()

        model.eval()
        vloss = 0.0; nb = 0
        with torch.no_grad():
            for Xb, yb in va_loader:
                vloss += criterion(model(Xb), yb).item(); nb += 1
        vloss /= max(nb, 1)
        sched.step(vloss)

        if vloss < best_loss - 1e-4:
            best_loss, no_improve = vloss, 0
        else:
            no_improve += 1
            if no_improve >= patience:
                break

    return best_loss


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def tune_dl_model(
    model_name: str,
    problem_id: str,
    n_trials: int = 35,
    n_splits: int = 3,
    window_size: int = 24,
    batch_size: int = 512,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Run Optuna HPO for `model_name` on `problem_id`.

    Uses TimeSeriesSplit(n_splits) strictly inside the TRAIN set (≤ 2024).
    Returns dict with best params and CV score.
    """
    torch.manual_seed(seed)
    np.random.seed(seed)

    # Load full training sequences (train split only — ≤ 2024)
    proc = config.PROCESSED_DATA_DIR
    target_col = config.PROBLEMS[problem_id]["target"]
    is_solar   = problem_id.startswith("S")

    X_tr = np.load(str(proc / f"X_train_{problem_id}_scaled.parquet"), allow_pickle=False) \
           if False else \
           __import__("pandas").read_parquet(proc / f"X_train_{problem_id}_scaled.parquet").values.astype(np.float32)

    y_tr_raw = __import__("pandas").read_parquet(
        proc / f"y_train_{problem_id}.parquet"
    )[target_col].values.astype(np.float32)

    # Normalise target (same as models_dl)
    if is_solar:
        cap = float(config.PLANT_CAPACITY_MW)
        y_tr_n = y_tr_raw / cap
        scaler = {"type": "solar", "scale": cap}
    else:
        mu  = float(y_tr_raw.mean())
        sd  = float(y_tr_raw.std()) or 1.0
        y_tr_n = (y_tr_raw - mu) / sd
        scaler = {"type": "demand", "mean": mu, "std": sd}

    # Build full sequence tensors
    Xts, yts = build_sequences(X_tr, y_tr_n, window_size)
    N, W, F  = Xts.shape

    # TimeSeriesSplit indices
    from sklearn.model_selection import TimeSeriesSplit
    tss    = TimeSeriesSplit(n_splits=n_splits)
    splits = list(tss.split(np.arange(N)))

    def objective(trial: optuna.Trial) -> float:
        lr = trial.suggest_float("lr", 1e-4, 5e-3, log=True)
        cv_losses = []

        for tr_idx, va_idx in splits:
            model = _build_model(trial, model_name, F, W)

            tr_ds = TensorDataset(
                torch.from_numpy(Xts[tr_idx].copy()),
                torch.from_numpy(yts[tr_idx].copy()).unsqueeze(1),
            )
            va_ds = TensorDataset(
                torch.from_numpy(Xts[va_idx].copy()),
                torch.from_numpy(yts[va_idx].copy()).unsqueeze(1),
            )
            tr_loader = DataLoader(tr_ds, batch_size=batch_size, shuffle=False, num_workers=0)
            va_loader = DataLoader(va_ds, batch_size=batch_size * 2, shuffle=False, num_workers=0)

            fold_loss = _train_fold(model, tr_loader, va_loader, lr)
            cv_losses.append(fold_loss)

            # Prune bad trials early
            trial.report(np.mean(cv_losses), step=len(cv_losses))
            if trial.should_prune():
                raise optuna.TrialPruned()

        return float(np.mean(cv_losses))

    sampler = optuna.samplers.TPESampler(seed=seed)
    pruner  = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=1)
    study   = optuna.create_study(direction="minimize", sampler=sampler, pruner=pruner)
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best = study.best_trial
    return {
        "model":     model_name,
        "problem":   problem_id,
        "best_cv_huber": float(best.value),
        "best_params": best.params,
        "n_trials_completed": len(study.trials),
    }


def retrain_tuned_model(
    model_name: str,
    problem_id: str,
    best_params: Dict[str, Any],
    window_size: int = 24,
    batch_size: int = 512,
    epochs: int = 30,
    patience: int = 6,
) -> Tuple[nn.Module, Dict[str, Any]]:
    """
    Retrain a DL model on the FULL train set with best Optuna params,
    evaluate on the 2025 validation year, return (model, metrics).
    """
    data = load_sequence_data(problem_id, window_size=window_size, batch_size=batch_size)
    F, W = data["n_features"], data["window_size"]

    # Build model from best_params (simulate a trial)
    class _FakeTrial:
        def __init__(self, p): self._p = p
        def suggest_categorical(self, n, _): return self._p[n]
        def suggest_int(self, n, *_): return self._p[n]
        def suggest_float(self, n, *_, **__): return self._p[n]

    model = _build_model(_FakeTrial(best_params), model_name, F, W)
    lr    = best_params.get("lr", 1e-3)

    criterion = nn.SmoothL1Loss()
    opt   = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    sched = torch.optim.lr_scheduler.ReduceLROnPlateau(opt, factor=0.5, patience=2)

    best_loss, best_state, no_improve = float("inf"), None, 0
    t0 = time.time()

    for ep in range(1, epochs + 1):
        model.train()
        for Xb, yb in data["train_loader"]:
            opt.zero_grad()
            loss = criterion(model(Xb), yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()

        model.eval()
        vloss, nb = 0.0, 0
        with torch.no_grad():
            for Xb, yb in data["val_loader"]:
                vloss += criterion(model(Xb), yb).item(); nb += 1
        vloss /= max(nb, 1)
        sched.step(vloss)
        print(f"  [{model_name}/{problem_id}] Epoch {ep:2d}/{epochs} | Val Huber: {vloss:.5f}")

        if vloss < best_loss - 1e-4:
            best_loss = vloss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            no_improve = 0
        else:
            no_improve += 1
            if no_improve >= patience:
                print(f"  Early stopping at epoch {ep}.")
                break

    if best_state:
        model.load_state_dict(best_state)

    # Predict on validation
    model.eval()
    preds_norm = []
    with torch.no_grad():
        for Xb, _ in data["val_loader"]:
            preds_norm.append(model(Xb).numpy().squeeze(1))
    preds_norm = np.concatenate(preds_norm)
    preds_mw   = inverse_scale(preds_norm, data["scaler"])

    y_val_mw = data["y_val_mw"]
    min_len  = min(len(y_val_mw), len(preds_mw))
    y_val_mw = y_val_mw[:min_len]
    preds_mw = preds_mw[:min_len]

    # Persistence baseline for skill score
    is_solar  = problem_id.startswith("S")
    pers_rmse = 212.21 if problem_id == "S24" else (211.06 if problem_id == "S1" else (669.96 if problem_id == "D1" else 771.30))

    metrics = compute_all_metrics(y_val_mw, preds_mw, problem_id=problem_id, baseline_rmse=pers_rmse)
    metrics["train_sec"] = time.time() - t0
    metrics["epochs_trained"] = ep

    return model, metrics, data, preds_mw

