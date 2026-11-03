"""Generate and execute Milestone M7 Deep Learning notebooks.

Creates models/deep_learning/ with:
  LSTM.ipynb, GRU.ipynb, CNN_LSTM.ipynb, BiLSTM.ipynb,
  DLinear.ipynb, summary.ipynb

Each model notebook trains on all 4 problems (S1, S24, D1, D24).
Uses batch_size=512, epochs=15, patience=5, timeout=None.
"""

import json
import sys
from pathlib import Path

import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parent.parent
NB_DIR = ROOT / "models" / "deep_learning"
NB_DIR.mkdir(parents=True, exist_ok=True)

KERNEL = "python3"
PROBLEMS = ["S1", "S24", "D1", "D24"]
BATCH_SIZE = 512
EPOCHS = 15


# ──────────────────────────────────────────────────────────────────────────────
# Helper: build a notebook object from a list of (type, source) tuples
# ──────────────────────────────────────────────────────────────────────────────
def make_nb(cells):
    nb = nbformat.v4.new_notebook()
    nb.metadata["kernelspec"] = {
        "display_name": "Python 3", "language": "python", "name": KERNEL
    }
    for kind, src in cells:
        if kind == "md":
            nb.cells.append(nbformat.v4.new_markdown_cell(src))
        else:
            nb.cells.append(nbformat.v4.new_code_cell(src))
    return nb


def execute_nb(path: Path):
    print(f"\n{'#'*60}")
    print(f"  Executing: {path.name}")
    print(f"{'#'*60}")
    nb = nbformat.read(path, as_version=4)
    client = NotebookClient(
        nb, timeout=None, kernel_name=KERNEL,
        resources={"metadata": {"path": str(ROOT)}}
    )
    client.execute()
    nbformat.write(nb, path)
    print(f"  Done: {path.name}")


# ──────────────────────────────────────────────────────────────────────────────
# MODEL NOTEBOOK TEMPLATE
# ──────────────────────────────────────────────────────────────────────────────
MODEL_INFO = {
    "lstm":    ("LSTM",    "Tier 1 – Two-layer Long Short-Term Memory. Core project architecture."),
    "gru":     ("GRU",     "Tier 1 – Two-layer Gated Recurrent Unit. Lighter alternative to LSTM."),
    "cnn_lstm":("CNN_LSTM","Tier 1 – 1-D CNN feature extractor followed by a single LSTM layer."),
    "bilstm":  ("BiLSTM",  "Tier 2 – Bidirectional LSTM; reads the sequence forward AND backward."),
    "dlinear": ("DLinear", "Tier 2 – Decomposition Linear baseline. Tests whether deep nets are needed."),
}


def build_model_nb(key: str, title: str, desc: str) -> list:
    cells = []

    # Title markdown
    cells.append(("md", f"# {title}\n\n*{desc}*\n\n**Milestone M7 – Deep Learning Models**"))

    # 1. Setup & dataset paths
    cells.append(("code", r"""
import sys, warnings
sys.path.insert(0, r'C:\Users\footc\OneDrive\Desktop\MAJOR PROJECT')
warnings.filterwarnings('ignore')

from src import config

TRAIN_PATH = config.PROCESSED_DATA_DIR
VAL_PATH   = config.PROCESSED_DATA_DIR
TEST_PATH  = config.PROCESSED_DATA_DIR

print("=" * 60)
print(f"  Training dataset  : {TRAIN_PATH}  (split ≤ 2024-12-31)")
print(f"  Validation dataset: {VAL_PATH}  (2025-01-01 → 2025-12-31)")
print(f"  Test dataset      : {TEST_PATH}  (2026-01-01 → 2026-02-28)  [QUARANTINED]")
print("=" * 60)
""".strip()))

    # 2. Imports
    cells.append(("code", r"""
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import torch
from src.models_dl import run_dl_problem, plot_loss_curves, plot_diagnostics

print(f"PyTorch {torch.__version__}  |  CPU threads: {torch.get_num_threads()}")
""".strip()))

    # 3-6. One training cell per problem
    for pid in PROBLEMS:
        cells.append(("md", f"## Problem: {pid}"))
        cells.append(("code",
            f"""results_{pid} = run_dl_problem(
    model_name="{key}",
    problem_id="{pid}",
    epochs={EPOCHS},
    batch_size={BATCH_SIZE},
    window_size=24,
)"""))

    # 7. Collect metrics & save predictions + CSV
    problem_list = str(PROBLEMS)
    cells.append(("md", "## Validation Metrics Summary"))
    cells.append(("code", f"""
import pandas as pd
from src import config

problems = {problem_list}
rows = []
for pid in problems:
    r = eval(f"results_{{pid}}")
    row = {{"model": "{key}", "problem": pid}}
    row.update(r["metrics"])
    rows.append(row)
    # Save predictions parquet
    pred_df = pd.DataFrame({{
        "timestamp": r["ts"],
        "y_true_mw": r["y_true"],
        "y_pred_mw": r["y_pred"],
    }}).set_index("timestamp")
    pred_path = config.RESULTS_PREDICTIONS_DIR / f"{key}_{{pid}}_val_predictions.parquet"
    pred_df.to_parquet(pred_path)
    print(f"Saved predictions -> {{pred_path.name}}")

summary_df = pd.DataFrame(rows)
csv_path = config.RESULTS_TABLES_DIR / f"{key}_val_metrics.csv"
summary_df.to_csv(csv_path, index=False)
print("\\nMetrics CSV saved:", csv_path.name)
print(summary_df.to_string(index=False))
""".strip()))

    return cells


# ──────────────────────────────────────────────────────────────────────────────
# SUMMARY NOTEBOOK
# ──────────────────────────────────────────────────────────────────────────────
def build_summary_nb() -> list:
    cells = []
    cells.append(("md", "# M7 Deep Learning Models — Master Summary\n\n"
                  "Reads all saved metric CSVs, ranks models, produces leaderboard charts."))

    cells.append(("code", r"""
import sys
sys.path.insert(0, r'C:\Users\footc\OneDrive\Desktop\MAJOR PROJECT')
import warnings; warnings.filterwarnings('ignore')
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from src import config
""".strip()))

    cells.append(("code", r"""
# Load all DL metric CSVs
models_m7 = ['lstm','gru','cnn_lstm','bilstm','dlinear']
dfs = []
for m in models_m7:
    p = config.RESULTS_TABLES_DIR / f'{m}_val_metrics.csv'
    if p.exists():
        dfs.append(pd.read_csv(p))
    else:
        print(f'WARNING: {p.name} not found – skipping')

all_metrics = pd.concat(dfs, ignore_index=True)
print(f'Loaded metrics for {len(all_metrics)} model × problem combinations')
print(all_metrics.to_string(index=False))
""".strip()))

    cells.append(("md", "## Per-Problem Rankings"))
    cells.append(("code", r"""
problems = ['S1', 'S24', 'D1', 'D24']
for pid in problems:
    sub = all_metrics[all_metrics['problem'] == pid].copy()
    sub = sub.sort_values('RMSE')
    print(f'\n--- {pid} ranked by RMSE ---')
    cols = ['model','RMSE','MAE','R2','Skill_Score']
    available = [c for c in cols if c in sub.columns]
    print(sub[available].to_string(index=False))
""".strip()))

    cells.append(("md", "## Visualisations — Bar Charts per Problem"))
    cells.append(("code", r"""
fig_dir = config.FIGURES_DEEP_LEARNING_DIR
metrics_to_plot = [c for c in ['RMSE','MAE','R2','Skill_Score'] if c in all_metrics.columns]

for pid in problems:
    sub = all_metrics[all_metrics['problem'] == pid]
    n = len(metrics_to_plot)
    fig, axes = plt.subplots(1, n, figsize=(5*n, 5))
    if n == 1: axes = [axes]
    for ax, metric in zip(axes, metrics_to_plot):
        s = sub.sort_values(metric, ascending=(metric not in ['R2','Skill_Score']))
        bars = ax.barh(s['model'], s[metric], color='#3B82F6')
        ax.set_title(f'{metric} – {pid}', fontweight='bold')
        ax.set_xlabel(metric)
        ax.grid(axis='x', alpha=0.4)
        for bar, val in zip(bars, s[metric]):
            ax.text(bar.get_width()*1.01, bar.get_y()+bar.get_height()/2,
                    f'{val:.2f}', va='center', fontsize=9)
    fig.suptitle(f'M7 Deep Learning Rankings – {pid}', fontsize=13, fontweight='bold')
    fig.tight_layout()
    out = fig_dir / f'dl_rankings_{pid}.png'
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f'Saved: {out.name}')
""".strip()))

    cells.append(("md", "## Best & Worst Model per Problem"))
    cells.append(("code", r"""
print('\n===== M7 DEEP LEARNING LEADERBOARD =====\n')
for pid in problems:
    sub = all_metrics[all_metrics['problem'] == pid].sort_values('RMSE')
    best  = sub.iloc[0]
    worst = sub.iloc[-1]
    print(f'{pid}:')
    print(f'  BEST  → {best["model"].upper():12s} RMSE={best["RMSE"]:.2f} MW')
    print(f'  WORST → {worst["model"].upper():12s} RMSE={worst["RMSE"]:.2f} MW')
    print()
""".strip()))

    cells.append(("md", "## Overall Best Models → Recommendation for M8"))
    cells.append(("code", r"""
overall = all_metrics.groupby('model')['RMSE'].mean().sort_values()
print('Average RMSE across all 4 problems:\n')
for model, rmse in overall.items():
    print(f'  {model.upper():12s}: {rmse:.2f} MW avg RMSE')

top3 = overall.head(3).index.tolist()
print('\n' + '='*58)
print('  RECOMMENDED MODELS TO CARRY INTO MILESTONE M8')
print('='*58)
for m in top3:
    print(f'  ✔  {m.upper()}')
print()
print('Rationale: lowest mean validation RMSE across all 4 forecast')
print('problems (S1, S24, D1, D24) with no test-set leakage.')
""".strip()))

    return cells


# ──────────────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Which notebooks to (re-)generate and execute
    todo = [
        ("lstm",    ),
        ("gru",     ),
        ("cnn_lstm",),
        ("bilstm",  ),
        ("dlinear", ),
    ]

    # Generate model notebooks
    for (key,) in todo:
        title, desc = MODEL_INFO[key]
        nb_path = NB_DIR / f"{title}.ipynb"
        nb = make_nb(build_model_nb(key, title, desc))
        nbformat.write(nb, nb_path)
        print(f"Generated: {nb_path.name}")

    # Generate summary notebook
    summary_path = NB_DIR / "summary.ipynb"
    nb = make_nb(build_summary_nb())
    nbformat.write(nb, summary_path)
    print(f"Generated: {summary_path.name}")

    print("\n" + "="*60)
    print("  STARTING EXECUTION — one notebook at a time")
    print("="*60)

    # Execute model notebooks
    for (key,) in todo:
        title, _ = MODEL_INFO[key]
        nb_path = NB_DIR / f"{title}.ipynb"
        try:
            execute_nb(nb_path)
        except Exception as e:
            print(f"\n  ERROR in {nb_path.name}: {e}")
            print("  Continuing with next notebook...")

    # Execute summary
    try:
        execute_nb(summary_path)
    except Exception as e:
        print(f"\n  ERROR in summary.ipynb: {e}")

    print("\n" + "="*60)
    print("  M7 COMPLETE — all notebooks executed and saved.")
    print("="*60)

