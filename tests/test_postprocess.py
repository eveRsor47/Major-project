"""
Unit tests for Milestone M9 — src/postprocess.py
Validates all physical constraints, solar night clipping, capacity ceilings, ramp rate limits, and net load identity.
"""

import numpy as np
import pytest
from src.postprocess import (
    apply_night_clipping,
    apply_capacity_ceiling,
    apply_clearsky_envelope,
    apply_ramp_rate_limiter,
    apply_demand_bounds,
    postprocess_solar_forecast,
    postprocess_demand_forecast,
    compute_net_load,
    PLANT_CAPACITY_MW,
    MAX_RAMP_RATE_MW_PER_HR,
)


def test_night_clipping_zeros_night_solar():
    y_pred = np.array([0.0, 15.0, 250.0, 40.0, 1.2])
    zenith = np.array([95.0, 91.0, 45.0, 89.0, 102.0])  # >= 90 is night
    out = apply_night_clipping(y_pred, zenith)

    assert out[0] == 0.0
    assert out[1] == 0.0
    assert out[2] == 250.0  # daytime untouched
    assert out[3] == 40.0   # daytime untouched
    assert out[4] == 0.0


def test_capacity_ceiling_bounds():
    y_pred = np.array([-15.0, 0.0, 1500.0, 2050.0, 2100.0, 3000.0])
    out = apply_capacity_ceiling(y_pred)

    assert out[0] == 0.0
    assert out[1] == 0.0
    assert out[2] == 1500.0
    assert out[3] == 2050.0
    assert out[4] == 2050.0
    assert out[5] == 2050.0
    assert np.all(out >= 0.0)
    assert np.all(out <= PLANT_CAPACITY_MW)


def test_clearsky_envelope_caps_overprediction():
    clearsky_ghi = np.array([0.0, 500.0, 1000.0])
    y_pred = np.array([50.0, 1800.0, 2000.0])
    out = apply_clearsky_envelope(y_pred, clearsky_ghi, headroom_factor=1.0, reference_ghi=1000.0)

    assert out[0] == 0.0
    assert out[1] <= 1025.0
    assert out[2] <= 2050.0


def test_ramp_rate_limiter_smooths_spikes():
    # Large step change from 0 to 1000 MW exceeding 410 MW/hr
    y_pred = np.array([0.0, 1000.0, 1000.0, 0.0])
    out = apply_ramp_rate_limiter(y_pred, max_ramp_mw=410.0)

    assert out[0] == 0.0
    assert np.isclose(out[1], 410.0)
    assert np.isclose(out[2], 820.0)
    assert np.isclose(out[3], 410.0)
    diffs = np.abs(np.diff(out))
    assert np.all(diffs <= 410.0 + 1e-5)


def test_demand_bounds():
    y_pred = np.array([1000.0, 5000.0, 12000.0, 25000.0])
    out = apply_demand_bounds(y_pred, min_demand=4000.0, max_demand=20000.0)

    assert out[0] == 4000.0
    assert out[1] == 5000.0
    assert out[2] == 12000.0
    assert out[3] == 20000.0


def test_postprocess_solar_pipeline_guarantees_night_zero():
    y_pred = np.array([12.5, 450.0, 1200.0, 30.0, 5.0])
    zenith = np.array([105.0, 40.0, 25.0, 85.0, 95.0])
    clearsky = np.array([0.0, 600.0, 950.0, 100.0, 0.0])

    out = postprocess_solar_forecast(y_pred, zenith, clearsky)

    assert out[0] == 0.0
    assert out[4] == 0.0
    assert np.all(out >= 0.0)
    assert np.all(out <= PLANT_CAPACITY_MW)


def test_compute_net_load_identity():
    demand = np.array([12000.0, 13500.0, 14000.0])
    solar = np.array([500.0, 1800.0, 0.0])
    net = compute_net_load(demand, solar)

    expected = demand - solar
    np.testing.assert_array_almost_equal(net, expected)
    assert net[2] == demand[2]  # When solar is 0, Net Load == Demand

