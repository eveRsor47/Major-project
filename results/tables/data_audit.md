# Pavagada Solar + Load Forecasting: Data Audit Report

## 1. Executive Summary
The raw dataset `final_dataset.csv` contains **43,824 hourly rows** and **69 columns**, spanning from **2021-03-01 00:00:00 IST** to **2026-02-28 23:00:00 IST**.
The time series has **0 duplicate timestamps** and **0 missing hours** against a full hourly calendar grid.
Missing values exist only in weather variables (0.36% to 0.40% of rows) and demand variables (0.35%), while solar power generation has zero missing values. Grid anomaly flags identify **280 outage/curtailment hours (0.64%)** and **78 outlier hours (0.18%)**.

## 2. Temporal & Dimension Integrity
| Property | Observed Value | Expected / Requirement | Status |
| :--- | :--- | :--- | :--- |
| Row Count | 43,824 | 43,824 (5 full years: 2021-03 to 2026-02) | PASS |
| Column Count | 69 | 69 columns | PASS |
| Earliest Timestamp | 2021-03-01 00:00:00 | 2021-03-01 00:00:00 IST | PASS |
| Latest Timestamp | 2026-02-28 23:00:00 | 2026-02-28 23:00:00 IST | PASS |
| Duplicate Timestamps | 0 | 0 duplicates | PASS |
| Missing Hours in Grid | 0 | 0 gaps | PASS |

## 3. Physical Consistency & Sanity Rules
| Rule | Measured Value | Threshold | Result |
| :--- | :--- | :--- | :--- |
| Solar generation at night (elevation <= 0° or is_daylight=0) | 0.0000 MW | Exactly 0.0 MW | PASS |
| Capacity factor bounds | 0 violations | 0 violations in [0.0, 1.0] | PASS |
| Relative humidity bounds | 0 violations | 0 violations in [0.0, 100.0] | PASS |
| Section summation: sum(sec_1..8) == solar_power_mw | Max error: 0.003000 MW | < 1e-4 MW | PASS |
| Net load identity: demand_mw - solar_power_mw == net_load_mw | Max error: 0.010000 MW | < 1e-4 MW | PASS |

## 4. Missing Values Analysis
| Column Name | Missing Rows | Missing % | Action Required |
| :--- | :--- | :--- | :--- |
| `ghi_wm2` | 158 | 0.361% | Time-based interpolation (short gaps) / persistence |
| `dni_wm2` | 158 | 0.361% | Time-based interpolation (short gaps) / persistence |
| `dhi_wm2` | 158 | 0.361% | Time-based interpolation (short gaps) / persistence |
| `poa_irradiance_wm2` | 158 | 0.361% | Time-based interpolation (short gaps) / persistence |
| `temperature_2m_c` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `module_temp_c` | 158 | 0.361% | Time-based interpolation (short gaps) / persistence |
| `relative_humidity_pct` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `wind_speed_10m_ms` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `wind_direction_deg` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `cloud_cover_total_pct` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `cloud_cover_low_pct` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `cloud_cover_mid_pct` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `cloud_cover_high_pct` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `precipitation_mm` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `surface_pressure_hpa` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `aerosol_optical_depth` | 177 | 0.404% | Time-based interpolation (short gaps) / persistence |
| `demand_mw` | 153 | 0.349% | Time-based interpolation (short gaps) / persistence |
| `demand_met_mw` | 153 | 0.349% | Time-based interpolation (short gaps) / persistence |
| `net_load_mw` | 153 | 0.349% | Time-based interpolation (short gaps) / persistence |
| `solar_penetration_pct` | 153 | 0.349% | Time-based interpolation (short gaps) / persistence |
| `ramp_mw_per_hr` | 153 | 0.349% | Time-based interpolation (short gaps) / persistence |

## 5. Demand Growth & Year-over-Year Progression
Yearly average demand shows clear growth (~5.5% annual escalation):

| Year | Mean Demand (MW) | Notes |
| :--- | :--- | :--- |
| 2021 | 10165.18 MW | Starting March |
| 2022 | 10751.43 MW | Full year |
| 2023 | 11347.57 MW | Full year |
| 2024 | 11979.05 MW | Full year |
| 2025 | 12593.62 MW | Full year |
| 2026 | 13487.39 MW | Partial year (Jan-Feb) |

## 6. Key Descriptive Statistics
|       |   solar_power_mw |   demand_mw |   net_load_mw |   ghi_wm2 |   temperature_2m_c |   relative_humidity_pct |
|:------|-----------------:|------------:|--------------:|----------:|-------------------:|------------------------:|
| count |         43824    |    43671    |      43671    |  43666    |           43647    |                43647    |
| mean  |           443.34 |    11475    |      11031.5  |    230.72 |              26.57 |                   59.33 |
| std   |           584.7  |     2147.87 |       2001.89 |    306.96 |               4.88 |                   15.14 |
| min   |             0    |     6200    |       6200    |      0    |              14    |                   15.83 |
| 25%   |             0    |     9914.02 |       9556.12 |      0    |              23.24 |                   47.77 |
| 50%   |             1.3  |    11367.5  |      10873.1  |      0.63 |              26.42 |                   60.91 |
| 75%   |           882.84 |    12955.3  |      12351    |    455.41 |              29.45 |                   71.19 |
| max   |          1875.75 |    18534.5  |      18534.5  |   1136.26 |              43.5  |                   99    |

## 7. Column Hygiene & Leaky Column Categorization
Following Section 2A of the project roadmap:
- **Leaky Columns (Prohibited from feature matrices)**:
  - `solar_generation_mwh`
  - `capacity_factor`
  - `section_1_mw`
  - `section_2_mw`
  - `section_3_mw`
  - `section_4_mw`
  - `section_5_mw`
  - `section_6_mw`
  - `section_7_mw`
  - `section_8_mw`
  - `net_load_mw`
  - `solar_penetration_pct`
  - `ramp_mw_per_hr`
  - `demand_met_mw`
  - `shortage_mw`
- **Metadata / Generator Internals to Drop**:
  - `installed_capacity_mw_ac`
  - `installed_capacity_mw_dc`
  - `dc_ac_ratio`
  - `data_type`
  - `generation_method`
  - `timestamp_utc`
  - `soiling_loss_pct`
  - `degradation_factor`
- **Event Flags (Never use as predictive features; keep for evaluation)**:
  - `is_curtailed_or_outage` (0.64% of hours)
  - `is_outlier` (0.18% of hours)
