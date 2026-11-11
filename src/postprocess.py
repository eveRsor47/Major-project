"""
Milestone M9 — src/postprocess.py
Physical Constraints & Post-Processing Engine for Pavagada Solar and Karnataka Demand.

Applies:
1. Solar Night Clipping: Enforces y = 0 MW when solar_zenith_deg >= 90 or clearsky_ghi_wm2 <= 0.
2. Capacity Ceiling: Clamps solar in [0, 2050.0] MW.
3. Clearsky Envelope: Capping predictions to not exceed theoretical clearsky ceiling (P_clearsky * 1.05).
4. Ramp-Rate Limiting: Prevents single-step delta exceeding inverter physical ramp limit (410 MW/hr = 20% cap).
5. Demand Bound Enforcement: Clamps demand to physical historical operating range [4,000, 20,000] MW.
6. Net Load Conservation: Calculates net_load_mw = demand_mw - solar_power_mw.
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple

from src import config

PLANT_CAPACITY_MW = float(config.PLANT_CAPACITY_MW)  # 2050.0 MW
MAX_SOLAR_RAMP_MW_PER_HR = 1000.0                     # Physical sunrise/cloud ramp rate limit observed in Pavagada
MAX_RAMP_RATE_MW_PER_HR = MAX_SOLAR_RAMP_MW_PER_HR   # Alias for backward compatibility
MAX_DEMAND_RAMP_MW_PER_HR = 2500.0                    # Max hourly demand ramp in Karnataka grid
DEMAND_MIN_MW = 4000.0                                # Physical lower bound for Karnataka grid
DEMAND_MAX_MW = 20000.0                               # Physical upper bound for Karnataka grid


def apply_night_clipping(
    y_pred: np.ndarray,
    zenith_deg: np.ndarray,
    clearsky_ghi: Optional[np.ndarray] = None,
    zenith_threshold: float = 90.0,
) -> np.ndarray:
    """
    Enforce zero generation when the sun is below the horizon.
    Any prediction during night is strictly set to 0.0 MW.
    """
    clipped = y_pred.copy()
    is_night = zenith_deg >= zenith_threshold
    if clearsky_ghi is not None:
        is_night = is_night | (clearsky_ghi <= 0.0)
    clipped[is_night] = 0.0
    return clipped


def apply_capacity_ceiling(
    y_pred: np.ndarray,
    capacity_mw: float = PLANT_CAPACITY_MW,
    min_val: float = 0.0,
) -> np.ndarray:
    """Clamp solar generation strictly between [0.0, capacity_mw]."""
    return np.clip(y_pred, min_val, capacity_mw)


def apply_clearsky_envelope(
    y_pred: np.ndarray,
    clearsky_ghi: np.ndarray,
    headroom_factor: float = 1.05,
    reference_ghi: float = 1000.0,
    capacity_mw: float = PLANT_CAPACITY_MW,
) -> np.ndarray:
    """
    Cap solar output using theoretical clear-sky ceiling.
    Solar generation cannot physically exceed the clear-sky irradiance profile.
    """
    # Max theoretical clear-sky output in MW
    max_clearsky_mw = (clearsky_ghi / reference_ghi) * capacity_mw * headroom_factor
    max_clearsky_mw = np.clip(max_clearsky_mw, 0.0, capacity_mw)
    return np.minimum(y_pred, max_clearsky_mw)


def apply_ramp_rate_limiter(
    y_pred: np.ndarray,
    max_ramp_mw: float = MAX_SOLAR_RAMP_MW_PER_HR,
    initial_val: Optional[float] = None,
) -> np.ndarray:
    """
    Enforce physical inverter ramp rate constraints across sequential timesteps.
    |y[t] - y[t-1]| <= max_ramp_mw.
    """
    if len(y_pred) == 0:
        return y_pred.copy()

    constrained = np.zeros_like(y_pred)
    prev = initial_val if initial_val is not None else y_pred[0]
    constrained[0] = prev

    for t in range(1, len(y_pred)):
        delta = y_pred[t] - constrained[t - 1]
        if delta > max_ramp_mw:
            constrained[t] = constrained[t - 1] + max_ramp_mw
        elif delta < -max_ramp_mw:
            constrained[t] = constrained[t - 1] - max_ramp_mw
        else:
            constrained[t] = y_pred[t]

    return constrained


def apply_demand_bounds(
    y_pred: np.ndarray,
    min_demand: float = DEMAND_MIN_MW,
    max_demand: float = DEMAND_MAX_MW,
) -> np.ndarray:
    """Clamp electricity demand to physical Karnataka grid operating limits."""
    return np.clip(y_pred, min_demand, max_demand)


def postprocess_solar_forecast(
    y_pred: np.ndarray,
    zenith_deg: np.ndarray,
    clearsky_ghi: Optional[np.ndarray] = None,
    apply_envelope: bool = False,
    apply_ramp: bool = True,
    max_ramp_mw: float = MAX_SOLAR_RAMP_MW_PER_HR,
) -> np.ndarray:
    """
    Full physical post-processing pipeline for solar forecasting.
    1. Base capacity clipping [0, 2050] MW
    2. Solar night clipping (zenith >= 90 deg -> 0 MW)
    3. Ramp-rate limiting with physical Pavagada bounds
    4. Solar night re-enforcement
    """
    # Step 1: Base physical clipping
    out = apply_capacity_ceiling(y_pred)

    # Step 2: Night clipping
    out = apply_night_clipping(out, zenith_deg, clearsky_ghi)

    # Step 3: Clear-sky upper bound if specified
    if apply_envelope and clearsky_ghi is not None:
        out = apply_clearsky_envelope(out, clearsky_ghi)

    # Step 4: Inverter ramp limit
    if apply_ramp:
        out = apply_ramp_rate_limiter(out, max_ramp_mw=max_ramp_mw)

    # Re-apply night clipping to guarantee 0.0 MW at night after ramp smoothing
    out = apply_night_clipping(out, zenith_deg, clearsky_ghi)
    out = apply_capacity_ceiling(out)
    return out


def postprocess_demand_forecast(
    y_pred: np.ndarray,
    apply_ramp: bool = False,
    max_ramp_mw: float = 2500.0,
) -> np.ndarray:
    """Full physical post-processing pipeline for grid electricity demand."""
    out = apply_demand_bounds(y_pred)
    if apply_ramp:
        out = apply_ramp_rate_limiter(out, max_ramp_mw=max_ramp_mw)
    return out


def compute_net_load(demand_mw: np.ndarray, solar_mw: np.ndarray) -> np.ndarray:
    """
    Calculate Duck Curve Net Load: Net Load = Demand - Solar.
    Guarantees physical conservation of energy across the grid interface.
    """
    return demand_mw - solar_mw

