import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CloudLightning,
  Download,
  Flame,
  Gauge,
  Moon,
  Pause,
  Play,
  ShieldCheck,
  Sun,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { EChartBox } from "../components/EChartBox";
import { DL_MODEL_LABELS, PROBLEM_META, computeMetrics } from "../utils/metrics";
import { getChartPalette } from "../utils/chartTheme";
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
    theme,
    cmdPaletteOpen,
    tourActive,
  } = useGridStore();

  const ds = activeSplit === "val_2025" && valData ? valData : testData;
  const [windowHours, setWindowHours] = useState<number>(120);
  const [showMembers, setShowMembers] = useState(false);

  // Scrubber playback timer
  useEffect(() => {
    if (!isPlaying || !ds) return;
    const t = setInterval(() => {
      setCursorIndex((cursorIndex + 1) % ds.count);
    }, 320);
    return () => clearInterval(t);
  }, [isPlaying, cursorIndex, ds, setCursorIndex]);

  // Keyboard arrow stepping for hour-by-hour inspection
  useEffect(() => {
    if (!ds) return;
    const onKey = (e: KeyboardEvent) => {
      if (cmdPaletteOpen || tourActive) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") {
        setIsPlaying(false);
        setCursorIndex((cursorIndex + 1) % ds.count);
      } else if (e.key === "ArrowLeft") {
        setIsPlaying(false);
        setCursorIndex((cursorIndex - 1 + ds.count) % ds.count);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ds, cursorIndex, setCursorIndex, setIsPlaying, cmdPaletteOpen, tourActive]);

  const idx = ds ? Math.min(cursorIndex, ds.count - 1) : 0;
  const pal = useMemo(() => getChartPalette(theme), [theme]);

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

  const splitMetrics = useMemo(() => {
    if (!ds) return null;
    const p = ds.problems[activeProblem];
    return computeMetrics(p.y_true, p.y_pred_post, p.persistence, activeProblem);
  }, [ds, activeProblem]);

  const jumpToScenario = (kind: "peak" | "evening" | "night" | "shock") => {
    if (!ds) return;
    setIsPlaying(false);
    let target = idx;
    if (kind === "peak") {
      let best = -1;
      ds.duck_curve.true_solar.forEach((v, i) => {
        if (v > best) {
          best = v;
          target = i;
        }
      });
    } else if (kind === "night") {
      const hit = ds.weather.zenith.findIndex((z) => z >= 95);
      if (hit >= 0) target = hit;
    } else if (kind === "shock") {
      target = ds.shock_events[0]?.index ?? idx;
    } else if (kind === "evening") {
      let bestDelta = -Infinity;
      for (let i = 1; i < ds.count; i++) {
        const d = ds.duck_curve.true_net_load[i] - ds.duck_curve.true_net_load[i - 1];
        const hr = Number(ds.timestamps[i].slice(11, 13));
        if (hr >= 16 && hr <= 21 && d > bestDelta) {
          bestDelta = d;
          target = i;
        }
      }
    }
    setCursorIndex(target);
  };

  const handleExportCsv = () => {
    if (!ds) return;
    const { start, end } = sliceBounds;
    const p = ds.problems[activeProblem];
    const header = "timestamp_ist,actual_mw,pred_champion_m9_mw,p10_mw,p50_mw,p90_mw,persistence_mw,zenith_deg";
    const lines = [header];
    for (let i = start; i < end; i++) {
      lines.push(
        [
          ds.timestamps[i],
          p.y_true[i].toFixed(2),
          p.y_pred_post[i].toFixed(2),
          p.p10[i].toFixed(2),
          p.p50[i].toFixed(2),
          p.p90[i].toFixed(2),
          p.persistence[i].toFixed(2),
          ds.weather.zenith[i].toFixed(2),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridpulse_${activeSplit}_${activeProblem}_slice.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        areaStyle: { color: pal.piBandFill },
        stack: "pi-band",
        symbol: "none",
      },
      {
        name: "Actual Ground Truth",
        type: "line",
        data: yTrue,
        showSymbol: false,
        lineStyle: { width: 2.3, color: pal.trueLine },
        itemStyle: { color: pal.trueLine },
        markArea: {
          silent: true,
          itemStyle: { color: pal.nightShade },
          data: nightAreas,
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: pal.cursorLine, type: "dashed", width: 1.4 },
          data: [{ xAxis: cursorOffset }],
          label: { show: false },
        },
      },
      {
        name: "Champion (Stacking Ridge + M9)",
        type: "line",
        data: yPost,
        showSymbol: false,
        lineStyle: { width: 2.2, color: pal.grid },
        itemStyle: { color: pal.grid },
      },
      {
        name: "Persistence Baseline",
        type: "line",
        data: persistence,
        showSymbol: false,
        lineStyle: { width: 1.2, type: "dotted", color: pal.persistence },
        itemStyle: { color: pal.persistence },
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
        backgroundColor: pal.tooltipBg,
        borderColor: pal.tooltipBorder,
        textStyle: { color: pal.tooltipText, fontSize: 12, fontFamily: "JetBrains Mono" },
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
        textStyle: { color: pal.legendText, fontSize: 11 },
        inactiveColor: pal.legendInactive,
      },
      grid: { top: 38, left: 56, right: 20, bottom: 28 },
      xAxis: {
        type: "category",
        data: ts,
        axisLine: { lineStyle: { color: pal.axisLine } },
        axisLabel: { color: pal.axisLabel, fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      yAxis: {
        type: "value",
        name: "MW",
        nameTextStyle: { color: pal.axisTitle, fontSize: 10 },
        splitLine: { lineStyle: { color: pal.splitLine } },
        axisLabel: { color: pal.axisLabel, fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      series,
    };
  }, [ds, sliceBounds, activeProblem, idx, showMembers, pal]);

  const duckOption = useMemo(() => {
    if (!ds) return {};
    const dayStart = Math.max(0, Math.min(ds.count - 24, idx - (idx % 24)));
    const dayEnd = Math.min(ds.count, dayStart + 24);
    const ts = ds.timestamps.slice(dayStart, dayEnd).map((s) => s.slice(11, 16));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: pal.tooltipBg,
        borderColor: pal.tooltipBorder,
        textStyle: { color: pal.tooltipText, fontSize: 11, fontFamily: "JetBrains Mono" },
      },
      legend: { top: 0, textStyle: { color: pal.legendText, fontSize: 10 } },
      grid: { top: 32, left: 52, right: 16, bottom: 24 },
      xAxis: {
        type: "category",
        data: ts,
        axisLine: { lineStyle: { color: pal.axisLine } },
        axisLabel: { color: pal.axisLabel, fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: pal.splitLine } },
        axisLabel: { color: pal.axisLabel, fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      series: [
        {
          name: "State Demand",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: ds.duck_curve.true_demand.slice(dayStart, dayEnd),
          lineStyle: { width: 2, color: pal.grid },
        },
        {
          name: "Pred Net Load",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: ds.duck_curve.pred_net_load.slice(dayStart, dayEnd),
          lineStyle: { width: 2.4, color: pal.net },
          areaStyle: { color: pal.netArea },
        },
        {
          name: "Pavagada Solar",
          type: "bar",
          data: ds.duck_curve.true_solar.slice(dayStart, dayEnd),
          itemStyle: { color: pal.solarBar, borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  }, [ds, idx, pal]);

  if (!ds || !splitMetrics) {
    return (
      <div className="cad-panel rounded-2xl p-8 text-center text-slate-400 light:text-slate-600 font-mono-num">
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

  const prevIdx = Math.max(0, idx - 1);
  const solarRamp = solarTrue - ds.duck_curve.true_solar[prevIdx];
  const netRamp = netTrue - ds.duck_curve.true_net_load[prevIdx];
  const rampSeverity =
    Math.abs(netRamp) >= 650 || Math.abs(solarRamp) >= 450
      ? {
          label: "ELEVATED RAMP",
          color:
            "text-red-400 light:text-red-700 border-red-500/40 bg-red-500/12 light:bg-red-500/10",
        }
      : Math.abs(netRamp) >= 350 || Math.abs(solarRamp) >= 220
      ? {
          label: "MODERATE RAMP",
          color:
            "text-amber-300 light:text-amber-700 border-amber-500/40 bg-amber-500/12 light:bg-amber-500/10",
        }
      : {
          label: "NOMINAL GRID",
          color:
            "text-emerald-300 light:text-emerald-700 border-emerald-500/40 bg-emerald-500/12 light:bg-emerald-500/10",
        };

  const champTestRow = benchmarks?.m10_test_benchmark.find(
    (r) => r.problem === activeProblem && r.tier === "Final"
  );

  return (
    <div className="space-y-4">
      {/* 1. HERO TELEMETRY KPI BAR */}
      <section data-tour-id="mc-hero-kpis" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="cad-panel-amber rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#F3C669] light:text-amber-700 font-mono-num">
            <span className="flex items-center gap-1.5">
              <Sun className="w-4 h-4" /> PAVAGADA SOLAR OUTPUT
            </span>
            <span>{Math.round((solarTrue / 2050) * 100)}% CAP</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono-num">
            <span className="text-2xl font-bold text-white light:text-slate-900">{solarTrue.toFixed(1)} MW</span>
            <span className="text-xs text-[#F3C669]/80 light:text-amber-700">Pred {solarPred.toFixed(1)}</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/[0.08] light:bg-amber-900/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C98A22] to-[#F5D076] light:from-amber-600 light:to-amber-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (solarTrue / 2050) * 100)}%` }}
            />
          </div>
        </div>

        <div className="cad-panel rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#8ED8F8] light:text-sky-700 font-mono-num">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> KARNATAKA STATE DEMAND
            </span>
            <span className="text-[#34D399] light:text-emerald-700">50.00 Hz</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono-num">
            <span className="text-2xl font-bold text-white light:text-slate-900">{demandTrue.toFixed(1)} MW</span>
            <span className="text-xs text-[#8ED8F8]/80 light:text-sky-700">Pred {demandPred.toFixed(1)}</span>
          </div>
          <div className="mt-2 text-[11px] font-mono-num text-slate-400 light:text-slate-600">
            D1 Champion Test MAPE: 0.96% · RMSE: 160.28 MW
          </div>
        </div>

        <div className="cad-panel rounded-2xl p-4 border-[#34D399]/25 light:border-emerald-600/25">
          <div className="flex items-center justify-between text-xs text-[#6EE7B7] light:text-emerald-700 font-mono-num">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4" /> NET LOAD (DUCK CURVE)
            </span>
            <span>D - S</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 font-mono-num">
            <span className="text-2xl font-bold text-white light:text-slate-900">{netTrue.toFixed(1)} MW</span>
            <span className="text-xs text-[#6EE7B7]/80 light:text-emerald-700">Pred {netPred.toFixed(1)}</span>
          </div>
          <div className="mt-2 text-[11px] font-mono-num text-slate-400 light:text-slate-600">
            Delta Error: {Math.abs(netPred - netTrue).toFixed(1)} MW · Hourly Δ {netRamp >= 0 ? "+" : ""}
            {netRamp.toFixed(0)} MW
          </div>
        </div>

        <div className="cad-panel rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-300 light:text-slate-700 font-mono-num">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#5CB8E4] light:text-sky-600" /> RAMP &amp; M9 SAFETY STATUS
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] border ${rampSeverity.color}`}>
              {rampSeverity.label}
            </span>
          </div>
          <div className="mt-2 font-mono-num text-sm font-semibold text-white light:text-slate-900">
            Solar Δ: {solarRamp >= 0 ? "+" : ""}
            {solarRamp.toFixed(1)} MW/hr
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono-num">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 border ${
                isNight
                  ? "border-slate-400/40 bg-slate-500/15 text-slate-200 light:text-slate-700"
                  : "border-[#E5A93C]/35 light:border-amber-600/35 bg-[#E5A93C]/10 light:bg-amber-500/10 text-[#F3C669] light:text-amber-700"
              }`}
            >
              {isNight ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              {isNight ? `Zenith ${zenithNow.toFixed(1)}° → 0 MW Lock` : `Day Zenith ${zenithNow.toFixed(1)}°`}
            </span>
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 border border-[#34D399]/35 light:border-emerald-600/35 bg-[#34D399]/10 light:bg-emerald-500/10 text-[#6EE7B7] light:text-emerald-700">
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
                      ? "bg-[#E5A93C] light:bg-amber-600 text-[#07080B] light:text-white font-bold shadow-sm"
                      : "bg-[#5CB8E4] light:bg-sky-600 text-[#07080B] light:text-white font-bold shadow-sm"
                    : "border border-white/10 light:border-slate-300 bg-white/[0.03] light:bg-white text-slate-300 light:text-slate-700 hover:border-white/25"
                }`}
              >
                <span className="font-mono-num font-bold">{meta.code}</span>{" "}
                <span className="hidden sm:inline opacity-80">· {meta.title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono-num">
          <div>
            <span className="text-slate-400 light:text-slate-500">RMSE:</span>{" "}
            <span className="text-white light:text-slate-900 font-bold">{splitMetrics.rmse.toFixed(2)} MW</span>
          </div>
          <div>
            <span className="text-slate-400 light:text-slate-500">MAE:</span>{" "}
            <span className="text-white light:text-slate-900 font-bold">{splitMetrics.mae.toFixed(2)} MW</span>
          </div>
          <div>
            <span className="text-slate-400 light:text-slate-500">R²:</span>{" "}
            <span className="text-[#34D399] light:text-emerald-700 font-bold">{splitMetrics.r2.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-slate-400 light:text-slate-500">Skill:</span>{" "}
            <span className="text-[#8ED8F8] light:text-sky-700 font-bold">+{splitMetrics.skillPct.toFixed(1)}%</span>
          </div>
          {champTestRow && activeSplit === "test_2026" && (
            <span className="rounded bg-[#34D399]/12 light:bg-emerald-500/12 border border-[#34D399]/35 light:border-emerald-600/35 px-2 py-0.5 text-[10px] text-[#6EE7B7] light:text-emerald-700">
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
              <h2 className="font-display text-sm sm:text-base font-bold text-white light:text-slate-900">
                {PROBLEM_META[activeProblem].title} ({PROBLEM_META[activeProblem].horizon}) ·{" "}
                <span className="text-[#8ED8F8] light:text-sky-700 font-mono-num">
                  {activeSplit === "test_2026" ? "Test 2026" : "Val 2025"}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 light:text-slate-600">
                Solid Trace = True Telemetry · Azure = Champion + M9 · Shaded = Quantile P10–P90 · Night Band = Zenith ≥ 90°
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <button
                onClick={() => setShowMembers((v) => !v)}
                className={`rounded-lg px-2.5 py-1 border font-mono-num transition cursor-pointer ${
                  showMembers
                    ? "border-[#5CB8E4]/60 light:border-sky-600 bg-[#5CB8E4]/15 light:bg-sky-500/12 text-[#8ED8F8] light:text-sky-700"
                    : "border-white/10 light:border-slate-300 bg-white/[0.03] light:bg-white text-slate-400 light:text-slate-700 hover:text-slate-200 light:hover:text-slate-950"
                }`}
              >
                {showMembers ? "Hide 5 DL Traces" : "Overlay 5 DL Traces"}
              </button>
              <select
                value={windowHours}
                onChange={(e) => setWindowHours(Number(e.target.value))}
                className="rounded-lg border border-white/10 light:border-slate-300 bg-[#0D1017] light:bg-white px-2 py-1 text-xs font-mono-num text-slate-200 light:text-slate-800"
              >
                <option value={72}>72h Window</option>
                <option value={120}>120h (5d)</option>
                <option value={240}>240h (10d)</option>
              </select>
              <button
                onClick={handleExportCsv}
                title="Download visible forecast slice as CSV"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 light:border-slate-300 bg-white/[0.03] light:bg-white px-2.5 py-1 font-mono-num text-slate-300 light:text-slate-700 hover:border-white/30 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          <EChartBox option={forecastOption} height={355} />
        </div>

        {/* Duck Curve & Local Physical Snapshot */}
        <div className="xl:col-span-4 space-y-4">
          <div className="cad-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold text-white light:text-slate-900">
                  Daily Duck Curve Conservation
                </h3>
                <p className="text-[11px] font-mono-num text-slate-400 light:text-slate-600 truncate">
                  Day: {tsNow.slice(0, 10)} · Net = Demand - Solar
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-mono-num bg-[#34D399]/12 light:bg-emerald-500/12 text-[#6EE7B7] light:text-emerald-700 border border-[#34D399]/30 light:border-emerald-600/30">
                161.35 MW Net RMSE
              </span>
            </div>
            <EChartBox option={duckOption} height={240} />
          </div>

          <div className="cad-panel rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="font-display font-semibold text-white light:text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#E5A93C] light:text-amber-600" />
              Hourly Weather &amp; Risk Interval Snapshot
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono-num">
              <div className="rounded-lg bg-white/[0.03] light:bg-slate-900/[0.04] border border-white/[0.07] light:border-slate-900/10 p-2">
                <div className="text-[10px] text-slate-400 light:text-slate-500">GHI / CLEARSKY</div>
                <div className="text-sm font-bold text-[#F3C669] light:text-amber-700">
                  {ds.weather.ghi[idx].toFixed(0)} / {ds.weather.clearsky_ghi[idx].toFixed(0)} W/m²
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.03] light:bg-slate-900/[0.04] border border-white/[0.07] light:border-slate-900/10 p-2">
                <div className="text-[10px] text-slate-400 light:text-slate-500">CLOUD COVER</div>
                <div className="text-sm font-bold text-[#8ED8F8] light:text-sky-700">
                  {ds.weather.cloud_cover[idx].toFixed(0)}%
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.03] light:bg-slate-900/[0.04] border border-white/[0.07] light:border-slate-900/10 p-2">
                <div className="text-[10px] text-slate-400 light:text-slate-500">80% PI (P10 ↔ P90)</div>
                <div className="text-sm font-bold text-white light:text-slate-900">
                  {ds.problems[activeProblem].p10[idx].toFixed(0)}–{ds.problems[activeProblem].p90[idx].toFixed(0)} MW
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.03] light:bg-slate-900/[0.04] border border-white/[0.07] light:border-slate-900/10 p-2">
                <div className="text-[10px] text-slate-400 light:text-slate-500">AMBIENT / MOD TEMP</div>
                <div className="text-sm font-bold text-slate-200 light:text-slate-800">
                  {ds.weather.temp[idx].toFixed(1)}° / {ds.weather.module_temp[idx].toFixed(1)}°C
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CHRONOLOGICAL SCRUBBER + SCENARIO QUICK-JUMPS */}
      <section data-tour-id="mc-time-scrubber" className="cad-panel rounded-2xl px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF2F7] light:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-[#07080B] light:text-white hover:bg-white light:hover:bg-slate-800 transition cursor-pointer shrink-0"
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

          <div className="text-xs font-mono-num text-[#8ED8F8] light:text-sky-700 shrink-0">
            {tsNow} IST <span className="text-slate-500">({idx + 1}/{ds.count})</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] light:border-slate-900/10 text-[11px] font-mono-num">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 light:text-slate-500 mr-1">SCENARIO JUMP:</span>
            <button
              onClick={() => jumpToScenario("peak")}
              className="inline-flex items-center gap-1 rounded-full border border-[#E5A93C]/35 light:border-amber-600/35 bg-[#E5A93C]/10 light:bg-amber-500/10 px-2.5 py-0.5 text-[#F3C669] light:text-amber-700 hover:bg-[#E5A93C]/20 cursor-pointer"
            >
              <Sun className="w-3 h-3" /> Peak Sun
            </button>
            <button
              onClick={() => jumpToScenario("evening")}
              className="inline-flex items-center gap-1 rounded-full border border-[#5CB8E4]/35 light:border-sky-600/35 bg-[#5CB8E4]/10 light:bg-sky-500/10 px-2.5 py-0.5 text-[#8ED8F8] light:text-sky-700 hover:bg-[#5CB8E4]/20 cursor-pointer"
            >
              <TrendingUp className="w-3 h-3" /> Evening Ramp
            </button>
            <button
              onClick={() => jumpToScenario("shock")}
              className="inline-flex items-center gap-1 rounded-full border border-[#F46060]/35 light:border-red-600/35 bg-[#F46060]/10 light:bg-red-500/10 px-2.5 py-0.5 text-[#FCA5A5] light:text-red-700 hover:bg-[#F46060]/20 cursor-pointer"
            >
              <CloudLightning className="w-3 h-3" /> Steepest Cloud Shock
            </button>
            <button
              onClick={() => jumpToScenario("night")}
              className="inline-flex items-center gap-1 rounded-full border border-white/12 light:border-slate-300 bg-white/[0.04] light:bg-slate-100 px-2.5 py-0.5 text-slate-300 light:text-slate-700 hover:border-white/30 cursor-pointer"
            >
              <Moon className="w-3 h-3" /> Night Zero Lock
            </button>
          </div>
          <span className="hidden md:inline text-slate-500">Tip: ← → Keys Step Hourly · Ctrl+K Commands</span>
        </div>
      </section>
    </div>
  );
}
