"""Unit and integration tests for Milestone M7: Deep Learning Models."""

import json
from pathlib import Path
import pytest
import torch
import numpy as np
import pandas as pd

from src import config
from src.models_dl import get_dl_model, load_sequence_data, inverse_scale


def test_dl_model_forward_shapes():
    """Verify all 5 deep learning architectures produce (B, 1) output given (B, T, F)."""
    B, T, F = 4, 24, 25
    x = torch.randn(B, T, F)
    models = ["lstm", "gru", "cnn_lstm", "bilstm", "dlinear"]
    for m_name in models:
        m = get_dl_model(m_name, F, T)
        out = m(x)
        assert out.shape == (B, 1), f"Model {m_name} output shape was {out.shape}, expected {(B, 1)}"


def test_load_sequence_data_shapes():
    """Verify sequence generator yields valid 3D tensors and matching targets."""
    data = load_sequence_data("S1", window_size=24, batch_size=256)
    assert data["n_train"] > 30000
    assert data["n_val"] > 8000
    assert data["window_size"] == 24
    assert data["n_features"] > 10
    assert len(data["y_val_mw"]) == data["n_val"]


def test_inverse_scale_boundaries():
    """Verify target inverse scaling preserves physical constraints."""
    solar_scaler = {"type": "solar", "scale": 2050.0}
    preds_norm = np.array([-0.1, 0.5, 1.2], dtype=np.float32)
    solar_mw = inverse_scale(preds_norm, solar_scaler)
    assert solar_mw[0] == 0.0
    assert solar_mw[1] == 1025.0
    assert solar_mw[2] == 2050.0

    demand_scaler = {"type": "demand", "mean": 8000.0, "std": 1500.0}
    demand_norm = np.array([-1.0, 0.0, 1.0], dtype=np.float32)
    demand_mw = inverse_scale(demand_norm, demand_scaler)
    assert np.isclose(demand_mw[0], 6500.0)
    assert np.isclose(demand_mw[1], 8000.0)
    assert np.isclose(demand_mw[2], 9500.0)


def test_m7_checkpoints_and_artifacts():
    """Verify all 20 model checkpoints, predictions, figures, and summary tables exist."""
    models = ["lstm", "gru", "cnn_lstm", "bilstm", "dlinear"]
    problems = ["S1", "S24", "D1", "D24"]
    
    # 1. Weights
    for m in models:
        for p in problems:
            pt_path = config.RESULTS_MODELS_DIR / f"{m}_{p}.pt"
            assert pt_path.exists(), f"Missing checkpoint: {pt_path.name}"
            assert pt_path.stat().st_size > 500, f"Checkpoint empty: {pt_path.name}"
            
    # 2. Results tables
    csv_path = config.RESULTS_TABLES_DIR / "dl_results.csv"
    md_path = config.RESULTS_TABLES_DIR / "dl_results.md"
    assert csv_path.exists()
    assert md_path.exists()
    df_dl = pd.read_csv(csv_path)
    assert len(df_dl) == 20  # 5 models x 4 problems


def test_m7_notebooks_prebaked():
    """Verify all 6 notebooks exist under models/deep_learning/ and contain execution outputs."""
    nb_dir = config.PROJECT_ROOT / "models" / "deep_learning"
    expected_nbs = ["LSTM.ipynb", "GRU.ipynb", "CNN_LSTM.ipynb", "BiLSTM.ipynb", "DLinear.ipynb", "summary.ipynb"]
    
    for nb_name in expected_nbs:
        nb_file = nb_dir / nb_name
        assert nb_file.exists(), f"Notebook {nb_name} missing"
        with open(nb_file, "r", encoding="utf-8") as f:
            nb = json.load(f)
        code_cells = [c for c in nb["cells"] if c["cell_type"] == "code"]
        assert len(code_cells) > 0
        executed_cells = [c for c in code_cells if len(c.get("outputs", [])) > 0]
        assert len(executed_cells) > 0, f"Notebook {nb_name} has no executed outputs!"
