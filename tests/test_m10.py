"""Unit and integration tests for Milestone M10: Quarantined 2026 Test Set Evaluation."""

import numpy as np
import pandas as pd
import pytest

from src import config


PROBLEMS = ["S1", "S24", "D1", "D24"]


def test_m10_tables_exist_and_populated():
    """Verify M10 CSV and Markdown benchmark deliverables exist and cover all 4 problems."""
    bench_csv = config.RESULTS_TABLES_DIR / "m10_test_benchmark.csv"
    bench_md = config.RESULTS_TABLES_DIR / "m10_test_benchmark.md"
    gen_csv = config.RESULTS_TABLES_DIR / "m10_val_vs_test_generalization.csv"
    prob_csv = config.RESULTS_TABLES_DIR / "m10_test_probabilistic.csv"

    assert bench_csv.exists(), "m10_test_benchmark.csv missing"
    assert bench_md.exists(), "m10_test_benchmark.md missing"
    assert gen_csv.exists(), "m10_val_vs_test_generalization.csv missing"
    assert prob_csv.exists(), "m10_test_probabilistic.csv missing"

    df = pd.read_csv(bench_csv)
    assert len(df) >= 120, f"Expected full funnel rows (>=120), got {len(df)}"
    assert set(df["problem"].unique()) == set(PROBLEMS)
    assert set(df["dataset"].unique()) == {"test"}

    gen_df = pd.read_csv(gen_csv)
    assert len(gen_df) == 4
    assert set(gen_df["problem"].unique()) == set(PROBLEMS)

    prob_df = pd.read_csv(prob_csv)
    assert len(prob_df) == 4
    assert "Probabilistic Uncertainty Evaluation" in bench_md.read_text(encoding="utf-8")


def test_m10_prediction_parquets_aligned_and_2026_only():
    """Verify all M10 test predictions cover strictly Jan-Feb 2026 (1,393 aligned hours) with zero NaNs."""
    for prob in PROBLEMS:
        ind = pd.read_parquet(config.RESULTS_PREDICTIONS_DIR / f"m10_test_individual_{prob}.parquet")
        ens = pd.read_parquet(config.RESULTS_PREDICTIONS_DIR / f"m10_test_ensemble_{prob}.parquet")
        post = pd.read_parquet(config.RESULTS_PREDICTIONS_DIR / f"m10_test_postprocessed_{prob}.parquet")
        quant = pd.read_parquet(config.RESULTS_PREDICTIONS_DIR / f"m10_test_quantile_{prob}.parquet")

        for name, df in [("individual", ind), ("ensemble", ens), ("post", post), ("quantile", quant)]:
            assert len(df) == 1393, f"{prob} {name} length={len(df)}, expected 1393"
            assert not df.isna().any().any(), f"{prob} {name} contains NaNs"
            ts = pd.to_datetime(df["timestamp"])
            assert ts.min() >= pd.Timestamp("2026-01-01 00:00:00")
            assert ts.max() <= pd.Timestamp("2026-02-28 23:00:00")


def test_m10_solar_physical_constraints_on_test():
    """Enforce zero night solar, capacity limits [0, 2050] MW, and ramp limit <= 1000 MW/hr on Test."""
    for prob in ["S1", "S24"]:
        pp = pd.read_parquet(config.RESULTS_PREDICTIONS_DIR / f"m10_test_postprocessed_{prob}.parquet")
        X_raw = pd.read_parquet(config.PROCESSED_DATA_DIR / f"X_test_{prob}.parquet")
        zen = X_raw.loc[pp["timestamp"], "solar_zenith_deg"].values

        preds = pp["y_pred_postprocessed"].values
        assert np.all(preds[zen >= 90.0] == 0.0), f"{prob}: non-zero solar predicted at night!"
        assert np.all((preds >= 0.0) & (preds <= config.PLANT_CAPACITY_MW)), f"{prob}: solar out of [0, 2050] MW"
        ramps = np.abs(np.diff(preds))
        assert np.all(ramps <= 1000.0 + 1e-5), f"{prob}: max solar ramp {ramps.max():.2f} > 1000 MW/hr"


def test_m10_demand_bounds_on_test():
    """Enforce Karnataka grid operating bounds [4000, 20000] MW on Test demand predictions."""
    for prob in ["D1", "D24"]:
        pp = pd.read_parquet(config.RESULTS_PREDICTIONS_DIR / f"m10_test_postprocessed_{prob}.parquet")
        preds = pp["y_pred_postprocessed"].values
        assert np.all((preds >= 4000.0) & (preds <= 20000.0)), f"{prob}: demand outside [4000, 20000] MW"


def test_m10_duck_curve_conservation_on_test():
    """Verify P_net = P_demand - P_solar holds identically on the quarantined test set."""
    duck_path = config.RESULTS_PREDICTIONS_DIR / "m10_duck_curve_test.parquet"
    assert duck_path.exists()
    duck = pd.read_parquet(duck_path)
    assert len(duck) == 1393
    np.testing.assert_allclose(
        duck["true_net_load_mw"].values,
        duck["true_demand_mw"].values - duck["true_solar_mw"].values,
        atol=1e-4,
    )
    np.testing.assert_allclose(
        duck["pred_net_load_mw"].values,
        duck["pred_demand_mw"].values - duck["pred_solar_mw"].values,
        atol=1e-4,
    )


def test_m10_champion_beats_persistence_across_all_problems():
    """Verify Final champion model achieves strong positive skill (>50%) and R2 (>0.94) on all 4 problems."""
    df = pd.read_csv(config.RESULTS_TABLES_DIR / "m10_test_benchmark.csv")
    finals = df[df["tier"] == "Final"]
    assert len(finals) == 4
    for _, row in finals.iterrows():
        assert row["skill_vs_persistence"] > 50.0, f"{row['problem']} skill too low: {row['skill_vs_persistence']}"
        assert row["r2"] > 0.94, f"{row['problem']} R2 too low: {row['r2']}"
        assert row["rmse"] > 0.0


def test_m10_probabilistic_intervals_monotonic():
    """Verify P10 <= P50 <= P90 quantile monotonicity and calibrated coverage on Test."""
    prob_df = pd.read_csv(config.RESULTS_TABLES_DIR / "m10_test_probabilistic.csv")
    assert (prob_df["coverage_80pct"] >= 0.50).all()
    assert (prob_df["coverage_80pct"] <= 1.00).all()
    for prob in PROBLEMS:
        qdf = pd.read_parquet(config.RESULTS_PREDICTIONS_DIR / f"m10_test_quantile_{prob}.parquet")
        assert np.all(qdf["p10"].values <= qdf["p50"].values + 1e-6)
        assert np.all(qdf["p50"].values <= qdf["p90"].values + 1e-6)


def test_m10_figures_generated():
    """Verify all 15 publication-quality M10 evaluation figures were generated."""
    figs_dir = config.RESULTS_FIGURES_DIR / "m10_test_evaluation"
    expected = [
        "m10_model_progression.png",
        "m10_val_vs_test_comparison.png",
        "m10_duck_curve_test.png",
    ]
    for prob in PROBLEMS:
        expected.extend([
            f"m10_actual_vs_predicted_{prob}.png",
            f"m10_diagnostics_{prob}.png",
            f"m10_prob_fan_{prob}.png",
        ])
    for fname in expected:
        p = figs_dir / fname
        assert p.exists(), f"Missing M10 figure: {fname}"
        assert p.stat().st_size > 10_000, f"Figure too small / empty: {fname}"

