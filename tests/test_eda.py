from pathlib import Path
import pandas as pd
from src import config
from src.eda import run_eda_pipeline, run_stationarity_tests, plot_ramp_rate_distribution


def test_eda_figures_generated():
    expected_figs = [
        "fig01_solar_representative_weeks.png",
        "fig02_solar_daily_profile_by_season.png",
        "fig03_demand_profiles.png",
        "fig04_demand_vs_temperature.png",
        "fig05_solar_vs_irradiance.png",
        "fig06_monthly_solar_cuf_and_demand.png",
        "fig07_correlation_heatmap.png",
        "fig08_duck_curve_net_load.png",
        "fig09_acf_pacf_analysis.png",
        "fig10_ramp_rate_distribution.png",
    ]
    for fig_name in expected_figs:
        fig_path = config.FIGURES_EDA_DIR / fig_name if hasattr(config, "FIGURES_EDA_DIR") else config.RESULTS_FIGURES_DIR / fig_name
        if not fig_path.exists():
            fig_path = config.RESULTS_FIGURES_DIR / fig_name
        assert fig_path.exists(), f"Missing figure: {fig_name}"
        assert fig_path.stat().st_size > 10000, f"Figure too small: {fig_name}"


def test_stationarity_tests_table():
    stat_file = config.RESULTS_TABLES_DIR / "stationarity_tests.csv"
    assert stat_file.exists()
    df = pd.read_csv(stat_file)
    assert len(df) == 4
    assert "ADF Statistic" in df.columns
    assert "p-value" in df.columns


def test_ramp_rate_statistics_table():
    ramp_file = config.RESULTS_TABLES_DIR / "ramp_rate_statistics.csv"
    assert ramp_file.exists()
    df = pd.read_csv(ramp_file)
    assert len(df) == 3
    assert "P99 (Extreme Surge)" in df.columns


def test_eda_findings_report():
    findings_path = config.RESULTS_TABLES_DIR / "eda_findings.md"
    assert findings_path.exists()
    content = findings_path.read_text(encoding="utf-8")
    assert "Solar Diurnal Synchronization" in content
    assert "Duck Curve" in content
    assert "Thermal Load Sensitivity" in content
    assert "Autocorrelation" in content
    assert "Stationarity" in content
