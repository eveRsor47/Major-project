# Milestone M9: Physical Constraints & Post-Processing Results

Evaluation of raw ensemble forecasts against physical grid constraints on 2025 validation set.

| problem   | method         |   raw_rmse |   post_rmse |   raw_mae |   post_mae |   raw_r2 |   post_r2 |   skill_vs_persistence |   rmse_improvement_mw |
|:----------|:---------------|-----------:|------------:|----------:|-----------:|---------:|----------:|-----------------------:|----------------------:|
| S1        | equal_weight   |    42.6693 |     42.3348 |   15.078  |    12.092  | 0.99454  |  0.994626 |                79.9418 |              0.334484 |
| S1        | nnls           |    41.7547 |     41.3345 |   15.3303 |    12.0343 | 0.994772 |  0.994877 |                80.4158 |              0.42024  |
| S1        | stacking_ridge |    41.2894 |     41.1281 |   13.6935 |    12.2526 | 0.994888 |  0.994928 |                80.5136 |              0.161366 |
| S24       | equal_weight   |    50.5803 |     50.1234 |   19.6642 |    15.9503 | 0.992328 |  0.992466 |                76.3803 |              0.45697  |
| S24       | nnls           |    49.4428 |     48.5477 |   19.4388 |    14.5728 | 0.992669 |  0.992932 |                77.1228 |              0.895097 |
| S24       | stacking_ridge |    48.6011 |     48.2489 |   16.9803 |    14.865  | 0.992917 |  0.993019 |                77.2636 |              0.352171 |
| D1        | equal_weight   |   164.631  |    164.631  |  130.308  |   130.308  | 0.993919 |  0.993919 |                75.4268 |              0        |
| D1        | nnls           |   162.371  |    162.371  |  128.842  |   128.842  | 0.994084 |  0.994084 |                75.7641 |              0        |
| D1        | stacking_ridge |   162.345  |    162.345  |  128.844  |   128.844  | 0.994086 |  0.994086 |                75.768  |              0        |
| D24       | equal_weight   |   379.345  |    379.345  |  301.148  |   301.148  | 0.967711 |  0.967711 |                50.8174 |              0        |
| D24       | nnls           |   377.144  |    377.144  |  298.855  |   298.855  | 0.968085 |  0.968085 |                51.1028 |              0        |
| D24       | stacking_ridge |   372.824  |    372.824  |  296.127  |   296.127  | 0.968812 |  0.968812 |                51.663  |              0        |

### Physical Guarantees Enforced:
1. **Solar Night Generation Strictly = 0.00 MW**: All predictions where solar zenith angle $\ge 90^\circ$ or clear-sky GHI $\le 0$ are hard-clamped.
2. **Physical Inverter Ceiling**: Solar predictions bounded within $[0, 2050]$ MW.
3. **Inverter Ramp Rate Filter**: Single-step ramp rates exceeding $410$ MW/hr (20% plant capacity) are smoothed.
4. **Net Load Conservation Identity**: Confirmed $\text{Net Load} = \text{Demand} - \text{Solar}$ holds across all timesteps.
