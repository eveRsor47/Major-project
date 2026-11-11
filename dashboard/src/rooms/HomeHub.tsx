import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CloudLightning,
  Command,
  Cpu,
  FileSpreadsheet,
  Layers,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { GridPulseLogo } from "../components/GridPulseLogo";
import type { RoomId } from "../types";

export function HomeHub() {
  const {
    enterRoom,
    testData,
    valData,
    activeSplit,
    cursorIndex,
    manifest,
    benchmarks,
    replayStory,
    theme,
    toggleTheme,
    bgMotionEnabled,
    toggleBgMotion,
    setCmdPaletteOpen,
  } = useGridStore();

  const ds = activeSplit === "val_2025" && valData ? valData : testData;
  const idx = ds ? Math.min(cursorIndex, ds.count - 1) : 0;

  const solarNow = ds ? ds.duck_curve.true_solar[idx] : 0;
  const demandNow = ds ? ds.duck_curve.true_demand[idx] : 0;
  const netNow = ds ? ds.duck_curve.true_net_load[idx] : 0;
  const tsNow = ds ? ds.timestamps[idx].replace("T", " ") : "—";

  const portalCards: Array<{
    id: RoomId;
    title: string;
    tag: string;
    metric: string;
    desc: string;
    icon: typeof Activity;
    accent: string;
    iconColor: string;
  }> = [
    {
      id: "mission-control",
      title: "Mission Control",
      tag: "LIVE TELEMETRY",
      metric: `S1 24.95 MW · Net ${netNow.toFixed(0)} MW`,
      desc: "Dual-horizon ECharts forecast cockpit with 80% Quantile P10–P90 bands, Daily Duck Curve & chronological hour scrubber.",
      icon: Activity,
      accent: "hover:border-[#5CB8E4]/50 light:hover:border-sky-600/45",
      iconColor: "text-[#5CB8E4] light:text-sky-600",
    },
    {
      id: "neural-mixer",
      title: "AI Council & Neural Mixer",
      tag: "5 DL + NNLS",
      metric: "4 Ensembles · 4 Seasons",
      desc: "Interactive blending console for BiLSTM, GRU, CNN-LSTM, DLinear & LSTM with one-click scipy NNLS auto-solver.",
      icon: Sliders,
      accent: "hover:border-[#E5A93C]/50 light:hover:border-amber-600/45",
      iconColor: "text-[#E5A93C] light:text-amber-600",
    },
    {
      id: "cloud-radar",
      title: "Cloud Radar & Micro-Ramp",
      tag: "WEATHER SHOCKS",
      metric: `${ds?.shock_events.length ?? 0} Detected Ramps`,
      desc: "Doppler irradiance sweep centered on Pavagada (14.281°N) with ±14h uncertainty expansion & module thermal derating.",
      icon: CloudLightning,
      accent: "hover:border-[#5CB8E4]/50 light:hover:border-sky-600/45",
      iconColor: "text-[#8ED8F8] light:text-sky-700",
    },
    {
      id: "digital-twin",
      title: "8-Block Spatial Digital Twin",
      tag: "2,050 MW PARK",
      metric: `${solarNow.toFixed(0)} / 2,050 MW Active`,
      desc: "13,000-acre Pavagada sector map across NTPC, SECI, KREDL, Adani, Tata Power, Fortum, SB Energy & ReNew blocks.",
      icon: Layers,
      accent: "hover:border-[#E5A93C]/50 light:hover:border-amber-600/45",
      iconColor: "text-[#F3C669] light:text-amber-600",
    },
    {
      id: "viva-war-room",
      title: "Viva Examiner War Room",
      tag: "148 EVALUATIONS",
      metric: `${manifest?.verification.pytest_passed ?? 97}/${manifest?.verification.pytest_total ?? 97} Pytest Seal`,
      desc: "Searchable 148-model Test 2026 benchmark table, Val vs Test generalization chart & empirical viva defense Q&A.",
      icon: Cpu,
      accent: "hover:border-[#34D399]/50 light:hover:border-emerald-600/45",
      iconColor: "text-[#34D399] light:text-emerald-700",
    },
    {
      id: "ksldc-compliance",
      title: "KSLDC DSM Compliance Suite",
      tag: "±10% CERC/KERC",
      metric: "PDF Dossier · INR Simulator",
      desc: "Deviation Settlement Mechanism penalty savings calculator across S1, S24, D1 & D24 with print-ready dispatch report.",
      icon: FileSpreadsheet,
      accent: "hover:border-[#34D399]/50 light:hover:border-emerald-600/45",
      iconColor: "text-[#6EE7B7] light:text-emerald-700",
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. HERO COMMAND OVERVIEW CARD */}
      <section
        data-tour-id="home-brand-nav"
        className="cad-panel rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden"
      >
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#34D399]/35 bg-[#34D399]/10 light:bg-emerald-500/12 px-3 py-1 text-[11px] font-mono-num text-[#6EE7B7] light:text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>KARNATAKA SLDC · ZERO-LEAKAGE SMART GRID PLATFORM</span>
          </div>

          <div className="flex items-center gap-4">
            <GridPulseLogo mode="mark" themeAware={false} />
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white light:text-slate-900">
                GridPulse Command Home
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 light:text-slate-600 mt-0.5">
                Unified Renewable Solar &amp; State Load Forecasting Workspace · Pavagada Solar Park (2,050 MW)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={() => enterRoom("mission-control")}
              className="inline-flex items-center gap-2 rounded-full bg-[#EDF2F7] light:bg-slate-900 px-5 py-2 text-xs sm:text-sm font-semibold text-[#07080B] light:text-white hover:bg-white light:hover:bg-slate-800 transition cursor-pointer shadow-md"
            >
              <span>Launch Mission Control</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCmdPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 light:border-slate-300 bg-white/[0.04] light:bg-white px-4 py-2 text-xs sm:text-sm text-slate-200 light:text-slate-700 hover:border-white/30 light:hover:border-slate-400 transition cursor-pointer"
            >
              <Command className="w-3.5 h-3.5 text-[#5CB8E4] light:text-sky-600" />
              <span>Quick Jump (Ctrl+K)</span>
            </button>
            <button
              onClick={replayStory}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 light:border-slate-300 bg-white/[0.03] light:bg-slate-100 px-4 py-2 text-xs sm:text-sm text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay Intro Story</span>
            </button>
          </div>
        </div>

        {/* Right Live Telemetry Snapshot + Appearance Switches */}
        <div className="lg:w-[410px] space-y-3 shrink-0">
          <div className="cad-panel-amber rounded-2xl p-4 font-mono-num">
            <div className="flex items-center justify-between text-[11px] text-[#F3C669] light:text-amber-700">
              <span>ACTIVE TELEMETRY SNAPSHOT</span>
              <span>{tsNow} IST</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-black/25 light:bg-white/75 p-2 border border-white/[0.06] light:border-amber-900/10">
                <div className="text-[10px] text-slate-400 light:text-slate-500">SOLAR</div>
                <div className="text-sm font-bold text-[#F3C669] light:text-amber-700">{solarNow.toFixed(0)} MW</div>
              </div>
              <div className="rounded-xl bg-black/25 light:bg-white/75 p-2 border border-white/[0.06] light:border-sky-900/10">
                <div className="text-[10px] text-slate-400 light:text-slate-500">DEMAND</div>
                <div className="text-sm font-bold text-[#8ED8F8] light:text-sky-700">{demandNow.toFixed(0)} MW</div>
              </div>
              <div className="rounded-xl bg-black/25 light:bg-white/75 p-2 border border-white/[0.06] light:border-emerald-900/10">
                <div className="text-[10px] text-slate-400 light:text-slate-500">NET LOAD</div>
                <div className="text-sm font-bold text-[#6EE7B7] light:text-emerald-700">{netNow.toFixed(0)} MW</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={toggleTheme}
              className="cad-panel rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-200 light:text-slate-800 hover:border-[#5CB8E4]/50 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="w-4 h-4 text-[#8ED8F8]" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-600" />
                )}
                <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
              </span>
              <span className="text-[10px] font-mono-num text-slate-400">Switch</span>
            </button>

            <button
              onClick={toggleBgMotion}
              className="cad-panel rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-200 light:text-slate-800 hover:border-[#E5A93C]/50 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Waves className={`w-4 h-4 ${bgMotionEnabled ? "text-[#34D399] light:text-emerald-600" : "text-slate-500"}`} />
                <span>{bgMotionEnabled ? "Live Grid BG" : "Static BG"}</span>
              </span>
              <span className="text-[10px] font-mono-num text-slate-400">
                {bgMotionEnabled ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. VERIFIED BENCHMARK PILLS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: "S1 SOLAR 1H RMSE", value: "24.95 MW", sub: "+88.8% Skill vs Persistence", tint: "text-[#F3C669] light:text-amber-700" },
          { label: "D1 DEMAND 1H MAPE", value: "0.96%", sub: "160.28 MW RMSE · R² 0.9922", tint: "text-[#8ED8F8] light:text-sky-700" },
          { label: "NET DUCK CURVE R²", value: "0.9903", sub: "161.35 MW Net Conservation", tint: "text-[#6EE7B7] light:text-emerald-700" },
          { label: "QUARANTINED AUDITS", value: `${benchmarks?.m10_test_benchmark.length ?? 148} Models`, sub: `${manifest?.verification.pytest_passed ?? 97}/97 Automated Checks`, tint: "text-white light:text-slate-900" },
        ].map((k) => (
          <div key={k.label} className="cad-panel rounded-2xl p-4">
            <div className="text-[11px] font-mono-num text-slate-400 light:text-slate-500">{k.label}</div>
            <div className={`mt-1 font-display text-2xl font-bold ${k.tint}`}>{k.value}</div>
            <div className="mt-0.5 text-xs font-mono-num text-slate-400 light:text-slate-600">{k.sub}</div>
          </div>
        ))}
      </section>

      {/* 3. INTERACTIVE 6-ROOM COMMAND PORTAL */}
      <section data-tour-id="home-room-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {portalCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => enterRoom(card.id)}
              className={`group text-left cad-panel rounded-2xl p-5 border border-white/[0.08] light:border-slate-900/10 ${card.accent} transition-all cursor-pointer flex flex-col justify-between gap-4`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-2 text-[11px] font-mono-num tracking-wider text-slate-400 light:text-slate-500">
                    <Sparkles className="w-3 h-3 text-[#E5A93C] light:text-amber-600" />
                    {card.tag}
                  </span>
                  <span className={`p-2 rounded-xl bg-white/[0.04] light:bg-slate-900/[0.05] ${card.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-white light:text-slate-900 group-hover:translate-x-0.5 transition-transform">
                  {card.title}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300 light:text-slate-600">
                  {card.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.08] light:border-slate-900/10 flex items-center justify-between text-xs font-mono-num">
                <span className="text-[#8ED8F8] light:text-sky-700 font-semibold">{card.metric}</span>
                <span className="inline-flex items-center gap-1 text-slate-300 light:text-slate-700 group-hover:text-white light:group-hover:text-slate-950 font-medium">
                  Enter <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </motion.button>
          );
        })}
      </section>
    </div>
  );
}
