# Milestone M10: Final Quarantined Test Set Benchmark & Viva Defense Report

**Test Period**: `2026-01-01` to `2026-02-28` (`1,416` raw hours, `1,393` sequence-aligned evaluation hours).
**Guarantee**: Zero test-set training, zero HPO leakage, strictly out-of-sample inference.

## 1. Executive Champion Summary (Pre-Registered Stacking Ridge + Physical Constraints)

| Problem | Target / Horizon | Test Persistence RMSE | Champion RMSE (MW) | Champion MAE (MW) | R2 | Skill vs Test Persistence |
|:--------|:-----------------|----------------------:|-------------------:|------------------:|---:|--------------------------:|
| **S1** | Solar power 1-hour ahead | 221.91 | **24.95** | 10.38 | 0.9984 | **+88.76%** |
| **S24** | Solar power 24-hours ahead | 151.23 | **29.00** | 12.19 | 0.9979 | **+80.82%** |
| **D1** | Demand 1-hour ahead | 679.31 | **160.28** | 127.10 | 0.9922 | **+76.41%** |
| **D24** | Demand 24-hours ahead | 777.70 | **373.18** | 298.46 | 0.9575 | **+52.01%** |

## 2. Generalization Audit: 2025 Validation vs Unseen 2026 Test

| problem   | model                                 |   val_2025_rmse |   test_2026_rmse |   rmse_delta_mw |   val_2025_mae |   test_2026_mae |   val_2025_r2 |   test_2026_r2 |   val_2025_skill_pct |   test_2026_skill_pct |
|:----------|:--------------------------------------|----------------:|-----------------:|----------------:|---------------:|----------------:|--------------:|---------------:|---------------------:|----------------------:|
| S1        | ensemble_stacking_ridge_postprocessed |          41.128 |           24.953 |         -16.175 |         12.253 |          10.378 |         0.995 |          0.998 |               80.514 |                88.755 |
| S24       | ensemble_stacking_ridge_postprocessed |          48.249 |           29     |         -19.249 |         14.865 |          12.192 |         0.993 |          0.998 |               77.264 |                80.824 |
| D1        | ensemble_stacking_ridge_postprocessed |         162.345 |          160.28  |          -2.065 |        128.844 |         127.104 |         0.994 |          0.992 |               75.768 |                76.406 |
| D24       | ensemble_stacking_ridge_postprocessed |         372.824 |          373.184 |           0.361 |        296.127 |         298.459 |         0.969 |          0.957 |               51.663 |                52.015 |

## 3. Probabilistic Uncertainty Evaluation (Quantile LightGBM P10/P50/P90 on Test)

| problem   |   pinball_q10 |   pinball_q50 |   pinball_q90 |   coverage_80pct |   interval_width_mw |
|:----------|--------------:|--------------:|--------------:|-----------------:|--------------------:|
| S1        |         3.661 |         5.468 |         2.108 |            0.865 |              28.487 |
| S24       |         3.835 |         5.614 |         2.185 |            0.877 |              31.17  |
| D1        |        39.99  |        78.57  |        42.108 |            0.653 |             430.228 |
| D24       |        76.223 |       175.493 |       119.171 |            0.632 |             895.149 |

## 4. Duck Curve Net Load Conservation (Test Set)

- **1-Hour Net Load (`P_demand - P_solar`)**: RMSE = **161.35 MW**, R2 = **0.9903**
- **24-Hour Net Load (`P_demand - P_solar`)**: RMSE = **374.64 MW**, R2 = **0.9479**

### Key Viva Defense Insights
- **Zero Overfitting Confirmed**: Demand generalization from 2025 full-year Val to Jan-Feb 2026 Test is nearly identical (`D1: 162.34 -> 160.28 MW`, `D24: 372.82 -> 373.18 MW`).
- **Seasonal Meteorology Effect on Solar**: Jan-Feb 2026 dry winter skies exhibit far lower cloud transient variance than monsoon-inclusive 2025 Val, driving S1 RMSE down to `24.95 MW` (`+88.76%` Skill) and S24 down to `29.00 MW` (`+80.82%` Skill).
- **Deep Learning Dominance on Grid Demand**: Sequence DL Stacking Ridge beats the strongest Classic ML model by `36.95 MW` on `D1` (`160.28` vs `197.23 MW` LightGBM) and `32.65 MW` on `D24` (`373.18` vs `405.83 MW` MLP).

## 5. Full Model Funnel Leaderboard by Problem (Test Set)

### S1: Solar power 1-hour ahead (Test Persistence = 221.91 MW)

| Model                                 | Tier          |   RMSE (MW) |   MAE (MW) |     R2 | MAPE (%)   |   Skill (%) |
|:--------------------------------------|:--------------|------------:|-----------:|-------:|:-----------|------------:|
| mlp                                   | Classic_ML    |       23.43 |       9.06 | 0.9986 | —          |       89.44 |
| ridge                                 | Linear_Stat   |       24.1  |       9.75 | 0.9985 | —          |       89.14 |
| linear                                | Linear_Stat   |       24.21 |       9.78 | 0.9985 | —          |       89.09 |
| ensemble_stacking_ridge_postprocessed | Final         |       24.95 |      10.38 | 0.9984 | —          |       88.76 |
| ensemble_stacking_ridge               | Ensemble      |       25.1  |      11.67 | 0.9984 | —          |       88.69 |
| ensemble_equal_weight_postprocessed   | PostProcessed |       25.55 |      10.28 | 0.9984 | —          |       88.49 |
| ensemble_nnls_postprocessed           | PostProcessed |       25.65 |      10.67 | 0.9984 | —          |       88.44 |
| ransac                                | Linear_Stat   |       25.83 |      10.57 | 0.9983 | —          |       88.36 |
| ensemble_equal_weight                 | Ensemble      |       26.03 |      13.43 | 0.9983 | —          |       88.27 |
| ensemble_nnls                         | Ensemble      |       26.13 |      13.8  | 0.9983 | —          |       88.23 |
| tuned_cnn_lstm                        | DL_Tuned      |       26.6  |      12.53 | 0.9982 | —          |       88.01 |
| lasso                                 | Linear_Stat   |       26.63 |      11.11 | 0.9982 | —          |       88    |
| hist_gradient_boosting                | Classic_ML    |       26.9  |      11    | 0.9982 | —          |       87.88 |
| huber                                 | Linear_Stat   |       26.91 |      11.53 | 0.9982 | —          |       87.87 |
| xgboost                               | Classic_ML    |       26.94 |      10.64 | 0.9982 | —          |       87.86 |
| gradient_boosting                     | Classic_ML    |       27.06 |      10.5  | 0.9982 | —          |       87.8  |
| tuned_bilstm                          | DL_Tuned      |       27.26 |      10.96 | 0.9981 | —          |       87.72 |
| lightgbm                              | Classic_ML    |       27.75 |      10.66 | 0.9981 | —          |       87.49 |
| ensemble_residual_hybrid(a=0.69)      | Ensemble      |       28.14 |      17.72 | 0.998  | —          |       87.32 |
| tuned_lstm                            | DL_Tuned      |       28.6  |      13.95 | 0.998  | —          |       87.11 |
| tuned_gru                             | DL_Tuned      |       28.78 |      18.4  | 0.9979 | —          |       87.03 |
| extra_trees                           | Classic_ML    |       29.03 |      11.28 | 0.9979 | —          |       86.92 |
| catboost                              | Classic_ML    |       29.35 |      12.89 | 0.9978 | —          |       86.77 |
| bilstm                                | DL_Untuned    |       30.45 |      14.71 | 0.9977 | —          |       86.28 |
| random_forest                         | Classic_ML    |       30.73 |      11.99 | 0.9976 | —          |       86.15 |
| tuned_dlinear                         | DL_Tuned      |       32.3  |      18.59 | 0.9974 | —          |       85.44 |
| cnn_lstm                              | DL_Untuned    |       34.01 |      17.74 | 0.9971 | —          |       84.67 |
| dlinear                               | DL_Untuned    |       34.83 |      21.5  | 0.997  | —          |       84.3  |
| gru                                   | DL_Untuned    |       36.94 |      19.34 | 0.9966 | —          |       83.35 |
| lstm                                  | DL_Untuned    |       36.95 |      19.43 | 0.9966 | —          |       83.35 |
| svr                                   | Classic_ML    |       48.8  |      21.3  | 0.994  | —          |       78.01 |
| elasticnet                            | Linear_Stat   |       50.37 |      26.67 | 0.9937 | —          |       77.3  |
| knn                                   | Classic_ML    |       51.83 |      25.35 | 0.9933 | —          |       76.64 |
| persistence_t24                       | Baseline      |      151.23 |      73.26 | 0.9428 | —          |       31.85 |
| persistence_t168                      | Baseline      |      151.38 |      73.46 | 0.9427 | —          |       31.78 |
| clearsky                              | Baseline      |      179.66 |     102.66 | 0.9193 | —          |       19.04 |
| smart_persistence                     | Baseline      |      201.54 |     118.15 | 0.8985 | —          |        9.18 |
| persistence_t1                        | Baseline      |      221.91 |     131.7  | 0.8769 | —          |        0    |

### S24: Solar power 24-hours ahead (Test Persistence = 151.23 MW)

| Model                                 | Tier          |   RMSE (MW) |   MAE (MW) |     R2 | MAPE (%)   |   Skill (%) |
|:--------------------------------------|:--------------|------------:|-----------:|-------:|:-----------|------------:|
| ransac                                | Linear_Stat   |       28.51 |      11.44 | 0.998  | —          |       81.15 |
| hist_gradient_boosting                | Classic_ML    |       28.7  |      11.6  | 0.9979 | —          |       81.03 |
| ensemble_nnls_postprocessed           | PostProcessed |       28.77 |      11.6  | 0.9979 | —          |       80.98 |
| lightgbm                              | Classic_ML    |       28.81 |      11.04 | 0.9979 | —          |       80.95 |
| ensemble_stacking_ridge_postprocessed | Final         |       29    |      12.19 | 0.9979 | —          |       80.82 |
| mlp                                   | Classic_ML    |       29.06 |      11.43 | 0.9979 | —          |       80.78 |
| ensemble_stacking_ridge               | Ensemble      |       29.12 |      12.94 | 0.9979 | —          |       80.75 |
| ensemble_nnls                         | Ensemble      |       29.3  |      14.54 | 0.9979 | —          |       80.63 |
| ensemble_residual_hybrid(a=0.71)      | Ensemble      |       29.3  |      14.82 | 0.9979 | —          |       80.62 |
| ridge                                 | Linear_Stat   |       29.36 |      11.38 | 0.9978 | —          |       80.59 |
| xgboost                               | Classic_ML    |       29.42 |      11.41 | 0.9978 | —          |       80.55 |
| tuned_gru                             | DL_Tuned      |       29.7  |      13.18 | 0.9978 | —          |       80.36 |
| ensemble_equal_weight_postprocessed   | PostProcessed |       29.99 |      11.92 | 0.9978 | —          |       80.17 |
| catboost                              | Classic_ML    |       29.99 |      12.5  | 0.9978 | —          |       80.17 |
| gradient_boosting                     | Classic_ML    |       30.09 |      11.21 | 0.9977 | —          |       80.1  |
| linear                                | Linear_Stat   |       30.31 |      11.87 | 0.9977 | —          |       79.96 |
| ensemble_equal_weight                 | Ensemble      |       30.54 |      15.27 | 0.9977 | —          |       79.8  |
| extra_trees                           | Classic_ML    |       30.73 |      11.96 | 0.9976 | —          |       79.68 |
| random_forest                         | Classic_ML    |       31.32 |      12.3  | 0.9975 | —          |       79.29 |
| lasso                                 | Linear_Stat   |       31.47 |      12.89 | 0.9975 | —          |       79.19 |
| tuned_bilstm                          | DL_Tuned      |       32.44 |      15.24 | 0.9974 | —          |       78.55 |
| huber                                 | Linear_Stat   |       35.11 |      15.34 | 0.9969 | —          |       76.78 |
| gru                                   | DL_Untuned    |       35.48 |      19.69 | 0.9969 | —          |       76.54 |
| cnn_lstm                              | DL_Untuned    |       35.49 |      18.12 | 0.9969 | —          |       76.53 |
| tuned_lstm                            | DL_Tuned      |       36.41 |      17.3  | 0.9967 | —          |       75.92 |
| bilstm                                | DL_Untuned    |       36.42 |      18.46 | 0.9967 | —          |       75.92 |
| tuned_cnn_lstm                        | DL_Tuned      |       36.64 |      19.18 | 0.9966 | —          |       75.77 |
| tuned_dlinear                         | DL_Tuned      |       36.67 |      22.44 | 0.9966 | —          |       75.75 |
| lstm                                  | DL_Untuned    |       38.62 |      21.94 | 0.9963 | —          |       74.46 |
| dlinear                               | DL_Untuned    |       40.33 |      24.65 | 0.9959 | —          |       73.33 |
| elasticnet                            | Linear_Stat   |       50.65 |      27.6  | 0.9936 | —          |       66.51 |
| svr                                   | Classic_ML    |       51.44 |      22.14 | 0.9934 | —          |       65.99 |
| knn                                   | Classic_ML    |       57.96 |      28.19 | 0.9916 | —          |       61.67 |
| persistence_t24                       | Baseline      |      151.23 |      73.26 | 0.9428 | —          |        0    |
| smart_persistence                     | Baseline      |      151.23 |      73.26 | 0.9428 | —          |        0    |
| persistence_t168                      | Baseline      |      151.38 |      73.46 | 0.9427 | —          |       -0.1  |
| clearsky                              | Baseline      |      179.66 |     102.66 | 0.9193 | —          |      -18.8  |

### D1: Demand 1-hour ahead (Test Persistence = 679.31 MW)

| Model                                 | Tier          |   RMSE (MW) |   MAE (MW) |     R2 |   MAPE (%) |   Skill (%) |
|:--------------------------------------|:--------------|------------:|-----------:|-------:|-----------:|------------:|
| ensemble_stacking_ridge               | Ensemble      |      160.28 |     127.1  | 0.9922 |       0.96 |       76.41 |
| ensemble_stacking_ridge_postprocessed | Final         |      160.28 |     127.1  | 0.9922 |       0.96 |       76.41 |
| ensemble_nnls                         | Ensemble      |      160.56 |     127.24 | 0.9921 |       0.96 |       76.36 |
| ensemble_nnls_postprocessed           | PostProcessed |      160.56 |     127.24 | 0.9921 |       0.96 |       76.36 |
| tuned_lstm                            | DL_Tuned      |      161.59 |     128.15 | 0.992  |       0.97 |       76.21 |
| ensemble_equal_weight                 | Ensemble      |      162.66 |     128.94 | 0.9919 |       0.98 |       76.06 |
| ensemble_equal_weight_postprocessed   | PostProcessed |      162.66 |     128.94 | 0.9919 |       0.98 |       76.06 |
| ensemble_residual_hybrid(a=0.90)      | Ensemble      |      163.75 |     129.65 | 0.9918 |       0.98 |       75.9  |
| tuned_gru                             | DL_Tuned      |      164.16 |     130.08 | 0.9918 |       0.99 |       75.83 |
| tuned_bilstm                          | DL_Tuned      |      165.6  |     131.35 | 0.9916 |       0.99 |       75.62 |
| tuned_cnn_lstm                        | DL_Tuned      |      173.53 |     139.24 | 0.9908 |       1.06 |       74.46 |
| tuned_dlinear                         | DL_Tuned      |      183.86 |     146.02 | 0.9897 |       1.11 |       72.93 |
| dlinear                               | DL_Untuned    |      196.49 |     156.09 | 0.9882 |       1.18 |       71.07 |
| lightgbm                              | Classic_ML    |      197.23 |     154.96 | 0.9881 |       1.17 |       70.97 |
| gru                                   | DL_Untuned    |      198.39 |     157.93 | 0.988  |       1.2  |       70.8  |
| cnn_lstm                              | DL_Untuned    |      198.54 |     158.11 | 0.988  |       1.2  |       70.77 |
| hist_gradient_boosting                | Classic_ML    |      201.12 |     158.43 | 0.9876 |       1.2  |       70.39 |
| catboost                              | Classic_ML    |      206.1  |     159.78 | 0.987  |       1.21 |       69.66 |
| bilstm                                | DL_Untuned    |      209.29 |     166.28 | 0.9866 |       1.25 |       69.19 |
| gradient_boosting                     | Classic_ML    |      212.95 |     167.04 | 0.9861 |       1.26 |       68.65 |
| lstm                                  | DL_Untuned    |      214.31 |     168.83 | 0.986  |       1.28 |       68.45 |
| mlp                                   | Classic_ML    |      221.95 |     176.03 | 0.985  |       1.34 |       67.33 |
| extra_trees                           | Classic_ML    |      224.57 |     175.87 | 0.9846 |       1.33 |       66.94 |
| huber                                 | Linear_Stat   |      230.05 |     177.07 | 0.9838 |       1.35 |       66.13 |
| ransac                                | Linear_Stat   |      232.49 |     179.68 | 0.9835 |       1.37 |       65.78 |
| linear                                | Linear_Stat   |      232.56 |     179.75 | 0.9835 |       1.37 |       65.77 |
| ridge                                 | Linear_Stat   |      232.78 |     179.93 | 0.9834 |       1.37 |       65.73 |
| lasso                                 | Linear_Stat   |      233.44 |     180.53 | 0.9834 |       1.37 |       65.64 |
| random_forest                         | Classic_ML    |      236.12 |     179.94 | 0.983  |       1.36 |       65.24 |
| xgboost                               | Classic_ML    |      244.03 |     189.35 | 0.9818 |       1.43 |       64.08 |
| elasticnet                            | Linear_Stat   |      418.56 |     331.95 | 0.9465 |       2.46 |       38.38 |
| mean_t24_t168                         | Baseline      |      590.64 |     447.28 | 0.8934 |       3.35 |       13.05 |
| persistence_t1                        | Baseline      |      679.31 |     540.74 | 0.859  |       4.13 |        0    |
| persistence_t168                      | Baseline      |      691.04 |     495.73 | 0.8541 |       3.69 |       -1.73 |
| svr                                   | Classic_ML    |      707.54 |     562.5  | 0.8471 |       4    |       -4.16 |
| persistence_t24                       | Baseline      |      777.7  |     602.88 | 0.8152 |       4.54 |      -14.48 |
| knn                                   | Classic_ML    |      898.56 |     806.5  | 0.7533 |       5.95 |      -32.27 |

### D24: Demand 24-hours ahead (Test Persistence = 777.70 MW)

| Model                                 | Tier          |   RMSE (MW) |   MAE (MW) |     R2 |   MAPE (%) |   Skill (%) |
|:--------------------------------------|:--------------|------------:|-----------:|-------:|-----------:|------------:|
| ensemble_stacking_ridge               | Ensemble      |      373.18 |     298.46 | 0.9575 |       2.25 |       52.01 |
| ensemble_stacking_ridge_postprocessed | Final         |      373.18 |     298.46 | 0.9575 |       2.25 |       52.01 |
| ensemble_nnls                         | Ensemble      |      379.63 |     301.75 | 0.956  |       2.27 |       51.19 |
| ensemble_nnls_postprocessed           | PostProcessed |      379.63 |     301.75 | 0.956  |       2.27 |       51.19 |
| ensemble_residual_hybrid(a=0.72)      | Ensemble      |      379.87 |     301.28 | 0.9559 |       2.26 |       51.15 |
| tuned_gru                             | DL_Tuned      |      386.48 |     307.26 | 0.9544 |       2.31 |       50.3  |
| ensemble_equal_weight                 | Ensemble      |      386.68 |     308.73 | 0.9543 |       2.32 |       50.28 |
| ensemble_equal_weight_postprocessed   | PostProcessed |      386.68 |     308.73 | 0.9543 |       2.32 |       50.28 |
| gru                                   | DL_Untuned    |      398.3  |     318.25 | 0.9515 |       2.4  |       48.78 |
| tuned_cnn_lstm                        | DL_Tuned      |      402.38 |     324.74 | 0.9505 |       2.44 |       48.26 |
| tuned_bilstm                          | DL_Tuned      |      404.1  |     324.79 | 0.9501 |       2.46 |       48.04 |
| mlp                                   | Classic_ML    |      405.83 |     325.08 | 0.9497 |       2.44 |       47.82 |
| dlinear                               | DL_Untuned    |      411.64 |     324.05 | 0.9482 |       2.45 |       47.07 |
| tuned_dlinear                         | DL_Tuned      |      414.51 |     324.63 | 0.9475 |       2.44 |       46.7  |
| lstm                                  | DL_Untuned    |      422.41 |     335.41 | 0.9455 |       2.52 |       45.68 |
| bilstm                                | DL_Untuned    |      428.96 |     343.07 | 0.9438 |       2.57 |       44.84 |
| tuned_lstm                            | DL_Tuned      |      440.32 |     351.05 | 0.9408 |       2.63 |       43.38 |
| cnn_lstm                              | DL_Untuned    |      441.4  |     350.86 | 0.9405 |       2.63 |       43.24 |
| extra_trees                           | Classic_ML    |      443.85 |     344.1  | 0.9398 |       2.55 |       42.93 |
| ransac                                | Linear_Stat   |      444.8  |     346.68 | 0.9396 |       2.6  |       42.81 |
| huber                                 | Linear_Stat   |      445.67 |     347.64 | 0.9393 |       2.61 |       42.69 |
| linear                                | Linear_Stat   |      453.49 |     353.79 | 0.9372 |       2.65 |       41.69 |
| lasso                                 | Linear_Stat   |      453.61 |     353.08 | 0.9371 |       2.64 |       41.67 |
| ridge                                 | Linear_Stat   |      453.68 |     353.73 | 0.9371 |       2.65 |       41.66 |
| lightgbm                              | Classic_ML    |      456.16 |     356.32 | 0.9364 |       2.63 |       41.35 |
| gradient_boosting                     | Classic_ML    |      461.2  |     359.81 | 0.935  |       2.66 |       40.7  |
| xgboost                               | Classic_ML    |      468.09 |     363.78 | 0.9331 |       2.69 |       39.81 |
| catboost                              | Classic_ML    |      477.87 |     372.54 | 0.9302 |       2.75 |       38.55 |
| random_forest                         | Classic_ML    |      482.24 |     371.02 | 0.929  |       2.75 |       37.99 |
| hist_gradient_boosting                | Classic_ML    |      495.33 |     384.23 | 0.925  |       2.81 |       36.31 |
| mean_t24_t168                         | Baseline      |      590.64 |     447.28 | 0.8934 |       3.35 |       24.05 |
| elasticnet                            | Linear_Stat   |      621.05 |     490.89 | 0.8822 |       3.56 |       20.14 |
| persistence_t168                      | Baseline      |      691.04 |     495.73 | 0.8541 |       3.69 |       11.14 |
| persistence_t24                       | Baseline      |      777.7  |     602.88 | 0.8152 |       4.54 |        0    |
| svr                                   | Classic_ML    |      877.66 |     726.8  | 0.7647 |       5.2  |      -12.85 |
| knn                                   | Classic_ML    |     1056.72 |     945.15 | 0.6589 |       6.96 |      -35.88 |

---

### Test Integrity & Scientific Guarantees
1. **Zero Data Leakage**: Test set (`2026-01-01` to `2026-02-28`) was strictly quarantined until M10 unblinding.
2. **Apples-to-Apples Alignment**: All 7 model tiers (Baselines → Final Post-Processed) evaluated on identical `N = 1,393` timestamps (`ts_test`).
3. **Pre-Registered Selection**: Ensemble weights (`nnls_weights_*.json`), Ridge stacking meta-learners, residual alphas, and M9 champion choice were finalized strictly on 2025 validation data.
4. **Physical Feasibility**: Zero night solar generation verified (`zenith >= 90°`), `[0, 2050]` MW solar bounds, `<= 1000 MW/hr` ramp limit, and `[4000, 20000]` MW demand bounds enforced.
