import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CloudLightning, Compass, Thermometer, Wind } from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { EChartBox } from "../components/EChartBox";

export function CloudRadar() {
  const { activeSplit, testData, valData, cursorIndex, setCursorIndex, completeQuest } = useGridStore();
  const ds = activeSplit === "val_2025" && valData ? valData : testData;

  const [selectedShockIdx, setSelectedShockIdx] = useState<number>(0);

  const shockEvents = ds?.shock_events ?? [];
  const activeShock = shockEvents[selectedShockIdx];

  // Focus index either on clicked shock event or global cursor
  const focusIdx = activeShock ? activeShock.index : cursorIndex;

  // Zoomed ±14h Probabilistic Fan Chart around shock hour
  const shockWindowOption = useMemo(() => {
    if (!ds) return {};
    const start = Math.max(0, focusIdx - 14);
    const end = Math.min(ds.count, focusIdx + 15);
    const s1 = ds.problems.S1;
    const ts = ds.timestamps.slice(start, end).map((t) => t.replace("T", " ").slice(5));
    const p10 = s1.p10.slice(start, end);
    const p90 = s1.p90.slice(start, end);
    const band = p90.map((h, i) => Math.max(0, Number((h - p10[i]).toFixed(1))));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8,13,25,0.95)",
        textStyle: { color: "#E2E8F0", fontSize: 11, fontFamily: "JetBrains Mono" },
      },
      legend: {
        top: 0,
        data: ["P10–P90 Risk Band", "Actual Solar (S1)", "Champion Pred"],
        textStyle: { color: "#94A3B8", fontSize: 10 },
      },
      grid: { top: 32, left: 52, right: 16, bottom: 26 },
      xAxis: {
        type: "category",
        data: ts,
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      yAxis: {
        type: "value",
        name: "MW",
        nameTextStyle: { color: "#64748B", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      series: [
        {
          name: "P10",
          type: "line",
          data: p10,
          lineStyle: { opacity: 0 },
          stack: "shock-pi",
          symbol: "none",
          tooltip: { show: false },
        },
        {
          name: "P10–P90 Risk Band",
          type: "line",
          data: band,
          lineStyle: { opacity: 0 },
          areaStyle: { color: "rgba(229,169,60,0.16)" },
          stack: "shock-pi",
          symbol: "none",
        },
        {
          name: "Actual Solar (S1)",
          type: "line",
          data: s1.y_true.slice(start, end),
          lineStyle: { width: 2.5, color: "#EDF2F7" },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#F46060", type: "dashed", width: 1.5 },
            data: [{ xAxis: focusIdx - start }],
            label: { formatter: "SHOCK HR", color: "#FCA5A5", fontSize: 10 },
          },
        },
        {
          name: "Champion Pred",
          type: "line",
          data: s1.y_pred_post.slice(start, end),
          lineStyle: { width: 2.2, color: "#5CB8E4" },
        },
      ],
    };
  }, [ds, focusIdx]);

  // Thermal Derating Scatter: Module Temp vs Clear-sky Solar Efficiency
  const thermalScatterOption = useMemo(() => {
    if (!ds) return {};
    const pts: Array<[number, number]> = [];
    const step = ds.count > 2000 ? 6 : 2;
    for (let i = 0; i < ds.count; i += step) {
      const csky = ds.weather.clearsky_ghi[i];
      const ghi = ds.weather.ghi[i];
      if (csky > 250 && ghi > 100) {
        const effRatio = Math.min(1.2, (ds.problems.S1.y_true[i] / 2050) / (ghi / 1000));
        pts.push([Number(ds.weather.module_temp[i].toFixed(1)), Number((effRatio * 100).toFixed(1))]);
      }
    }

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params: { value: [number, number] }) =>
          `Module Temp: ${params.value[0]}°C<br/>Normalized Yield: ${params.value[1]}%`,
        backgroundColor: "rgba(8,13,25,0.95)",
        textStyle: { color: "#E2E8F0", fontSize: 11, fontFamily: "JetBrains Mono" },
      },
      grid: { top: 28, left: 52, right: 18, bottom: 32 },
      xAxis: {
        type: "value",
        name: "PV Module Temp (°C)",
        nameLocation: "middle",
        nameGap: 20,
        nameTextStyle: { color: "#94A3B8", fontSize: 10 },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
      },
      yAxis: {
        type: "value",
        name: "Norm Efficiency (%)",
        nameTextStyle: { color: "#94A3B8", fontSize: 10 },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
      },
      series: [
        {
          type: "scatter",
          symbolSize: 6,
          itemStyle: { color: "rgba(229, 169, 60, 0.72)" },
          data: pts,
        },
      ],
    };
  }, [ds]);

  if (!ds) return null;

  const cloudNow = ds.weather.cloud_cover[focusIdx];
  const windNow = ds.weather.wind_speed[focusIdx];
  const ghiNow = ds.weather.ghi[focusIdx];
  const cskyNow = Math.max(1, ds.weather.clearsky_ghi[focusIdx]);
  const clearIndex = Math.min(1, ghiNow / cskyNow);

  return (
    <div className="space-y-4">
      <div className="cad-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-base sm:text-lg font-bold text-white">
            Cloud Radar &amp; Micro-Ramp Interceptor
          </h1>
          <p className="text-xs text-slate-400">
            Weather shock detection &amp; Quantile P10–P90 risk interval expansion around steepest real solar transients
          </p>
        </div>
        <span className="rounded-full border border-[#5CB8E4]/35 bg-[#5CB8E4]/10 px-3 py-1 text-xs font-mono-num text-[#8ED8F8]">
          14.281°N, 77.425°E · Alt 600m
        </span>
      </div>

      {/* Top Row: Radar SVG + Shock List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Doppler Radar */}
        <div data-tour-id="cr-radar" className="lg:col-span-5 cad-panel rounded-2xl p-4 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-xs font-mono-num text-[#8ED8F8] mb-2">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> DOPPLER IRRADIANCE SWEEP
            </span>
            <span>{ds.timestamps[focusIdx].replace("T", " ")} IST</span>
          </div>

          <svg viewBox="0 0 260 260" className="w-56 h-56 my-2 overflow-visible">
            <defs>
              <radialGradient id="radar-cloud" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(229,169,60,0.28)" />
                <stop offset="100%" stopColor="rgba(92,184,228,0.03)" />
              </radialGradient>
            </defs>
            <circle cx="130" cy="130" r="110" fill="url(#radar-cloud)" stroke="rgba(92,184,228,0.28)" />
            <circle cx="130" cy="130" r="74" fill="none" stroke="rgba(92,184,228,0.18)" strokeDasharray="3 4" />
            <circle cx="130" cy="130" r="38" fill="none" stroke="rgba(92,184,228,0.2)" />
            <line x1="20" y1="130" x2="240" y2="130" stroke="rgba(148,163,184,0.14)" />
            <line x1="130" y1="20" x2="130" y2="240" stroke="rgba(148,163,184,0.14)" />

            {/* Cloud Opacity Blob scaled to real cloud_cover% */}
            <circle
              cx={112 + (cloudNow / 100) * 28}
              cy={118}
              r={18 + (cloudNow / 100) * 44}
              fill={`rgba(148, 163, 184, ${0.15 + (cloudNow / 100) * 0.45})`}
            />

            {/* Animated Sweep Wedge */}
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "130px 130px" }}
            >
              <path d="M 130 130 L 130 20 A 110 110 0 0 1 205 55 Z" fill="rgba(92,184,228,0.16)" />
              <line x1="130" y1="130" x2="130" y2="20" stroke="#5CB8E4" strokeWidth="2" />
            </motion.g>

            {/* Center Pavagada Pin */}
            <circle cx="130" cy="130" r="5" fill="#E5A93C" />
            <text x="130" y="254" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono">
              PAVAGADA BUS CENTER
            </text>
          </svg>

          <div className="w-full grid grid-cols-3 gap-2 text-center font-mono-num text-xs mt-2">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-2">
              <div className="text-[10px] text-slate-400">CLOUD COVER</div>
              <div className="text-sm font-bold text-[#8ED8F8]">{cloudNow.toFixed(0)}%</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-2">
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Wind className="w-3 h-3" /> WIND
              </div>
              <div className="text-sm font-bold text-white">{windNow.toFixed(1)} m/s</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-2">
              <div className="text-[10px] text-slate-400">CLEAR RATIO</div>
              <div className="text-sm font-bold text-[#F3C669]">{(clearIndex * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* Clickable Real Shock Event List */}
        <div data-tour-id="cr-shocks" className="lg:col-span-7 cad-panel rounded-2xl p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
              <CloudLightning className="w-4 h-4 text-[#E5A93C]" />
              Detected Top Micro-Ramp Shocks ({shockEvents.length} Events)
            </h2>
            <span className="text-[11px] font-mono-num text-slate-400">Click event to inspect P10–P90 window</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
            {shockEvents.map((ev, i) => {
              const active = i === selectedShockIdx;
              const isDrop = ev.delta_mw < 0;
              return (
                <button
                  key={ev.timestamp}
                  onClick={() => {
                    setSelectedShockIdx(i);
                    setCursorIndex(ev.index);
                    completeQuest("inspectedShock");
                  }}
                  className={`text-left rounded-xl border p-2.5 transition cursor-pointer ${
                    active
                      ? "border-[#E5A93C] bg-[#E5A93C]/12 shadow-[0_0_16px_rgba(229,169,60,0.18)]"
                      : "border-white/[0.08] bg-white/[0.03] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono-num">
                    <span className="text-slate-300">{ev.timestamp.replace("T", " ")}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        isDrop ? "bg-[#F46060]/20 text-[#FCA5A5]" : "bg-[#34D399]/20 text-[#6EE7B7]"
                      }`}
                    >
                      {ev.delta_mw >= 0 ? "+" : ""}
                      {ev.delta_mw.toFixed(0)} MW/h
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-mono-num">
                    <span className="text-slate-400">
                      Cloud <strong className="text-slate-200">{ev.cloud_cover_pct}%</strong> · GHI {ev.ghi_wm2}
                    </span>
                    <span className="text-[#8ED8F8]">PI ±{(ev.pi_width_mw / 2).toFixed(0)} MW</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Zoomed Shock Trace + Thermal Derating */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 cad-panel rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#F46060]" />
              Quantile Risk Envelope Around Shock Window (±14h)
            </h3>
            {activeShock && (
              <span className="text-xs font-mono-num text-[#F3C669]">
                P90–P10 Width: {activeShock.pi_width_mw.toFixed(1)} MW
              </span>
            )}
          </div>
          <EChartBox option={shockWindowOption} height={260} />
        </div>

        <div data-tour-id="cr-thermal" className="xl:col-span-5 cad-panel rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-[#E5A93C]" />
              PV Cell Module Temp vs Efficiency Derating
            </h3>
            <span className="text-[11px] font-mono-num text-slate-400">Daytime GHI &gt; 250 W/m²</span>
          </div>
          <EChartBox option={thermalScatterOption} height={260} />
        </div>
      </div>
    </div>
  );
}

