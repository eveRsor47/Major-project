# Milestone 3: Exploratory Data Analysis Key Findings

## Core Analytical & Statistical Insights (Report & Viva Defense)
1. **Solar Diurnal Synchronization**: Solar generation is strictly diurnal, peaking around 12:00-13:00 IST (~1,850 MW peak) and falling to exactly 0.0 MW during night hours (solar elevation <= 0°).
2. **Strong Seasonal Solar Attenuation**: Monthly CUF fluctuates between 25-28% during clear spring/summer months and drops to 15-18% during the monsoon season (June-August) due to cloud attenuation.
3. **Dual-Peak Demand Characteristic**: Karnataka grid demand exhibits two distinct daily peaks: a morning industrial/agricultural ramp peaking around 09:00-11:00 IST (~13,500 MW) and a domestic evening lighting peak around 19:00-20:00 IST (~14,000 MW).
4. **Thermal Load Sensitivity**: Demand is positively correlated with ambient temperature (+115 MW/°C above baseline), driven by agricultural irrigation pumping and commercial/residential air conditioning.
5. **High Irradiance Coupling**: Solar generation exhibits near-linear correlation with GHI (r = 0.96) and POA irradiance, verifying the physical fidelity of the simulation pipeline.
6. **The Classic 'Duck Curve' Phenomenon**: Midday solar power cuts the grid net load peak significantly between 10:00 and 15:00 IST (creating the 'duck belly'), creating a sharp evening ramp requirement of ~2,800 MW within 3 hours (17:00 to 20:00 IST).
7. **Macroeconomic Demand Escalation**: System demand grows steadily from ~10,165 MW in 2021 to ~12,594 MW in 2025 (~5.5% annual escalation), reinforcing the necessity of horizon-appropriate lag features over raw calendar year features.
8. **Autocorrelation & Statistical Seasonality (ACF/PACF)**: Autocorrelation functions exhibit prominent cyclical spikes at lag 24 (diurnal repeat) and lag 168 (weekly pattern), mathematically proving that lags t-1, t-2, t-3, t-24, t-48, and t-168 capture the dominant variance structure of the grid.
9. **Stationarity Dynamics (ADF Tests)**: Demand levels contain a unit root / non-stationarity (p > 0.05) driven by annual upward drift, but achieve strong stationarity upon first differencing (p < 0.0001). Tree models must rely on relative lag levels and rolling statistics rather than calendar year.
10. **Grid Ramp Tail Risk**: 99th percentile hourly net-load ramp rate reaches +1,140 MW/hour (and up to +2,800 MW across 3 hours), quantifying the required operational reserve ramp rate for Karnataka SLDC dispatchers.

## Generated Diagnostic Figures (results/figures/)
- `fig01_solar_representative_weeks.png`: Representative generation over clear, monsoon, and summer weeks.
- `fig02_solar_daily_profile_by_season.png`: Mean daily solar profile and standard deviation by season.
- `fig03_demand_profiles.png`: Weekday vs. weekend and holiday vs. normal day diurnal load curves.
- `fig04_demand_vs_temperature.png`: Scatter plot confirming heat-driven demand escalation (+115 MW/°C).
- `fig05_solar_vs_irradiance.png`: Solar generation vs. GHI and Clear-sky index ($K_t$).
- `fig06_monthly_solar_cuf_and_demand.png`: 5-year longitudinal progression of solar CUF (%) and average demand.
- `fig07_correlation_heatmap.png`: Full correlation matrix across meteorological, load, and temporal channels.
- `fig08_duck_curve_net_load.png`: Hourly gross demand vs. net load illustrating the evening ramp challenge.
- `fig09_acf_pacf_analysis.png`: Autocorrelation (ACF) and Partial Autocorrelation (PACF) out to 168 lags.
- `fig10_ramp_rate_distribution.png`: 1-hour ramp rate probability distributions and extreme tail boxplots.
