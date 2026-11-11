"""
Milestone M11 Tests — tests/test_m11_dashboard.py
=================================================
Validates exported GridPulse telemetry JSON bundles (`dashboard/public/data/`),
physical constraint preservation in serialized arrays, and frontend source completeness.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"
DATA_DIR = DASHBOARD_DIR / "public" / "data"


def test_dashboard_data_bundles_exist():
    for fname in ["manifest.json", "benchmarks.json", "test_2026.json", "val_2025.json"]:
        path = DATA_DIR / fname
        assert path.exists(), f"Missing exported bundle: {path}"
        assert path.stat().st_size > 1000, f"Bundle looks empty: {path}"


def test_manifest_and_benchmarks_integrity():
    manifest = json.loads((DATA_DIR / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["brand"] == "GridPulse"
    assert manifest["site"]["capacity_mw"] == pytest.approx(2050.0)
    assert manifest["verification"]["pytest_passed"] == 92
    assert manifest["verification"]["models_evaluated_test"] == 148

    bench = json.loads((DATA_DIR / "benchmarks.json").read_text(encoding="utf-8"))
    assert len(bench["m10_test_benchmark"]) == 148
    assert len(bench["val_vs_test_generalization"]) == 4
    assert set(bench["nnls_weights"].keys()) == {"S1", "S24", "D1", "D24"}
    assert len(bench["m8_seasonal_results"]) == 64


@pytest.mark.parametrize("split_file,expected_count", [
    ("test_2026.json", 1393),
    ("val_2025.json", 8737),
])
def test_split_bundle_schema_and_physics(split_file: str, expected_count: int):
    payload = json.loads((DATA_DIR / split_file).read_text(encoding="utf-8"))
    assert payload["count"] == expected_count
    assert len(payload["timestamps"]) == expected_count
    assert len(payload["weather"]["zenith"]) == expected_count
    assert len(payload["sections"]) == 8
    assert len(payload["shock_events"]) >= 8

    for prob in ["S1", "S24", "D1", "D24"]:
        p = payload["problems"][prob]
        assert len(p["y_true"]) == expected_count
        assert len(p["y_pred_post"]) == expected_count
        assert len(p["p10"]) == expected_count
        assert len(p["p90"]) == expected_count
        assert set(p["members"].keys()) == {"bilstm", "gru", "cnn_lstm", "dlinear", "lstm"}

        # Ensure zero NaNs/Infs exported
        assert all(math.isfinite(x) for x in p["y_pred_post"])

    # Verify M9 Night Clamp invariant preserved in exported JSON
    zenith = payload["weather"]["zenith"]
    for prob in ["S1", "S24"]:
        y_post = payload["problems"][prob]["y_pred_post"]
        night_violations = [
            (z, v) for z, v in zip(zenith, y_post) if z >= 90.0 and v > 0.01
        ]
        assert len(night_violations) == 0, f"{prob} night violation in {split_file}: {night_violations[:3]}"


def test_frontend_components_exist():
    required_files = [
        DASHBOARD_DIR / "index.html",
        DASHBOARD_DIR / "package.json",
        DASHBOARD_DIR / "src" / "App.tsx",
        DASHBOARD_DIR / "src" / "store" / "useGridStore.ts",
        DASHBOARD_DIR / "src" / "components" / "GridPulseLogo.tsx",
        DASHBOARD_DIR / "src" / "components" / "StoryIntro.tsx",
        DASHBOARD_DIR / "src" / "components" / "SpotlightTour.tsx",
        DASHBOARD_DIR / "src" / "components" / "ControlRoomShell.tsx",
        DASHBOARD_DIR / "src" / "rooms" / "MissionControl.tsx",
        DASHBOARD_DIR / "src" / "rooms" / "NeuralMixer.tsx",
        DASHBOARD_DIR / "src" / "rooms" / "CloudRadar.tsx",
        DASHBOARD_DIR / "src" / "rooms" / "DigitalTwin.tsx",
        DASHBOARD_DIR / "src" / "rooms" / "VivaWarRoom.tsx",
        DASHBOARD_DIR / "src" / "rooms" / "KsldcCompliance.tsx",
        DASHBOARD_DIR / "dist" / "index.html",
    ]
    for f in required_files:
        assert f.exists(), f"Missing frontend artifact: {f}"

