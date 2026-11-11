export type ProblemId = "S1" | "S24" | "D1" | "D24";
export type SplitId = "test_2026" | "val_2025";
export type ThemeMode = "dark" | "light";
export type RoomId =
  | "home"
  | "mission-control"
  | "neural-mixer"
  | "cloud-radar"
  | "digital-twin"
  | "viva-war-room"
  | "ksldc-compliance";

export type AppPhase = "story" | "reveal" | "app";

export interface ManifestData {
  brand: string;
  site: {
    name: string;
    region: string;
    grid_authority: string;
    capacity_mw: number;
    sections: number;
    section_capacity_mw: number;
    latitude: number;
    longitude: number;
    altitude_m: number;
    area_acres: number;
  };
  dataset: {
    total_hours: number;
    train_range: string;
    val_range: string;
    test_range: string;
  };
  verification: {
    pytest_passed: number;
    pytest_total: number;
    models_evaluated_test: number;
    dl_champions: number;
    optuna_studies: number;
    champion_pipeline: string;
    constraints: {
      solar_night_zenith_deg: number;
      solar_capacity_mw: [number, number];
      solar_max_ramp_mw_hr: number;
      demand_bounds_mw: [number, number];
    };
  };
  bundles: {
    test_2026: { file: string; count: number; size_kb: number };
    val_2025: { file: string; count: number; size_kb: number };
    benchmarks: { file: string; size_kb: number };
  };
}

export interface ProblemSeries {
  y_true: number[];
  y_pred_post: number[];
  y_pred_raw: number[];
  y_pred_nnls: number[];
  y_pred_equal: number[];
  y_pred_hybrid: number[];
  persistence: number[];
  p10: number[];
  p50: number[];
  p90: number[];
  members: {
    bilstm: number[];
    gru: number[];
    cnn_lstm: number[];
    dlinear: number[];
    lstm: number[];
  };
}

export interface ShockEvent {
  index: number;
  timestamp: string;
  solar_mw: number;
  pred_mw: number;
  delta_mw: number;
  ghi_wm2: number;
  clearsky_ghi_wm2: number;
  cloud_cover_pct: number;
  pi_width_mw: number;
  event_type: "Cloud Drop" | "Irradiance Surge";
}

export interface SplitDataset {
  split: SplitId;
  count: number;
  start: string;
  end: string;
  timestamps: string[];
  weather: {
    zenith: number[];
    ghi: number[];
    clearsky_ghi: number[];
    cloud_cover: number[];
    temp: number[];
    module_temp: number[];
    wind_speed: number[];
  };
  sections: Record<string, number[]>;
  duck_curve: {
    true_demand: number[];
    true_solar: number[];
    true_net_load: number[];
    pred_demand: number[];
    pred_solar: number[];
    pred_net_load: number[];
  };
  problems: Record<ProblemId, ProblemSeries>;
  shock_events: ShockEvent[];
}

export interface BenchmarkRow {
  problem: ProblemId;
  model: string;
  tier: string;
  rmse: number;
  mae: number;
  nmae_pct: number;
  mape_pct: number | null;
  smape_pct: number;
  r2: number;
  mbe: number;
  skill_vs_persistence: number;
  daylight_rmse: number | null;
  dataset: string;
}

export interface GeneralizationRow {
  problem: ProblemId;
  model: string;
  val_2025_rmse: number;
  test_2026_rmse: number;
  rmse_delta_mw: number;
  val_2025_mae: number;
  test_2026_mae: number;
  val_2025_r2: number;
  test_2026_r2: number;
  val_2025_skill_pct: number;
  test_2026_skill_pct: number;
}

export interface BenchmarksPayload {
  m10_test_benchmark: BenchmarkRow[];
  val_vs_test_generalization: GeneralizationRow[];
  m10_test_probabilistic: Array<{
    problem: ProblemId;
    pinball_q10: number;
    pinball_q50: number;
    pinball_q90: number;
    coverage_80pct: number;
    interval_width_mw: number;
  }>;
  m8_probabilistic_val: Array<Record<string, number | string>>;
  m8_seasonal_results: Array<{
    season: string;
    method: string;
    problem: ProblemId;
    n: number;
    rmse: number;
    mae: number;
    r2: number;
    skill: number;
  }>;
  m8_ensemble_results: Array<Record<string, number | string>>;
  m9_postprocessing_results: Array<Record<string, number | string>>;
  baselines_val: Array<Record<string, number | string>>;
  nnls_weights: Record<ProblemId, Record<string, number>>;
  optuna_best_params: Record<
    string,
    {
      model: string;
      problem: string;
      best_cv_huber: number;
      best_params: Record<string, number>;
    }
  >;
}

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

