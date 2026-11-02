"""Unit tests for Milestone 1: Data Audit."""

from src import config
from src.audit import run_data_audit


def test_audit_temporal_and_shape():
    """Verify raw dataset shape, date range, and continuity."""
    res = run_data_audit()
    assert res["total_rows"] == 43824
    assert res["total_cols"] == 69
    assert res["num_duplicates"] == 0
    assert res["missing_hours"] == 0
    assert res["dt_min"] == "2021-03-01 00:00:00"
    assert res["dt_max"] == "2026-02-28 23:00:00"


def test_audit_physical_bounds():
    """Verify physical constraints (night solar, capacity factor, RH)."""
    res = run_data_audit()
    assert res["night_solar_max"] == 0.0
    assert res["cf_violations"] == 0
    assert res["rh_violations"] == 0
    assert res["max_section_diff"] < 1e-2
    assert res["max_net_diff"] <= 0.05


def test_audit_report_generation():
    """Verify that results/tables/data_audit.md is generated and populated."""
    report_file = config.RESULTS_TABLES_DIR / "data_audit.md"
    assert report_file.exists()
    assert report_file.stat().st_size > 500
