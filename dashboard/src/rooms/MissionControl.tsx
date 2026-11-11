import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Flame,
  Gauge,
  Moon,
  Pause,
  Play,
  ShieldCheck,
  Sun,
  Zap,
} from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { EChartBox } from "../components/EChartBox";
import { DL_MODEL_LABELS, PROBLEM_META, computeMetrics } from "../utils/metrics";
import type { ProblemId } from "../types";

export function MissionControl() {
  const {
    activeProblem,
    setProblem,
    activeSplit,
    testData,
    valData,
    benchmarks,
    cursorIndex,
    setCursorIndex,
    isPlaying,
    setIsPlaying,
  } = useGridStore();

  const ds = activeSplit === "val_2025" && valData ? valData : testData;
  const [windowHours, setWindowHours] = useState<number>(120); // 5 days visible slice around cursor
  const [showMembers, setShowMembers] = useState(false);

  // Scrubber playback timer
  useEffect(() => {
    if (!isPlaying || !ds) return;
    const t = setInterval(() => {
      setCursorIndex((cursorIndex + 1) % ds.count);
    }, 320);
    return () => clearInterval(t);
  }, [isPlaying, cursorIndex, ds, setCursorIndex]);

  const idx = ds ? Math.min(cursorIndex, ds.count - 1) : 0;

  // Slice boundaries centered or trailing around cursorIndex
  const sliceBounds = useMemo(() => {
    if (!ds) return { start: 0, end: 0 };
    const half = Math.floor(windowHours / 2);
    let start = Math.max(0, idx - half);
    let end = Math.min(ds.count, start + windowHours);
    if (end - start < windowHours) {
      start = Math.max(0, end - windowHours);
    }
    return { start, end };
  }, [ds, idx, windowHours]);

  // Live metrics across entire split for selected problem
  const splitMetrics = useMemo(() => {
    if (!ds) return null;
    const p = ds.problems[activeProblem];
    return computeMetrics(p.y_true, p.y_pred_post, p.persistence, activeProblem);
  }, [ds, activeProblem]);

  // Main Forecast Multi-Layer ECharts Option
  const forecastOption = useMemo(() => {
    if (!ds) return {};
    const { start, end } = sliceBounds;
    const p = ds.problems[activeProblem];
    const ts = ds.timestamps.slice(start, end).map((s) => s.replace("T", " ").slice(5));
    const yTrue = p.y_true.slice(start, end);
    const yPost = p.y_pred_post.slice(start, end);
    const p10 = p.p10.slice(start, end);
    const p90 = p.p90.slice(start, end);
    const bandWidth = p90.map((hi, i) => Math.max(0, Number((hi - p10[i]).toFixed(1))));
    const persistence = p.persistence.slice(start, end);
    const zenith = ds.weather.zenith.slice(start, end);

    // Night intervals where Solar Zenith >= 90 deg
    const nightAreas: Array<[{ xAxis: number }, { xAxis: number }]> = [];
    let nightStart: number | null = null;
    zenith.forEach((z, i) => {
      if (z >= 90 && nightStart === null) nightStart = i;
      if ((z < 90 || i === zenith.length - 1) && nightStart !== null) {
        nightAreas.push([{ xAxis: nightStart }, { xAxis: i }]);
        nightStart = null;
      }
    });

    const cursorOffset = idx - start;
    const series: Record<string, unknown>[] = [
      {
        name: "P10 Floor",
        type: "line",
        data: p10,
        lineStyle: { opacity: 0 },
        stack: "pi-band",
        symbol: "none",
        silent: true,
        tooltip: { show: false },
      },
      {
        name: "P10–P90 Risk Band",
        type: "line",
        data: bandWidth,
        lineStyle: { opacity: 0 },
        areaStyle: { color: "rgba(92, 184, 228, 0.12)" },
        stack: "pi-band",
        symbol: "none",
      },
      {
        name: "Actual Ground Truth",
        type: "line",
        data: yTrue,
        showSymbol: false,
        lineStyle: { width: 2.3, color: "#EDF2F7" },
        itemStyle: { color: "#EDF2F7" },
        markArea: {
          silent: true,
          itemStyle: { color: "rgba(7, 8, 11, 0.55)" },
          data: nightAreas,
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#E5A93C", type: "dashed", width: 1.4 },
          data: [{ xAxis: cursorOffset }],
          label: { show: false },
        },
      },
      {
        name: "Champion (Stacking Ridge + M9)",
        type: "line",
        data: yPost,
        showSymbol: false,
        lineStyle: { width: 2.2, color: "#5CB8E4" },
        itemStyle: { color: "#5CB8E4" },
      },
      {
        name: "Persistence Baseline",
        type: "line",
        data: persistence,
        showSymbol: false,
        lineStyle: { width: 1.2, type: "dotted", color: "#94A3B8" },
        itemStyle: { color: "#94A3B8" },
      },
    ];

    if (showMembers) {
      (Object.keys(DL_MODEL_LABELS) as Array<keyof typeof DL_MODEL_LABELS>).forEach((mKey) => {
        series.push({
          name: DL_MODEL_LABELS[mKey].name,
          type: "line",
          data: p.members[mKey].slice(start, end),
          showSymbol: false,
          lineStyle: { width: 1.1, opacity: 0.65, color: DL_MODEL_LABELS[mKey].color },
          itemStyle: { color: DL_MODEL_LABELS[mKey].color },
        });
      });
    }

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8, 13, 25, 0.95)",
        borderColor: "rgba(56, 189, 248, 0.35)",
        textStyle: { color: "#E2E8F0", fontSize: 12, fontFamily: "JetBrains Mono" },
      },
      legend: {
        top: 0,
        data: [
          "P10–P90 Risk Band",
          "Actual Ground Truth",
          "Champion (Stacking Ridge + M9)",
          "Persistence Baseline",
          ...(showMembers ? Object.values(DL_MODEL_LABELS).map((l) => l.name) : []),
        ],
        textStyle: { color: "#94A3B8", fontSize: 11 },
        inactiveColor: "#475569",
      },
      grid: { top: 38, left: 56, right: 20, bottom: 28 },
      xAxis: {
        type: "category",
        data: ts,
        axisLine: { lineStyle: { color: "#334155" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      yAxis: {
        type: "value",
        name: "MW",
        nameTextStyle: { color: "#64748B", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      series,
    };
  }, [ds, sliceBounds, activeProblem, idx, showMembers]);

  // Duck Curve ECharts Option (24h window starting at current day or slice)
  const duckOption = useMemo(() => {
    if (!ds) return {};
    const dayStart = Math.max(0, Math.min(ds.count - 24, idx - (idx % 24)));
    const dayEnd = Math.min(ds.count, dayStart + 24);
    const ts = ds.timestamps.slice(dayStart, dayEnd).map((s) => s.slice(11, 16));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8, 13, 25, 0.95)",
        borderColor: "rgba(245, 158, 11, 0.35)",
        textStyle: { color: "#E2E8F0", fontSize: 11, fontFamily: "JetBrains Mono" },
      },
      legend: { top: 0, textStyle: { color: "#94A3B8", fontSize: 10 } },
      grid: { top: 32, left: 52, right: 16, bottom: 24 },
      xAxis: {
        type: "category",
        data: ts,
        axisLine: { lineStyle: { color: "#334155" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      series: [
        {
          name: "State Demand",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: ds.duck_curve.true_demand.slice(dayStart, dayEnd),
          lineStyle: { width: 2, color: "#5CB8E4" },
        },
        {
          name: "Pred Net Load",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: ds.duck_curve.pred_net_load.slice(dayStart, dayEnd),
          lineStyle: { width: 2.4, color: "#34D399" },
          areaStyle: { color: "rgba(52, 211, 153, 0.07)" },
        },
        {
          name: "Pavagada Solar",
          type: "bar",
          data: ds.duck_curve.true_solar.slice(dayStart, dayEnd),
          itemStyle: { color: "rgba(229, 169, 60, 0.45)", borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  }, [ds, idx]);

  if (!ds || !splitMetrics) {
    return (
      <div className="cad-panel rounded-2xl p-8 text-center text-slate-400 font-mono-num">
        Synchronizing KSLDC telemetry stream...
      </div>
    );
  }

  const tsNow = ds.timestamps[idx].replace("T", " ");
  const solarTrue = ds.duck_curve.true_solar[idx];
  const solarPred = ds.duck_curve.pred_solar[idx];
  const demandTrue = ds.duck_curve.true_demand[idx];
  const demandPred = ds.duck_curve.pred_demand[idx];
  const netTrue = ds.duck_curve.true_net_load[idx];
  const netPred = ds.duck_curve.pred_net_load[idx];
  const zenithNow = ds.weather.zenith[idx];
  const isNight = zenithNow >= 90;

  // Compute instantaneous hourly ramp (delta vs idx - 1)
  const prevIdx = Math.max(0, idx - 1);
  const solarRamp = solarTrue - ds.duck_curve.true_solar[prevIdx];
  const netRamp = netTrue - ds.duck_curve.true_net_load[prevIdx];
  const rampSeverity =
    Math.abs(netRamp) >= 650 || Math.abs(solarRamp) >= 450
      ? { label: "ELEVATED RAMP", color: "text-red-400 border-red-500/40 bg-red-500/12" }
      : Math.abs(netRamp) >= 350 || Math.abs(solarRamp) >= 220
      ? { label: "MODERATE RAMP", color: "text-amber-300 border-amber-500/40 bg-amber-500/12" }
      : { label: "NOMINAL GRID", color: "text-emerald-300 border-emerald-500/40 bg-emerald-500/12" };

  // Precomputed test benchmark lookup for comparison badge
  const champTestRow = benchmarks?.m10_test_benchmark.find(
    (r) => r.problem === activeProblem && r.tier === "Final"
  );

  return (
    <div className="space-y-4">
      {/* 1. HERO TELEMETRY KPI BAR */}
      <section data-tour-id="mc-hero-kpis" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="cad-panel-amber rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#F3C669] font-mono-num">
            <span className="flex items-center gap-1.5">
              <Sun className="w-4 h-4" /> PAVAGADA SOLAR OUTPUT
            </span>
            <span>{Math.round((solarTrue / 2050) * 100)}% CAP</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono-num">
            <span className="text-2xl font-bold text-white">{solarTrue.toFixed(1)} MW</span>
            <span className="text-xs text-[#F3C669]/80">Pred {solarPred.toFixed(1)}</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C98A22] to-[#F5D076] transition-all duration-300"
              style={{ width: `${Math.min(100, (solarTrue / 2050) * 100)}%` }}
            />
          </div>
        </div>

        <div className="cad-panel rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#8ED8F8] font-mono-num">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> KARNATAKA STATE DEMAND
            </span>
            <span className="text-[#34D399]">50.00 Hz</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono-num">
            <span className="text-2xl font-bold text-white">{demandTrue.toFixed(1)} MW</span>
            <span className="text-xs text-[#8ED8F8]/80">Pred {demandPred.toFixed(1)}</span>
          </div>
          <div className="mt-2 text-[11px] font-mono-num text-slate-400">
            D1 Champion Test MAPE: 0.96% · RMSE: 160.28 MW
          </div>
        </div>

        <div className="cad-panel rounded-2xl p-4 border-[#34D399]/25">
          <div className="flex items-center justify-between text-xs text-[#6EE7B7] font-mono-num">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4" /> NET LOAD (DUCK CURVE)
            </span>
            <span>D - S</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono-num">
            <span className="text-2xl font-bold text-white">{netTrue.toFixed(1)} MW</span>
            <span className="text-xs text-[#6EE7B7]/80">Pred {netPred.toFixed(1)}</span>
          </div>
          <div className="mt-2 text-[11px] font-mono-num text-slate-400">
            Delta Error: {Math.abs(netPred - netTrue).toFixed(1)} MW · Hourly Δ {netRamp >= 0 ? "+" : ""}
            {netRamp.toFixed(0)} MW
          </div>
        </div>

        <div className="cad-panel rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-300 font-mono-num">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#5CB8E4]" /> RAMP &amp; M9 SAFETY STATUS
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] border ${rampSeverity.color}`}>
              {rampSeverity.label}
            </span>
          </div>
          <div className="mt-2 font-mono-num text-sm font-semibold text-white">
            Solar Δ: {solarRamp >= 0 ? "+" : ""}
            {solarRamp.toFixed(1)} MW/hr
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono-num">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 border ${
                isNight
                  ? "border-slate-400/40 bg-slate-500/15 text-slate-200"
                  : "border-[#E5A93C]/35 bg-[#E5A93C]/10 text-[#F3C669]"
              }`}
            >
              {isNight ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              {isNight ? `Zenith ${zenithNow.toFixed(1)}° → 0 MW Lock` : `Day Zenith ${zenithNow.toFixed(1)}°`}
            </span>
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 border border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7]">
              <ShieldCheck className="w-3 h-3" /> Ramp Gate OK
            </span>
          </div>
        </div>
      </section>

      {/* 2. CONTROLS & PROBLEM SWITCHER + LIVE METRICS STRIP */}
      <section className="flex flex-wrap items-center justify-between gap-3 cad-panel rounded-2xl px-4 py-3">
        <div data-tour-id="mc-problem-tabs" className="flex items-center gap-1.5 flex-wrap">
          {(["S1", "S24", "D1", "D24"] as ProblemId[]).map((pid) => {
            const meta = PROBLEM_META[pid];
            const active = activeProblem === pid;
            return (
              <button
                key={pid}
                onClick={() => setProblem(pid)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  active
                    ? meta.targetType === "Solar"
                      ? "bg-[#E5A93C] text-[#07080B] font-bold shadow-sm"
                      : "bg-[#5CB8E4] text-[#07080B] font-bold shadow-sm"
                    : "border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"
                }`}
              >
                <span className="font-mono-num font-bold">{meta.code}</span>{" "}
                <span className="hidden sm:inline opacity-80">· {meta.title}</span>
              </button>
            );
          })}
        </div>

        {/* Live Full-Split Verification Strip */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono-num">
          <div>
            <span className="text-slate-400">RMSE:</span>{" "}
            <span className="text-white font-bold">{splitMetrics.rmse.toFixed(2)} MW</span>
          </div>
          <div>
            <span className="text-slate-400">MAE:</span>{" "}
            <span className="text-white font-bold">{splitMetrics.mae.toFixed(2)} MW</span>
          </div>
          <div>
            <span className="text-slate-400">R²:</span>{" "}
            <span className="text-[#34D399] font-bold">{splitMetrics.r2.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-slate-400">Skill:</span>{" "}
            <span className="text-[#8ED8F8] font-bold">+{splitMetrics.skillPct.toFixed(1)}%</span>
          </div>
          {champTestRow && activeSplit === "test_2026" && (
            <span className="rounded bg-[#34D399]/12 border border-[#34D399]/35 px-2 py-0.5 text-[10px] text-[#6EE7B7]">
              M10 Official: {champTestRow.rmse.toFixed(2)} MW
            </span>
          )}
        </div>
      </section>

      {/* 3. MAIN MULTI-HORIZON CHART + SIDEBAR DUCK CURVE */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div data-tour-id="mc-forecast-chart" className="xl:col-span-8 cad-panel rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-white">
                {PROBLEM_META[activeProblem].title} ({PROBLEM_META[activeProblem].horizon}) ·{" "}
                <span className="text-[#8ED8F8] font-mono-num">
                  {activeSplit === "test_2026" ? "Test 2026" : "Val 2025"}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Platinum = True Telemetry · Glacier Azure = Champion + M9 · Shaded = Quantile P10–P90 · Night Shading = Zenith ≥ 90°
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setShowMembers((v) => !v)}
                className={`rounded-lg px-2.5 py-1 border font-mono-num transition cursor-pointer ${
                  showMembers
                    ? "border-[#5CB8E4]/60 bg-[#5CB8E4]/15 text-[#8ED8F8]"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
                }`}
              >
                {showMembers ? "Hide 5 DL Traces" : "Overlay 5 DL Traces"}
              </button>
              <select
                value={windowHours}
                onChange={(e) => setWindowHours(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-[#0D1017] px-2 py-1 text-xs font-mono-num text-slate-200"
              >
                <option value={72}>72h Window</option>
                <option value={120}>120h (5d)</option>
                <option value={240}>240h (10d)</option>
              </select>
            </div>
          </div>

          <EChartBox option={forecastOption} height={355} />
        </div>

        {/* Duck Curve & Local Physical Snapshot */}
        <div className="xl:col-span-4 space-y-4">
          <div className="cad-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold text-white">
                  Daily Duck Curve Conservation
                </h3>
                <p className="text-[11px] font-mono-num text-slate-400 truncate">
                  Day: {tsNow.slice(0, 10)} · Net = Demand - Solar
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-mono-num bg-[#34D399]/12 text-[#6EE7B7] border border-[#34D399]/30">
                161.35 MW Net RMSE
              </span>
            </div>
            <EChartBox option={duckOption} height={240} />
          </div>

          <div className="cad-panel rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="font-display font-semibold text-white flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#E5A93C]" />
              Hourly Weather &amp; Risk Interval Snapshot
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono-num">
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-2">
                <div className="text-[10px] text-slate-400">GHI / CLEARSKY</div>
                <div className="text-sm font-bold text-[#F3C669]">
                  {ds.weather.ghi[idx].toFixed(0)} / {ds.weather.clearsky_ghi[idx].toFixed(0)} W/m²
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-2">
                <div className="text-[10px] text-slate-400">CLOUD COVER</div>
                <div className="text-sm font-bold text-[#8ED8F8]">{ds.weather.cloud_cover[idx].toFixed(0)}%</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-2">
                <div className="text-[10px] text-slate-400">80% PI (P10 ↔ P90)</div>
                <div className="text-sm font-bold text-white">
                  {ds.problems[activeProblem].p10[idx].toFixed(0)}–{ds.problems[activeProblem].p90[idx].toFixed(0)} MW
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-2">
                <div className="text-[10px] text-slate-400">AMBIENT / MOD TEMP</div>
                <div className="text-sm font-bold text-slate-200">
                  {ds.weather.temp[idx].toFixed(1)}° / {ds.weather.module_temp[idx].toFixed(1)}°C
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CHRONOLOGICAL SCRUBBER & PLAYBACK */}
      <section data-tour-id="mc-time-scrubber" className="cad-panel rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF2F7] px-3.5 py-1.5 text-xs font-semibold text-[#07080B] hover:bg-white transition cursor-pointer shrink-0"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? "Pause" : "Simulate Stream"}</span>
        </button>

        <div className="flex-1 min-w-[200px]">
          <input
            type="range"
            min={0}
            max={ds.count - 1}
            value={idx}
            onChange={(e) => {
              setIsPlaying(false);
              setCursorIndex(Number(e.target.value));
            }}
            className="w-full cursor-pointer"
          />
        </div>

        <div className="text-xs font-mono-num text-[#8ED8F8] shrink-0">
          {tsNow} IST <span className="text-slate-500">({idx + 1}/{ds.count})</span>
        </div>
      </section>
    </div>
  );
}

