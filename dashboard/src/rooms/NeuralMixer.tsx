import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, Trophy } from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { EChartBox } from "../components/EChartBox";
import {
  DL_MODEL_LABELS,
  PROBLEM_META,
  blendMembers,
  computeMetrics,
} from "../utils/metrics";
import type { ProblemId, ProblemSeries } from "../types";
import { sfx } from "../utils/sfx";

type MemberKey = keyof ProblemSeries["members"];
const MEMBER_KEYS: MemberKey[] = ["bilstm", "gru", "cnn_lstm", "dlinear", "lstm"];

export function NeuralMixer() {
  const {
    activeProblem,
    setProblem,
    activeSplit,
    testData,
    valData,
    benchmarks,
    completeQuest,
  } = useGridStore();

  const ds = activeSplit === "val_2025" && valData ? valData : testData;
  const isSolar = activeProblem === "S1" || activeProblem === "S24";

  const [weights, setWeights] = useState<Record<MemberKey, number>>({
    bilstm: 0.2,
    gru: 0.2,
    cnn_lstm: 0.2,
    dlinear: 0.2,
    lstm: 0.2,
  });
  const [applyNightClamp, setApplyNightClamp] = useState(true);

  // Sync default display to equal weights on problem switch unless user optimizes
  useEffect(() => {
    setWeights({ bilstm: 0.2, gru: 0.2, cnn_lstm: 0.2, dlinear: 0.2, lstm: 0.2 });
  }, [activeProblem]);

  const nnlsOptimal = benchmarks?.nnls_weights[activeProblem];

  const handleSolveNnls = () => {
    if (!nnlsOptimal) return;
    sfx.playOptimize();
    setWeights({
      bilstm: Number((nnlsOptimal.bilstm ?? 0).toFixed(3)),
      gru: Number((nnlsOptimal.gru ?? 0).toFixed(3)),
      cnn_lstm: Number((nnlsOptimal.cnn_lstm ?? 0).toFixed(3)),
      dlinear: Number((nnlsOptimal.dlinear ?? 0).toFixed(3)),
      lstm: Number((nnlsOptimal.lstm ?? 0).toFixed(3)),
    });
    completeQuest("ranNnlsSolver");
  };

  const handleEqualize = () => {
    sfx.playTick(500, 0.04, 0.02);
    setWeights({ bilstm: 0.2, gru: 0.2, cnn_lstm: 0.2, dlinear: 0.2, lstm: 0.2 });
  };

  // Compute real-time blend vector & metrics across every hour of active split
  const { liveBlend, liveMetrics, refMetrics } = useMemo(() => {
    if (!ds) {
      return { liveBlend: [], liveMetrics: null, refMetrics: null };
    }
    const prob = ds.problems[activeProblem];
    const blend = blendMembers(
      prob.members,
      weights,
      isSolar && applyNightClamp,
      ds.weather.zenith
    );
    const lm = computeMetrics(prob.y_true, blend, prob.persistence, activeProblem);
    const rm = computeMetrics(prob.y_true, prob.y_pred_post, prob.persistence, activeProblem);
    return { liveBlend: blend, liveMetrics: lm, refMetrics: rm };
  }, [ds, activeProblem, weights, isSolar, applyNightClamp]);

  // Tournament cards computed directly from dataset split + benchmark reference
  const tournamentRows = useMemo(() => {
    if (!ds) return [];
    const prob = ds.problems[activeProblem];
    const candidates = [
      { id: "equal", label: "Equal-Weight Average", pred: prob.y_pred_equal, tag: "Baseline Ens" },
      { id: "nnls", label: "NNLS Convex Solver", pred: prob.y_pred_nnls, tag: "Optimal Non-Neg" },
      { id: "ridge", label: "Stacking Ridge + M9", pred: prob.y_pred_post, tag: "Champion" },
      { id: "hybrid", label: "Residual Hybrid", pred: prob.y_pred_hybrid, tag: "Ridge+Trees" },
    ];
    return candidates
      .map((c) => ({
        ...c,
        metrics: computeMetrics(prob.y_true, c.pred, prob.persistence, activeProblem),
      }))
      .sort((a, b) => a.metrics.rmse - b.metrics.rmse);
  }, [ds, activeProblem]);

  // Chart: First 120 hours comparison Actual vs Champion vs User Live Mix
  const mixerChartOption = useMemo(() => {
    if (!ds || liveBlend.length === 0) return {};
    const prob = ds.problems[activeProblem];
    const sliceLen = Math.min(144, ds.count);
    const ts = ds.timestamps.slice(0, sliceLen).map((s) => s.replace("T", " ").slice(5));
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8,13,25,0.95)",
        borderColor: "rgba(56,189,248,0.35)",
        textStyle: { color: "#E2E8F0", fontSize: 11, fontFamily: "JetBrains Mono" },
      },
      legend: { top: 0, textStyle: { color: "#94A3B8", fontSize: 11 } },
      grid: { top: 34, left: 54, right: 16, bottom: 26 },
      xAxis: {
        type: "category",
        data: ts,
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      series: [
        {
          name: "Actual Ground Truth",
          type: "line",
          showSymbol: false,
          data: prob.y_true.slice(0, sliceLen),
          lineStyle: { width: 2.2, color: "#F8FAFC" },
        },
        {
          name: "Your Live Neural Mix",
          type: "line",
          showSymbol: false,
          data: liveBlend.slice(0, sliceLen),
          lineStyle: { width: 2.4, color: "#F59E0B" },
        },
        {
          name: "Champion Stacking Ridge",
          type: "line",
          showSymbol: false,
          data: prob.y_pred_post.slice(0, sliceLen),
          lineStyle: { width: 1.8, type: "dashed", color: "#06B6D4" },
        },
      ],
    };
  }, [ds, activeProblem, liveBlend]);

  // Seasonal Error Chart (Val 2025 M8 seasonal breakdown)
  const seasonalChartOption = useMemo(() => {
    const rows = (benchmarks?.m8_seasonal_results ?? []).filter(
      (r) => r.problem === activeProblem
    );
    const seasons = ["Winter", "Summer", "Monsoon", "PostMon"];
    const methods = [
      { key: "equal_weight", name: "Equal Weight", color: "#64748B" },
      { key: "nnls", name: "NNLS", color: "#F59E0B" },
      { key: "stacking_ridge", name: "Stacking Ridge", color: "#06B6D4" },
      { key: "residual_hybrid", name: "Residual Hybrid", color: "#A855F7" },
    ];
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8,13,25,0.95)",
        textStyle: { color: "#E2E8F0", fontSize: 11, fontFamily: "JetBrains Mono" },
      },
      legend: { top: 0, textStyle: { color: "#94A3B8", fontSize: 10 } },
      grid: { top: 34, left: 48, right: 14, bottom: 26 },
      xAxis: {
        type: "category",
        data: seasons,
        axisLabel: { color: "#CBD5E1", fontSize: 11, fontFamily: "JetBrains Mono" },
      },
      yAxis: {
        type: "value",
        name: "RMSE (MW)",
        nameTextStyle: { color: "#64748B", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      series: methods.map((m) => ({
        name: m.name,
        type: "bar",
        itemStyle: { color: m.color, borderRadius: [4, 4, 0, 0] },
        data: seasons.map((s) => {
          const hit = rows.find((r) => r.season === s && r.method === m.key);
          return hit ? Number(hit.rmse.toFixed(2)) : 0;
        }),
      })),
    };
  }, [benchmarks, activeProblem]);

  if (!ds || !liveMetrics || !refMetrics) return null;

  const weightTotal = MEMBER_KEYS.reduce((s, k) => s + weights[k], 0);
  const deltaVsChamp = liveMetrics.rmse - refMetrics.rmse;

  return (
    <div className="space-y-4">
      {/* Horizon Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 cad-panel rounded-2xl px-4 py-3">
        <div>
          <h1 className="font-display text-base sm:text-lg font-bold text-white">
            AI Council &amp; Real-Time Neural Weight Mixer
          </h1>
          <p className="text-xs text-slate-400">
            Re-weight the 5 Optuna-tuned DL Champions live across all {ds.count.toLocaleString()} hours of{" "}
            {activeSplit === "test_2026" ? "Test 2026" : "Val 2025"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(["S1", "S24", "D1", "D24"] as ProblemId[]).map((pid) => (
            <button
              key={pid}
              onClick={() => setProblem(pid)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono-num font-semibold transition cursor-pointer ${
                activeProblem === pid
                  ? "bg-cyan-400 text-slate-950"
                  : "border border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500"
              }`}
            >
              {pid} · {PROBLEM_META[pid].horizon}
            </button>
          ))}
        </div>
      </div>

      {/* 1. 4-WAY ENSEMBLE TOURNAMENT BOARD */}
      <section data-tour-id="nm-tournament" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {tournamentRows.map((row, idx) => (
          <div
            key={row.id}
            className={`cad-panel rounded-2xl p-4 relative ${
              idx === 0 ? "border-emerald-400/50 bg-emerald-950/15" : ""
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono-num">
              <span className={idx === 0 ? "text-emerald-300 font-bold" : "text-slate-400"}>
                RANK #{idx + 1} · {row.tag}
              </span>
              {idx === 0 && <Trophy className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="mt-1.5 font-display text-sm font-bold text-white">{row.label}</div>
            <div className="mt-2 flex items-baseline justify-between font-mono-num">
              <span className="text-xl font-bold text-cyan-300">{row.metrics.rmse.toFixed(2)} MW</span>
              <span className="text-xs text-slate-400">R² {row.metrics.r2.toFixed(4)}</span>
            </div>
            <div className="mt-1 text-[11px] font-mono-num text-emerald-300/90">
              MAE {row.metrics.mae.toFixed(2)} MW · Skill +{row.metrics.skillPct.toFixed(1)}%
            </div>
          </div>
        ))}
      </section>

      {/* 2. INTERACTIVE 5-SLIDER WEIGHT SYNTHESIZER + LIVE BLEND TRACE */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div data-tour-id="nm-sliders" className="xl:col-span-5 cad-panel rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-white">
                5-DL Council Blending Consoles
              </h2>
              <p className="text-[11px] text-slate-400 font-mono-num">
                Normalized live over all {ds.count.toLocaleString()} hours
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                data-tour-id="nm-nnls-btn"
                onClick={handleSolveNnls}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.3)]"
              >
                <Sparkles className="w-3.5 h-3.5" /> Optimize via NNLS
              </button>
              <button
                onClick={handleEqualize}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 cursor-pointer"
                title="Reset to Equal 20% Weights"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {MEMBER_KEYS.map((key) => {
              const info = DL_MODEL_LABELS[key];
              const pct = weightTotal > 1e-6 ? (weights[key] / weightTotal) * 100 : 20;
              const nnlsW = nnlsOptimal ? (nnlsOptimal[key] ?? 0) * 100 : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono-num">
                    <span className="flex items-center gap-2 font-semibold text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }} />
                      {info.name}
                    </span>
                    <span className="text-slate-300">
                      <strong className="text-white">{pct.toFixed(1)}%</strong>{" "}
                      <span className="text-[10px] text-slate-500">(NNLS: {nnlsW.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={weights[key]}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>

          {isSolar && (
            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs cursor-pointer">
              <span className="text-slate-300">Apply M9 Night Zenith ≥ 90° Clamp</span>
              <input
                type="checkbox"
                checked={applyNightClamp}
                onChange={(e) => setApplyNightClamp(e.target.checked)}
                className="accent-emerald-400 w-4 h-4"
              />
            </label>
          )}

          {/* Live Readout Comparison Box */}
          <motion.div
            key={`${liveMetrics.rmse.toFixed(2)}`}
            initial={{ scale: 0.99 }}
            animate={{ scale: 1 }}
            className="rounded-xl border border-amber-500/35 bg-amber-950/15 p-3.5 grid grid-cols-3 gap-2 text-center font-mono-num"
          >
            <div>
              <div className="text-[10px] text-slate-400">LIVE MIX RMSE</div>
              <div className="text-lg font-bold text-amber-300">{liveMetrics.rmse.toFixed(2)}</div>
              <div className="text-[10px] text-slate-400">
                {deltaVsChamp >= 0 ? `+${deltaVsChamp.toFixed(2)}` : deltaVsChamp.toFixed(2)} vs Ridge
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">LIVE MAE</div>
              <div className="text-lg font-bold text-white">{liveMetrics.mae.toFixed(2)}</div>
              <div className="text-[10px] text-slate-400">R² {liveMetrics.r2.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">SKILL SCORE</div>
              <div className="text-lg font-bold text-emerald-300">+{liveMetrics.skillPct.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-400">vs Persistence</div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Live Blend Curve + Seasonal Matrix */}
        <div className="xl:col-span-7 space-y-4">
          <div className="cad-panel rounded-2xl p-4">
            <h3 className="font-display text-sm font-bold text-white mb-1">
              Live Neural Blend vs Champion Stacking Ridge (First 144h Sample)
            </h3>
            <p className="text-[11px] text-slate-400 mb-2">
              Watch how adjusting individual DL architectures shifts tracking accuracy across peaks and ramps
            </p>
            <EChartBox option={mixerChartOption} height={240} />
          </div>

          <div data-tour-id="nm-seasonal" className="cad-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  M8 Seasonal Error Decomposition (Validation 2025)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Evaluates Winter, Summer, Southwest Monsoon, and Post-Monsoon regimes for {activeProblem}
                </p>
              </div>
              <span className="rounded px-2 py-0.5 text-[10px] font-mono-num bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                8,737 Hours Audited
              </span>
            </div>
            <EChartBox option={seasonalChartOption} height={210} />
          </div>
        </div>
      </section>
    </div>
  );
}

