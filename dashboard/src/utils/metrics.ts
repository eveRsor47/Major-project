import type { ProblemId, ProblemSeries, RoomId, TourStep } from "../types";

export interface LiveMetrics {
  rmse: number;
  mae: number;
  nmaePct: number;
  mapePct: number | null;
  r2: number;
  mbe: number;
  skillPct: number;
  dsmInBandPct: number;
}

export const DL_MODEL_LABELS: Record<keyof ProblemSeries["members"], { name: string; color: string }> = {
  bilstm: { name: "BiLSTM", color: "#5CB8E4" },
  gru: { name: "GRU", color: "#9F8FEF" },
  cnn_lstm: { name: "CNN-LSTM", color: "#E5A93C" },
  dlinear: { name: "DLinear", color: "#34D399" },
  lstm: { name: "LSTM", color: "#E07A9B" },
};

export function computeMetrics(
  yTrue: number[],
  yPred: number[],
  persistence: number[],
  problem: ProblemId
): LiveMetrics {
  const n = Math.min(yTrue.length, yPred.length, persistence.length);
  if (n === 0) {
    return { rmse: 0, mae: 0, nmaePct: 0, mapePct: null, r2: 0, mbe: 0, skillPct: 0, dsmInBandPct: 0 };
  }

  const isSolar = problem === "S1" || problem === "S24";
  const capacityNorm = isSolar ? 2050.0 : 13481.2;

  let sse = 0;
  let sae = 0;
  let sumErr = 0;
  let ssePers = 0;
  let sumY = 0;
  let apeSum = 0;
  let apeCount = 0;
  let dsmHits = 0;
  let dsmTotal = 0;

  for (let i = 0; i < n; i++) {
    const yt = yTrue[i];
    const yp = yPred[i];
    const per = persistence[i];
    const err = yp - yt;

    sse += err * err;
    sae += Math.abs(err);
    sumErr += err;
    ssePers += (per - yt) * (per - yt);
    sumY += yt;

    if (!isSolar && Math.abs(yt) > 100) {
      apeSum += Math.abs(err) / Math.abs(yt);
      apeCount++;
    }

    // DSM +/-10% band compliance (daylight or active MW > 50 for solar, always for demand)
    if (!isSolar || yt > 50 || yp > 50) {
      dsmTotal++;
      const denom = isSolar ? 2050.0 : Math.max(yt, 1000);
      if (Math.abs(err) / denom <= 0.10) {
        dsmHits++;
      }
    }
  }

  const meanY = sumY / n;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    const dy = yTrue[i] - meanY;
    sst += dy * dy;
  }

  const rmse = Math.sqrt(sse / n);
  const persRmse = Math.sqrt(ssePers / n);
  const mae = sae / n;
  const r2 = sst > 1e-6 ? 1 - sse / sst : 1.0;
  const skillPct = persRmse > 1e-6 ? (1 - rmse / persRmse) * 100 : 0;

  return {
    rmse,
    mae,
    nmaePct: (mae / capacityNorm) * 100,
    mapePct: !isSolar && apeCount > 0 ? (apeSum / apeCount) * 100 : null,
    r2,
    mbe: sumErr / n,
    skillPct,
    dsmInBandPct: dsmTotal > 0 ? (dsmHits / dsmTotal) * 100 : 100,
  };
}

export function blendMembers(
  members: ProblemSeries["members"],
  rawWeights: Record<keyof ProblemSeries["members"], number>,
  applyNightClamp: boolean,
  zenith?: number[]
): number[] {
  const keys = Object.keys(rawWeights) as Array<keyof ProblemSeries["members"]>;
  const weightSum = keys.reduce((acc, k) => acc + Math.max(0, rawWeights[k]), 0);
  const norm: Record<string, number> = {};
  if (weightSum <= 1e-9) {
    keys.forEach((k) => {
      norm[k] = 1 / keys.length;
    });
  } else {
    keys.forEach((k) => {
      norm[k] = Math.max(0, rawWeights[k]) / weightSum;
    });
  }

  const n = members.bilstm.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let val =
      members.bilstm[i] * norm.bilstm +
      members.gru[i] * norm.gru +
      members.cnn_lstm[i] * norm.cnn_lstm +
      members.dlinear[i] * norm.dlinear +
      members.lstm[i] * norm.lstm;

    if (applyNightClamp) {
      if (zenith && zenith[i] >= 90) {
        val = 0;
      } else {
        val = Math.min(2050, Math.max(0, val));
      }
    }
    out[i] = val;
  }
  return out;
}

export const PROBLEM_META: Record<
  ProblemId,
  { code: string; title: string; horizon: string; unit: string; targetType: "Solar" | "Demand" }
> = {
  S1: { code: "S1", title: "Solar 1-Hr Dispatch", horizon: "t + 1h", unit: "MW", targetType: "Solar" },
  S24: { code: "S24", title: "Solar 24-Hr Day-Ahead", horizon: "t + 24h", unit: "MW", targetType: "Solar" },
  D1: { code: "D1", title: "Demand 1-Hr Load", horizon: "t + 1h", unit: "MW", targetType: "Demand" },
  D24: { code: "D24", title: "Demand 24-Hr Schedule", horizon: "t + 24h", unit: "MW", targetType: "Demand" },
};

export const ROOM_META: Array<{ id: RoomId; label: string; shortLabel: string; subtitle: string }> = [
  { id: "mission-control", label: "Mission Control", shortLabel: "Control", subtitle: "Live Multi-Horizon Telemetry & Duck Curve" },
  { id: "neural-mixer", label: "Neural Mixer", shortLabel: "Mixer", subtitle: "5-DL Ensemble Weight Synthesizer & Seasons" },
  { id: "cloud-radar", label: "Cloud Radar", shortLabel: "Radar", subtitle: "Ramp Interception, P10–P90 Bands & Derating" },
  { id: "digital-twin", label: "8-Block Digital Twin", shortLabel: "Park Twin", subtitle: "Pavagada 2,050 MW Isometric Sector Map" },
  { id: "viva-war-room", label: "Viva War Room", shortLabel: "Viva Lab", subtitle: "Zero-Leakage Audit & 148-Model Leaderboard" },
  { id: "ksldc-compliance", label: "KSLDC DSM Suite", shortLabel: "DSM Suite", subtitle: "Grid Penalty Simulator & Compliance Report" },
];

export const TOUR_BY_ROOM: Record<RoomId, TourStep[]> = {
  "mission-control": [
    {
      targetId: "mc-hero-kpis",
      title: "Real-Time KSLDC Telemetry HUD",
      description:
        "Displays verified Pavagada solar output (up to 2,050 MW), Karnataka state load, computed Duck Curve Net Load (Demand - Solar), and instantaneous ramp severity at your selected hour.",
      placement: "bottom",
    },
    {
      targetId: "mc-problem-tabs",
      title: "Dual-Horizon Forecast Switcher",
      description:
        "Switch seamlessly between 1-Hour Real-Time Dispatch (S1 / D1) and 24-Hour Day-Ahead Market Bidding (S24 / D24) across Solar & Demand targets.",
      placement: "bottom",
    },
    {
      targetId: "mc-split-toggle",
      title: "Quarantined Test 2026 vs Val 2025",
      description:
        "Compare the strictly quarantined Jan–Feb 2026 Test set (1,393 hrs) against the full-year 2025 Validation dataset (8,737 hrs — lazy-loaded on demand).",
      placement: "bottom",
    },
    {
      targetId: "mc-forecast-chart",
      title: "Multi-Layer Probabilistic Trace",
      description:
        "Inspect true telemetry alongside the Champion Stacking Ridge + M9 prediction, Quantile LightGBM 80% risk envelope (P10–P90), persistence baseline, and solar night-zenith shading.",
      placement: "top",
    },
    {
      targetId: "mc-time-scrubber",
      title: "Chronological Dispatch Scrubber",
      description:
        "Scrub through every verified hour or press Play to watch sunrise generation, afternoon peaks, and the evening net-load ramp unfold in sync with M9 physical safety gates.",
      placement: "top",
    },
  ],
  "neural-mixer": [
    {
      targetId: "nm-tournament",
      title: "4-Way Ensemble Tournament",
      description:
        "Compares Equal Weight, Non-Negative Least Squares (NNLS), Ridge Meta-Learner Stacking (Champion), and Residual Hybrid strategies across M8/M10 benchmarks.",
      placement: "bottom",
    },
    {
      targetId: "nm-sliders",
      title: "Interactive 5-DL Weight Mixer",
      description:
        "Adjust BiLSTM, GRU, CNN-LSTM, DLinear, and LSTM blending weights. RMSE, MAE, R², and Skill % recompute live over the actual 1,393 / 8,737 predictions in real time.",
      placement: "right",
    },
    {
      targetId: "nm-nnls-btn",
      title: "Mathematical NNLS Auto-Solver",
      description:
        "Click to snap the 5 neural weights directly to the exact scipy Non-Negative Least Squares solution learned on Validation 2025 with zero test leakage.",
      placement: "bottom",
    },
    {
      targetId: "nm-seasonal",
      title: "Seasonal Error Decomposition",
      description:
        "Inspect how Monsoon cloud intermittency contrasts with crisp Winter predictability across all four seasonal partitions on Validation 2025.",
      placement: "top",
    },
  ],
  "cloud-radar": [
    {
      targetId: "cr-radar",
      title: "Pavagada Doppler Irradiance Radar",
      description:
        "Visualizes real cloud cover percentage, clear-sky GHI ratio (GHI / ClearSky), wind vector speed, and irradiance drop severity centered on 14.281°N, 77.425°E.",
      placement: "right",
    },
    {
      targetId: "cr-shocks",
      title: "Real Micro-Ramp & Cloud Shock Feed",
      description:
        "Click any detected ramp shock from the dataset to zoom the local uncertainty window and observe how Quantile LightGBM P10–P90 risk bounds widen automatically.",
      placement: "left",
    },
    {
      targetId: "cr-thermal",
      title: "Ambient vs Module Thermal Derating",
      description:
        "Plots real hourly ambient vs PV module temperature behavior against normalized clear-sky efficiency across Pavagada's semi-arid plateau.",
      placement: "top",
    },
  ],
  "digital-twin": [
    {
      targetId: "dt-park-map",
      title: "Pavagada 8-Sector Spatial Park Twin",
      description:
        "Represents the real 13,000-acre 2,050 MW facility divided into its 8 measured sectors (256.25 MW each), shaded in real time by hourly generation and cloud cover.",
      placement: "right",
    },
    {
      targetId: "dt-block-inspector",
      title: "Block-Level String Telemetry",
      description:
        "Click any block (NTPC, SECI, KREDL, Adani, Tata Power, Fortum, SB Energy) to inspect its exact real section MW output, inverter loading, and clear-sky index.",
      placement: "left",
    },
  ],
  "viva-war-room": [
    {
      targetId: "vw-seal",
      title: "Zero-Leakage Cryptographic & Test Audit",
      description:
        "Summarizes strict chronological isolation (2021–24 Train → 2025 Val → 2026 Quarantined Test) and the 97/97 automated pytest engineering suite.",
      placement: "bottom",
    },
    {
      targetId: "vw-qa",
      title: "Interactive Oral Defense Simulator",
      description:
        "Click common examiner questions (clear-sky linear parity, 1,000 MW/hr ramp cap vs 410, Optuna Huber tuning) to view empirical metrics and architectural answers.",
      placement: "bottom",
    },
    {
      targetId: "vw-leaderboard",
      title: "Complete 148-Model Test Leaderboard",
      description:
        "Search, sort, and filter all 148 benchmark evaluations across Baselines, Linear/Stat, Classic ML, Untuned DL, Optuna-Tuned DL, and Ensembles.",
      placement: "top",
    },
  ],
  "ksldc-compliance": [
    {
      targetId: "kc-dsm-sim",
      title: "CERC / KERC ±10% DSM Penalty Simulator",
      description:
        "Simulate Deviation Settlement Mechanism financial exposure comparing Stacking Ridge + M9 against naive persistence and single deep learning baselines.",
      placement: "bottom",
    },
    {
      targetId: "kc-matrix",
      title: "Executive 4-Problem Benchmark Matrix",
      description:
        "Complete verification table of RMSE, MAE, nMAE, MAPE, R², and Skill Score across S1, S24, D1, and D24, plus a Print-Ready Compliance Dossier export.",
      placement: "top",
    },
  ],
};

