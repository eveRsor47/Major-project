import { useMemo, useState } from "react";
import { Building2, Pause, Play, Sun, Zap } from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { EChartBox } from "../components/EChartBox";

const PARK_SECTORS = [
  { key: "section_1", code: "BLK-01", operator: "NTPC Solar I", capMw: 256.25 },
  { key: "section_2", code: "BLK-02", operator: "SECI Corridor II", capMw: 256.25 },
  { key: "section_3", code: "BLK-03", operator: "KREDL Phase III", capMw: 256.25 },
  { key: "section_4", code: "BLK-04", operator: "Adani Green IV", capMw: 256.25 },
  { key: "section_5", code: "BLK-05", operator: "Tata Power V", capMw: 256.25 },
  { key: "section_6", code: "BLK-06", operator: "Fortum Charge VI", capMw: 256.25 },
  { key: "section_7", code: "BLK-07", operator: "SB Energy VII", capMw: 256.25 },
  { key: "section_8", code: "BLK-08", operator: "ReNew Azure VIII", capMw: 256.25 },
];

export function DigitalTwin() {
  const { activeSplit, testData, valData, cursorIndex, setCursorIndex, isPlaying, setIsPlaying } = useGridStore();
  const ds = activeSplit === "val_2025" && valData ? valData : testData;
  const [selectedIdx, setSelectedIdx] = useState(0);

  const idx = ds ? Math.min(cursorIndex, ds.count - 1) : 0;

  const sectorValues = useMemo(() => {
    if (!ds) return PARK_SECTORS.map((s) => ({ ...s, mw: 0, util: 0 }));
    return PARK_SECTORS.map((sec) => {
      const val = ds.sections[sec.key]?.[idx] ?? 0;
      return {
        ...sec,
        mw: val,
        util: Math.min(100, (val / sec.capMw) * 100),
      };
    });
  }, [ds, idx]);

  const barOption = useMemo(() => {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8,13,25,0.95)",
        textStyle: { color: "#E2E8F0", fontSize: 11, fontFamily: "JetBrains Mono" },
      },
      grid: { top: 20, left: 46, right: 12, bottom: 26 },
      xAxis: {
        type: "category",
        data: sectorValues.map((s) => s.code),
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      yAxis: {
        type: "value",
        max: 260,
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.08)" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, fontFamily: "JetBrains Mono" },
      },
      series: [
        {
          name: "Block Output (MW)",
          type: "bar",
          data: sectorValues.map((s, i) => ({
            value: Number(s.mw.toFixed(1)),
            itemStyle: {
              color: i === selectedIdx ? "#5CB8E4" : "#E5A93C",
              borderRadius: [4, 4, 0, 0],
            },
          })),
        },
      ],
    };
  }, [sectorValues, selectedIdx]);

  if (!ds) return null;

  const selected = sectorValues[selectedIdx] ?? sectorValues[0];
  const cloudPct = ds.weather.cloud_cover[idx];
  const ghi = ds.weather.ghi[idx];
  const csky = Math.max(1, ds.weather.clearsky_ghi[idx]);
  const clearRatio = ghi > 5 ? Math.min(100, (ghi / csky) * 100) : 0;
  const totalMw = sectorValues.reduce((acc, s) => acc + s.mw, 0);

  const jumpToNoon = () => {
    const noonIdx = ds.weather.ghi.findIndex((g) => g > 750);
    if (noonIdx >= 0) setCursorIndex(noonIdx);
  };

  return (
    <div className="space-y-4">
      <div className="cad-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-base sm:text-lg font-bold text-white">
            Pavagada 8-Block Spatial Digital Twin (13,000 Acres · 2,050 MW)
          </h1>
          <p className="text-xs text-slate-400">
            Real section_1_mw through section_8_mw telemetry shaded by instantaneous load &amp; cloud passage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={jumpToNoon}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5A93C]/45 bg-[#E5A93C]/12 px-3.5 py-1.5 text-xs font-medium text-[#F3C669] hover:bg-[#E5A93C]/22 cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5" /> Jump to Peak Sun
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF2F7] px-3.5 py-1.5 text-xs font-semibold text-[#07080B] hover:bg-white cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause" : "Animate Day"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Interactive 8-Block Spatial Grid Map */}
        <div data-tour-id="dt-park-map" className="xl:col-span-7 cad-panel rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono-num mb-4">
            <span className="text-[#F3C669]">
              PARK TOTAL OUTPUT: <strong className="text-white">{totalMw.toFixed(1)} / 2,050 MW</strong>
            </span>
            <span className="text-[#8ED8F8]">{ds.timestamps[idx].replace("T", " ")} IST</span>
          </div>

          {/* Subtle Cloud Attenuation Mist */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-500"
            style={{
              background:
                "radial-gradient(circle at 60% 35%, rgba(148,163,184,0.28), transparent 65%)",
              opacity: Math.min(0.85, cloudPct / 100),
            }}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            {sectorValues.map((sec, i) => {
              const isSel = i === selectedIdx;
              const heatAlpha = Math.max(0.12, Math.min(0.88, sec.util / 100));
              return (
                <button
                  key={sec.key}
                  onClick={() => setSelectedIdx(i)}
                  className={`group text-left rounded-xl p-3.5 border transition-all cursor-pointer relative overflow-hidden ${
                    isSel
                      ? "border-[#5CB8E4] ring-2 ring-[#5CB8E4]/35 scale-[1.02]"
                      : "border-[#E5A93C]/25 hover:border-[#E5A93C]/60"
                  }`}
                  style={{
                    background: `linear-gradient(155deg, rgba(229,169,60,${heatAlpha * 0.36}), rgba(10,12,18,0.92))`,
                  }}
                >
                  {/* Simulated PV Array Cell Lines */}
                  <div className="grid grid-cols-4 gap-1 mb-2.5 opacity-60">
                    {[1, 2, 3, 4].map((cell) => (
                      <div
                        key={cell}
                        className="h-2 rounded-xs bg-[#E5A93C]/55"
                        style={{ opacity: 0.25 + (sec.util / 100) * 0.75 }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] font-mono-num text-[#F3C669]/80">{sec.code}</div>
                  <div className="text-xs font-display font-bold text-white truncate">{sec.operator}</div>
                  <div className="mt-1.5 font-mono-num text-sm font-bold text-white">
                    {sec.mw.toFixed(1)} MW
                  </div>
                  <div className="text-[10px] font-mono-num text-slate-300">
                    {sec.util.toFixed(1)}% of {sec.capMw} MW
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={ds.count - 1}
              value={idx}
              onChange={(e) => {
                setIsPlaying(false);
                setCursorIndex(Number(e.target.value));
              }}
              className="flex-1 cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Block Inspector & Per-Sector Bar Chart */}
        <div data-tour-id="dt-block-inspector" className="xl:col-span-5 space-y-4">
          <div className="cad-panel rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#5CB8E4]" />
                <div>
                  <div className="text-[10px] font-mono-num text-[#8ED8F8]">{selected.code} SELECTED</div>
                  <h2 className="font-display text-base font-bold text-white">{selected.operator}</h2>
                </div>
              </div>
              <span className="rounded-lg bg-[#E5A93C]/12 border border-[#E5A93C]/35 px-2.5 py-1 font-mono-num text-xs font-bold text-[#F3C669]">
                {selected.mw.toFixed(1)} MW
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono-num text-xs">
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-2.5">
                <div className="text-[10px] text-slate-400">UTILIZATION</div>
                <div className="text-sm font-bold text-white">{selected.util.toFixed(1)}%</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-2.5">
                <div className="text-[10px] text-slate-400">CLEAR-SKY</div>
                <div className="text-sm font-bold text-[#F3C669]">{clearRatio.toFixed(0)}%</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-2.5">
                <div className="text-[10px] text-slate-400">MOD TEMP</div>
                <div className="text-sm font-bold text-[#8ED8F8]">{ds.weather.module_temp[idx].toFixed(1)}°C</div>
              </div>
            </div>
          </div>

          <div className="cad-panel rounded-2xl p-4">
            <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5 mb-2">
              <Zap className="w-4 h-4 text-[#E5A93C]" /> Simultaneous Sector Output Profile
            </h3>
            <EChartBox option={barOption} height={225} />
          </div>
        </div>
      </div>
    </div>
  );
}

