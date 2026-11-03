"""Milestone M7 – Deep Learning Models shared module.

Provides:
  - load_sequence_data()    : build sliding-window PyTorch DataLoaders from M4 parquets
  - inverse_scale()         : convert normalised predictions back to physical MW
  - Model classes           : LSTM, GRU, CNNLSTMModel, BiLSTMModel, DLinearModel
  - get_dl_model()          : factory function
  - train_deep_model()      : Adam + Huber loss + early-stopping training loop
  - predict_model()         : batched inference
  - run_dl_problem()        : end-to-end helper used by every notebook
  - plot_loss_curves()      : training/validation Huber loss plot
  - plot_diagnostics()      : 4-panel diagnostic figure
"""

import os
import time
from pathlib import Path
from typing import Dict, Any, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from src import config
from src.features import build_sequences
from src.metrics import compute_all_metrics

# Use all available physical CPU threads, capped at 8
torch.set_num_threads(min(8, os.cpu_count() or 4))


# ──────────────────────────────────────────────────────────────────────────────
# 1.  DATA LOADING
# ──────────────────────────────────────────────────────────────────────────────

def load_sequence_data(
    problem_id: str,
    window_size: int = 24,
    batch_size: int = 512,
) -> Dict[str, Any]:
    """Load M4 scaled parquets, apply target normalisation, build DataLoaders.

    Target scaling (Roadmap p.12):
      Solar  → y / 2050  (clip to [0,1])
      Demand → (y - mean_train) / std_train
    """
    proc = config.PROCESSED_DATA_DIR

    X_tr = pd.read_parquet(proc / f"X_train_{problem_id}_scaled.parquet").values.astype(np.float32)
    X_va = pd.read_parquet(proc / f"X_val_{problem_id}_scaled.parquet").values.astype(np.float32)

    target_col = config.PROBLEMS[problem_id]["target"]
    y_tr_raw = pd.read_parquet(proc / f"y_train_{problem_id}.parquet")[target_col].values.astype(np.float32)
    y_va_raw = pd.read_parquet(proc / f"y_val_{problem_id}.parquet")[target_col].values.astype(np.float32)
    val_idx  = pd.read_parquet(proc / f"y_val_{problem_id}.parquet").index

    is_solar = problem_id.startswith("S")
    if is_solar:
        cap = float(config.PLANT_CAPACITY_MW)
        y_tr_n = y_tr_raw / cap
        y_va_n = y_va_raw / cap
        scaler = {"type": "solar", "scale": cap}
    else:
        mu = float(y_tr_raw.mean())
        sd = float(y_tr_raw.std()) or 1.0
        y_tr_n = (y_tr_raw - mu) / sd
        y_va_n = (y_va_raw - mu) / sd
        scaler = {"type": "demand", "mean": mu, "std": sd}

    # Build (N, W, F) sequences
    Xts, yts = build_sequences(X_tr, y_tr_n, window_size)
    Xvs, yvs = build_sequences(X_va, y_va_n, window_size)

    # Ground-truth MW aligned to sequence output positions
    y_va_mw = y_va_raw[window_size - 1:]
    ts_va   = val_idx[window_size - 1:]

    tr_ds = TensorDataset(torch.from_numpy(Xts.copy()), torch.from_numpy(yts.copy()).unsqueeze(1))
    va_ds = TensorDataset(torch.from_numpy(Xvs.copy()), torch.from_numpy(yvs.copy()).unsqueeze(1))

    return {
        "train_loader": DataLoader(tr_ds, batch_size=batch_size, shuffle=True,  drop_last=False, num_workers=0),
        "val_loader":   DataLoader(va_ds, batch_size=batch_size * 2, shuffle=False, drop_last=False, num_workers=0),
        "n_features":   Xts.shape[2],
        "window_size":  window_size,
        "scaler":       scaler,
        "val_ts":       ts_va,
        "y_val_mw":     y_va_mw,
        "n_train":      len(tr_ds),
        "n_val":        len(va_ds),
        "is_solar":     is_solar,
    }


def inverse_scale(y_norm: np.ndarray, scaler: Dict[str, Any]) -> np.ndarray:
    """Invert normalised predictions to physical MW."""
    if scaler["type"] == "solar":
        return np.clip(y_norm * scaler["scale"], 0.0, scaler["scale"])
    y_mw = y_norm * scaler["std"] + scaler["mean"]
    return np.clip(y_mw, 0.0, None)


# ──────────────────────────────────────────────────────────────────────────────
# 2.  MODEL ARCHITECTURES
# ──────────────────────────────────────────────────────────────────────────────

class LSTMModel(nn.Module):
    """Tier 1 – 2-layer LSTM."""
    def __init__(self, F: int, H: int = 64, layers: int = 2, drop: float = 0.2):
        super().__init__()
        self.rnn = nn.LSTM(F, H, layers, batch_first=True,
                           dropout=drop if layers > 1 else 0.0)
        self.fc  = nn.Linear(H, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.rnn(x)
        return self.fc(out[:, -1, :])


class GRUModel(nn.Module):
    """Tier 1 – 2-layer GRU."""
    def __init__(self, F: int, H: int = 64, layers: int = 2, drop: float = 0.2):
        super().__init__()
        self.rnn = nn.GRU(F, H, layers, batch_first=True,
                          dropout=drop if layers > 1 else 0.0)
        self.fc  = nn.Linear(H, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.rnn(x)
        return self.fc(out[:, -1, :])


class CNNLSTMModel(nn.Module):
    """Tier 1 – 1-D CNN feature extractor + single-layer LSTM."""
    def __init__(self, F: int, C: int = 64, H: int = 64, drop: float = 0.2):
        super().__init__()
        self.conv = nn.Conv1d(F, C, kernel_size=3, padding=1)
        self.relu = nn.ReLU()
        self.lstm = nn.LSTM(C, H, batch_first=True)
        self.drop = nn.Dropout(drop)
        self.fc   = nn.Linear(H, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, T, F)
        h = self.relu(self.conv(x.permute(0, 2, 1)))  # (B, C, T)
        h, _ = self.lstm(h.permute(0, 2, 1))           # (B, T, H)
        return self.fc(self.drop(h[:, -1, :]))


class BiLSTMModel(nn.Module):
    """Tier 2 – 2-layer Bidirectional LSTM."""
    def __init__(self, F: int, H: int = 64, layers: int = 2, drop: float = 0.2):
        super().__init__()
        self.rnn = nn.LSTM(F, H, layers, batch_first=True,
                           bidirectional=True,
                           dropout=drop if layers > 1 else 0.0)
        self.fc  = nn.Linear(H * 2, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.rnn(x)
        return self.fc(out[:, -1, :])


class _MovAvg(nn.Module):
    def __init__(self, k: int = 5):
        super().__init__()
        self.pool = nn.AvgPool1d(k, stride=1, padding=0)
        self.pad  = (k - 1) // 2, k - 1 - (k - 1) // 2

    def forward(self, x):                         # x: (B, T, F)
        x_t = x.permute(0, 2, 1)                 # (B, F, T)
        front = x_t[:, :, :1].expand(-1, -1, self.pad[0])
        back  = x_t[:, :, -1:].expand(-1, -1, self.pad[1])
        trend = self.pool(torch.cat([front, x_t, back], dim=2))
        return x - trend.permute(0, 2, 1), trend.permute(0, 2, 1)


class DLinearModel(nn.Module):
    """Tier 2 – Decomposition Linear (season + trend linear projections)."""
    def __init__(self, F: int, W: int = 24):
        super().__init__()
        self.decomp   = _MovAvg(5)
        self.lin_seas = nn.Linear(W * F, 1)
        self.lin_trnd = nn.Linear(W * F, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        seas, trnd = self.decomp(x)
        B = x.size(0)
        return self.lin_seas(seas.reshape(B, -1)) + self.lin_trnd(trnd.reshape(B, -1))


def get_dl_model(name: str, F: int, W: int = 24) -> nn.Module:
    """Factory: return model by lowercase key."""
    n = name.lower().replace("-", "_")
    if n == "lstm":       return LSTMModel(F)
    if n == "gru":        return GRUModel(F)
    if n == "cnn_lstm":   return CNNLSTMModel(F)
    if n == "bilstm":     return BiLSTMModel(F)
    if n == "dlinear":    return DLinearModel(F, W)
    raise ValueError(f"Unknown model: {name}")


# ──────────────────────────────────────────────────────────────────────────────
# 3.  TRAINING LOOP
# ──────────────────────────────────────────────────────────────────────────────

def train_deep_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    epochs: int = 15,
    lr: float = 1e-3,
    patience: int = 5,
) -> Tuple[nn.Module, Dict[str, Any]]:
    """Adam + Huber loss + ReduceLROnPlateau + early stopping."""
    criterion = nn.SmoothL1Loss()
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    sched = torch.optim.lr_scheduler.ReduceLROnPlateau(opt, factor=0.5, patience=2)

    best_loss, best_state, no_improve = float("inf"), None, 0
    tr_hist, va_hist = [], []
    t0 = time.time()

    for ep in range(1, epochs + 1):
        # — train —
        model.train()
        tloss, nb = 0.0, 0
        for Xb, yb in train_loader:
            opt.zero_grad()
            loss = criterion(model(Xb), yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tloss += loss.item(); nb += 1
        tloss /= max(nb, 1)

        # — validate —
        model.eval()
        vloss, nb = 0.0, 0
        with torch.no_grad():
            for Xb, yb in val_loader:
                vloss += criterion(model(Xb), yb).item(); nb += 1
        vloss /= max(nb, 1)
        sched.step(vloss)

        tr_hist.append(tloss); va_hist.append(vloss)
        print(f"  Epoch {ep:2d}/{epochs} | Train Huber: {tloss:.5f} | Val Huber: {vloss:.5f}")

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
    return model, {"train_loss": tr_hist, "val_loss": va_hist,
                   "epochs_trained": len(tr_hist), "train_sec": time.time() - t0}


def predict_model(model: nn.Module, loader: DataLoader) -> np.ndarray:
    model.eval()
    preds = []
    with torch.no_grad():
        for Xb, _ in loader:
            preds.append(model(Xb).numpy().squeeze(1))
    return np.concatenate(preds)


# ──────────────────────────────────────────────────────────────────────────────
# 4.  END-TO-END PROBLEM RUNNER
# ──────────────────────────────────────────────────────────────────────────────

def run_dl_problem(
    model_name: str,
    problem_id: str,
    epochs: int = 15,
    batch_size: int = 512,
    window_size: int = 24,
) -> Dict[str, Any]:
    """Train, evaluate and save artifacts for one model × one problem."""
    print(f"\n{'='*58}")
    print(f"  {model_name.upper()}  |  Problem: {problem_id}")
    print(f"{'='*58}")

    data = load_sequence_data(problem_id, window_size, batch_size)
    print(f"  Sequences — Train: {data['n_train']:,}  |  Val: {data['n_val']:,}")
    print(f"  Tensor shape: ({window_size}, {data['n_features']})")

    model = get_dl_model(model_name, data["n_features"], window_size)
    model, hist = train_deep_model(
        model, data["train_loader"], data["val_loader"],
        epochs=epochs, patience=5,
    )

    preds_norm = predict_model(model, data["val_loader"])
    y_pred = inverse_scale(preds_norm, data["scaler"])
    y_true = data["y_val_mw"]

    # Compute baseline RMSE for Skill Score (persistence_t1 from M5 baselines)
    baseline_map = {"S1": 211.06, "S24": 212.21, "D1": 669.96, "D24": 771.30}
    baseline_rmse = baseline_map.get(problem_id)
    metrics = compute_all_metrics(
        y_true=y_true,
        y_pred=y_pred,
        problem_id=problem_id,
        baseline_rmse=baseline_rmse,
    )

    print("\n  — Validation Metrics —")
    for k, v in metrics.items():
        unit = " MW" if k in ("RMSE", "MAE") else " %"
        fmt  = ".2f"
        if k == "R2": unit, fmt = "", ".4f"
        print(f"    {k:<14}: {v:{fmt}}{unit}")

    # Save weights
    wpath = config.RESULTS_MODELS_DIR / f"{model_name.lower()}_{problem_id}.pt"
    torch.save(model.state_dict(), wpath)
    print(f"\n  Saved weights → {wpath.name}")

    # Save figures
    fig_dir = config.FIGURES_DEEP_LEARNING_DIR
    plot_loss_curves(hist, model_name, problem_id,
                     fig_dir / f"{model_name.lower()}_{problem_id}_loss.png")
    plot_diagnostics(y_true, y_pred, model_name, problem_id,
                     fig_dir / f"{model_name.lower()}_{problem_id}_diagnostics.png")

    return {"metrics": metrics, "history": hist,
            "y_true": y_true, "y_pred": y_pred, "ts": data["val_ts"]}


# ──────────────────────────────────────────────────────────────────────────────
# 5.  PLOT HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def plot_loss_curves(hist, model_name, problem_id, path: Path):
    fig, ax = plt.subplots(figsize=(7, 4))
    eps = range(1, len(hist["train_loss"]) + 1)
    ax.plot(eps, hist["train_loss"], "o-", color="#2563EB", lw=2, label="Train Huber")
    ax.plot(eps, hist["val_loss"],   "s-", color="#DC2626", lw=2, label="Val Huber")
    ax.set_title(f"{model_name.upper()} – Loss Curves ({problem_id})", fontweight="bold")
    ax.set_xlabel("Epoch"); ax.set_ylabel("Huber Loss")
    ax.grid(alpha=0.4, linestyle="--"); ax.legend()
    fig.tight_layout(); fig.savefig(path, dpi=150); plt.close(fig)


def plot_diagnostics(y_true, y_pred, model_name, problem_id, path: Path):
    resid = y_true - y_pred
    fig, axes = plt.subplots(2, 2, figsize=(13, 9))

    # 1. Actual vs Predicted (1 week)
    n = min(168, len(y_true))
    axes[0,0].plot(y_true[:n], label="Actual", color="#1E293B", lw=1.8)
    axes[0,0].plot(y_pred[:n], "--", label="Predicted", color="#3B82F6", lw=1.8)
    axes[0,0].set_title(f"Actual vs Predicted – first {n}h ({problem_id})", fontweight="bold")
    axes[0,0].set_xlabel("Hour"); axes[0,0].set_ylabel("MW")
    axes[0,0].legend(); axes[0,0].grid(alpha=0.3)

    # 2. Scatter
    lims = [min(y_true.min(), y_pred.min()), max(y_true.max(), y_pred.max())]
    axes[0,1].scatter(y_true, y_pred, alpha=0.2, s=6, color="#2563EB")
    axes[0,1].plot(lims, lims, "r--", lw=1.5)
    axes[0,1].set_title("Scatter: Actual vs Predicted", fontweight="bold")
    axes[0,1].set_xlabel("Actual (MW)"); axes[0,1].set_ylabel("Predicted (MW)")
    axes[0,1].grid(alpha=0.3)

    # 3. Residual vs Actual
    axes[1,0].scatter(y_true, resid, alpha=0.2, s=6, color="#DC2626")
    axes[1,0].axhline(0, color="black", lw=1.2, linestyle="--")
    axes[1,0].set_title("Residuals vs Actual", fontweight="bold")
    axes[1,0].set_xlabel("Actual (MW)"); axes[1,0].set_ylabel("Residual (MW)")
    axes[1,0].grid(alpha=0.3)

    # 4. Error histogram
    sns.histplot(resid, kde=True, bins=60, color="#059669", ax=axes[1,1])
    axes[1,1].axvline(0, color="black", lw=1.2, linestyle="--")
    axes[1,1].set_title("Error Distribution & KDE", fontweight="bold")
    axes[1,1].set_xlabel("Prediction Error (MW)")
    axes[1,1].grid(alpha=0.3)

    fig.suptitle(f"{model_name.upper()} – {problem_id} Diagnostic Plots", fontsize=13, fontweight="bold")
    fig.tight_layout(); fig.savefig(path, dpi=150); plt.close(fig)
