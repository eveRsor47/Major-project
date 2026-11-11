import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Cpu,
  Pause,
  Play,
  ShieldCheck,
  SkipForward,
  Sun,
  Wind,
  Zap,
} from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { GridPulseLogo } from "./GridPulseLogo";
import { sfx } from "../utils/sfx";

const SCENES = [
  {
    id: 0,
    tag: "SCENE 01 / 05 · REAL-WORLD CONTEXT",
    title: "The Growing Energy Challenge",
    narration:
      "Modern power grids are no longer driven by predictable baseload alone. Across Karnataka's 2,050 MW Pavagada Solar Park, sunlight fluctuates hour by hour with moving cloud fronts, temperature, and wind shifts while homes, factories, hospitals, and EV chargers reshape electricity demand in real time.",
  },
  {
    id: 1,
    tag: "SCENE 02 / 05 · WHY EXISTING DISPATCH FAILS",
    title: "When Grids React Too Late",
    narration:
      "Relying on static averages or naive persistence leaves operators blind until an imbalance has already begun. Sudden cloud transients drop megawatts off the bus while evening demand surges—straining grid frequency, wasting curtailed clean power, and forcing costly, late fossil backup starts.",
  },
  {
    id: 2,
    tag: "SCENE 03 / 05 · ARCHITECTURE & INTELLIGENCE",
    title: "Why We Built GridPulse",
    narration:
      "We engineered an integrated, leak-free AI forecasting stack unifying five Optuna-tuned deep neural architectures, Stacking Ridge meta-learning, Quantile P10–P90 risk bands, and strict M9 physical safety constraints—predicting Solar, State Demand, and the Net Load Duck Curve across 1-hour and 24-hour horizons.",
  },
  {
    id: 3,
    tag: "SCENE 04 / 05 · VERIFIED IMPACT",
    title: "What We Solved",
    narration:
      "Evaluated across 148 unblinded test runs with 92/92 automated verification checks passed: solar ramp surprises are intercepted early, evening Duck Curve climbs are scheduled cleanly, frequency locks steady at 50.00 Hz, and operators gain transparent, physics-constrained decision support.",
  },
  {
    id: 4,
    tag: "SCENE 05 / 05 · SYSTEM INITIALIZATION",
    title: "This is GridPulse.",
    narration: "",
  },
];

const SCENE3_MODULES = [
  { name: "Solar 1h / 24h Engine", sub: "S1 · S24 Horizon Models", color: "border-amber-400/50 text-amber-300 bg-amber-500/10" },
  { name: "Demand 1h / 24h Engine", sub: "D1 · D24 State Load", color: "border-cyan-400/50 text-cyan-300 bg-cyan-500/10" },
  { name: "5-DL Optuna Council", sub: "BiLSTM · GRU · CNN-LSTM · DLinear · LSTM", color: "border-sky-400/50 text-sky-300 bg-sky-500/10" },
  { name: "Stacking Ridge & NNLS", sub: "Zero-Leakage Meta-Learner", color: "border-emerald-400/50 text-emerald-300 bg-emerald-500/10" },
  { name: "Quantile LightGBM", sub: "P10 – P50 – P90 Risk Bands", color: "border-violet-400/50 text-violet-300 bg-violet-500/10" },
  { name: "M9 Physical Safety", sub: "Zenith >= 90° Night Clamp & Ramp Gate", color: "border-teal-400/50 text-teal-300 bg-teal-500/10" },
  { name: "Net Load Duck Curve", sub: "P_net = P_demand - P_solar", color: "border-amber-300/50 text-amber-200 bg-amber-500/10" },
];

const SCENE4_CHECKS = [
  "Accurate Load Forecasting (D1/D24)",
  "Solar Generation Prediction (S1/S24)",
  "Weather Volatility Modeling",
  "Net Load Duck Curve Estimation",
  "Renewable Utilization Optimization",
  "Early Ramp & Deficit Detection",
  "M9 Physical Night & Ramp Safety",
  "Real-Time Operator Decision Support",
];

const WHISPER_MESSAGES = [
  "Initializing Renewable Intelligence...",
  "Loading M8 / M9 / M10 Telemetry...",
  "Synchronizing Renewable Forecasts...",
  "Preparing Mission Control...",
];

export function StoryIntro() {
  const { storyScene, setStoryScene, loadCoreData, coreLoaded, setPhase } = useGridStore();
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [whisperIdx, setWhisperIdx] = useState(0);
  const [skipping, setSkipping] = useState(false);

  const [revealBeatDone, setRevealBeatDone] = useState(false);

  // Kick off real telemetry fetch silently in background on mount
  useEffect(() => {
    void loadCoreData();
  }, [loadCoreData]);

  // Auto-advance timer across Scenes 1..4
  useEffect(() => {
    if (!autoAdvance || storyScene >= 4) return;
    const duration = storyScene === 2 || storyScene === 3 ? 6500 : 5800;
    const t = setTimeout(() => {
      setStoryScene(storyScene + 1);
    }, duration);
    return () => clearTimeout(t);
  }, [autoAdvance, storyScene, setStoryScene]);

  // Scene 5 Reveal Choreography: whisper status cycle + minimum animation beat
  useEffect(() => {
    if (storyScene !== 4) {
      setRevealBeatDone(false);
      return;
    }
    sfx.playRevealChord();
    setRevealBeatDone(false);
    const wTimer = setInterval(() => {
      setWhisperIdx((i) => Math.min(WHISPER_MESSAGES.length - 1, i + 1));
    }, 800);
    const beatTimer = setTimeout(() => setRevealBeatDone(true), 3300);

    return () => {
      clearInterval(wTimer);
      clearTimeout(beatTimer);
    };
  }, [storyScene]);

  // Transition cleanly into Mission Control once BOTH reveal animation beat and real JSON fetch complete
  useEffect(() => {
    if (storyScene === 4 && revealBeatDone && coreLoaded) {
      setPhase("app");
    }
  }, [storyScene, revealBeatDone, coreLoaded, setPhase]);

  // Instant entry if user clicks Skip Intro
  useEffect(() => {
    if (skipping && coreLoaded) {
      setPhase("app");
    }
  }, [skipping, coreLoaded, setPhase]);

  const handleSkipIntro = () => {
    sfx.playTick(580, 0.05, 0.025);
    if (coreLoaded) {
      setPhase("app");
    } else {
      setSkipping(true);
      setAutoAdvance(false);
      setStoryScene(4);
    }
  };

  const scene = SCENES[storyScene] ?? SCENES[0];

  // Dynamic atmospheric glow per scene
  const bgGradient =
    storyScene === 0
      ? "from-[#11192c] via-[#0b1120] to-[#060911]"
      : storyScene === 1
      ? "from-[#1f1018] via-[#120d1a] to-[#060911]"
      : storyScene === 2
      ? "from-[#09182c] via-[#081224] to-[#050811]"
      : storyScene === 3
      ? "from-[#09211d] via-[#08131d] to-[#060911]"
      : "from-[#050810] via-[#060911] to-[#04060c]";

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-b ${bgGradient} transition-colors duration-1000 overflow-hidden`}>
      {/* Subtle blueprint grid overlay */}
      <div className="cad-grid-bg pointer-events-none absolute inset-0 opacity-60" />

      {/* Ambient radial spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 transition-all duration-1000"
        style={{
          background:
            storyScene === 0
              ? "radial-gradient(circle at 22% 28%, rgba(245,158,11,0.22), transparent 52%)"
              : storyScene === 1
              ? "radial-gradient(circle at 65% 32%, rgba(239,68,68,0.22), transparent 55%)"
              : storyScene === 2
              ? "radial-gradient(circle at 50% 45%, rgba(6,182,212,0.24), transparent 58%)"
              : storyScene === 3
              ? "radial-gradient(circle at 40% 40%, rgba(16,185,129,0.22), transparent 55%)"
              : "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.16), transparent 45%)",
        }}
      />

      {/* TOP BAR */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <GridPulseLogo mode="mark" />
          <div className="text-xs font-mono-num tracking-widest uppercase text-cyan-300/80">
            {scene.tag}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {storyScene < 4 && (
            <button
              onClick={() => setAutoAdvance((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-400/50 hover:text-white transition"
              title={autoAdvance ? "Pause Story Auto-Play" : "Resume Story Auto-Play"}
            >
              {autoAdvance ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{autoAdvance ? "Auto" : "Paused"}</span>
            </button>
          )}
          <button
            onClick={handleSkipIntro}
            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400 transition cursor-pointer"
          >
            <span>{skipping ? "Loading Control Room..." : "Skip Intro"}</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* CENTER ANIMATED CINEMATIC STAGE */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-10 py-2">
        <AnimatePresence mode="wait">
          {/* SCENE 1: REAL-WORLD SOLAR + WIND WEATHER + FLUCTUATING CITY DEMAND */}
          {storyScene === 0 && (
            <motion.div
              key="scene-0"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
            >
              <div className="lg:col-span-8 cad-panel rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400 mb-3">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Sun className="w-3.5 h-3.5" /> PAVAGADA SOLAR PARK · 14.281°N, 77.425°E
                  </span>
                  <span className="flex items-center gap-2 text-cyan-300">
                    <Wind className="w-3.5 h-3.5" /> KARNATAKA GRID LIVE FLOW
                  </span>
                </div>

                {/* Stylized Animated Grid & City SVG */}
                <svg viewBox="0 0 760 300" className="w-full h-56 sm:h-64 overflow-visible">
                  {/* Sun trajectory */}
                  <path
                    d="M 45 140 Q 170 15 310 140"
                    stroke="rgba(251,191,36,0.22)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    fill="none"
                  />
                  <motion.g
                    animate={{ x: [0, 35, 0], y: [0, -14, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <circle cx="155" cy="52" r="24" fill="rgba(251,191,36,0.18)" />
                    <circle cx="155" cy="52" r="14" fill="#FBBF24" />
                  </motion.g>

                  {/* Weather Wind Turbine / Anemometer (visualizing variable atmospheric fronts) */}
                  {[68, 118].map((wx, idx) => (
                    <g key={wx} transform={`translate(${wx}, 145)`}>
                      <line x1="0" y1="0" x2="0" y2="62" stroke="#475569" strokeWidth="3" />
                      <motion.g
                        animate={{ rotate: 360 }}
                        transition={{ duration: idx === 0 ? 2.4 : 3.2, repeat: Infinity, ease: "linear" }}
                        style={{ transformOrigin: "0px 0px" }}
                      >
                        <path d="M 0 0 L -4 -26 L 3 -26 Z" fill="#38BDF8" />
                        <path d="M 0 0 L 23 13 L 19 19 Z" fill="#38BDF8" />
                        <path d="M 0 0 L -22 14 L -26 8 Z" fill="#38BDF8" />
                      </motion.g>
                      <circle cx="0" cy="0" r="3.5" fill="#E2E8F0" />
                    </g>
                  ))}

                  {/* Pavagada PV Solar Array */}
                  <g transform="translate(155, 178)">
                    {[0, 48, 96].map((px, i) => (
                      <motion.g
                        key={px}
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: [0.65, 1, 0.75] }}
                        transition={{ duration: 2.5, delay: i * 0.3, repeat: Infinity }}
                      >
                        <polygon
                          points={`${px},28 ${px + 38},28 ${px + 44},8 ${px + 6},8`}
                          fill="rgba(245,158,11,0.28)"
                          stroke="#FBBF24"
                          strokeWidth="1.4"
                        />
                        <line x1={px + 20} y1="8" x2={px + 20} y2="28" stroke="rgba(251,191,36,0.4)" />
                      </motion.g>
                    ))}
                    <text x="68" y="48" textAnchor="middle" fill="#FBBF24" fontSize="11" fontFamily="JetBrains Mono">
                      PV ARRAY · UP TO 2,050 MW
                    </text>
                  </g>

                  {/* Transmission Corridor with Animated Photon Pulses */}
                  <path
                    d="M 295 190 C 370 155, 420 205, 495 168"
                    stroke="rgba(6,182,212,0.35)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <motion.path
                    d="M 295 190 C 370 155, 420 205, 495 168"
                    stroke="#38BDF8"
                    strokeWidth="3"
                    strokeDasharray="10 14"
                    fill="none"
                    animate={{ strokeDashoffset: [0, -48] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                  />
                  {/* Transmission Pylon */}
                  <path d="M 392 178 L 382 222 M 392 178 L 402 222 M 378 192 L 406 192" stroke="#64748B" strokeWidth="2" />

                  {/* Modern City Skyline Sectors: Homes, Hospital, Industry, EV Hub */}
                  {[
                    { x: 505, w: 48, h: 78, label: "HOMES", color: "#38BDF8", rows: 3 },
                    { x: 562, w: 54, h: 108, label: "HOSPITAL", color: "#10B981", rows: 4 },
                    { x: 625, w: 60, h: 90, label: "INDUSTRY", color: "#F59E0B", rows: 3 },
                    { x: 694, w: 48, h: 68, label: "EV HUB", color: "#A855F7", rows: 2 },
                  ].map((b, i) => (
                    <g key={b.label}>
                      <rect
                        x={b.x}
                        y={220 - b.h}
                        width={b.w}
                        height={b.h}
                        rx="4"
                        fill="rgba(15,23,42,0.94)"
                        stroke={b.color}
                        strokeWidth="1.6"
                      />
                      {Array.from({ length: b.rows }).map((_, rIdx) => (
                        <motion.rect
                          key={rIdx}
                          x={b.x + 8}
                          y={220 - b.h + 12 + rIdx * 17}
                          width={b.w - 16}
                          height={9}
                          rx="1.5"
                          fill={b.color}
                          animate={{ opacity: [0.4, 0.95, 0.45] }}
                          transition={{ duration: 1.5, delay: i * 0.22 + rIdx * 0.12, repeat: Infinity }}
                        />
                      ))}
                      <text
                        x={b.x + b.w / 2}
                        y="238"
                        textAnchor="middle"
                        fill="#CBD5E1"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="JetBrains Mono"
                      >
                        {b.label}
                      </text>
                    </g>
                  ))}

                  {/* Ground Horizon */}
                  <line x1="20" y1="222" x2="745" y2="222" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
                </svg>
              </div>

              <div className="lg:col-span-4 space-y-3">
                {[
                  { icon: Sun, title: "Solar Variability", val: "0 ↔ 2,050 MW", note: "Swings daily with irradiance & zenith", tint: "text-amber-300 border-amber-500/30" },
                  { icon: Wind, title: "Weather Volatility", val: "Clouds & Wind", note: "Unpredictable irradiance transients", tint: "text-cyan-300 border-cyan-500/30" },
                  { icon: Activity, title: "Shifting Demand", val: "10,000–17,500 MW", note: "Residential, hospital, industry & EVs", tint: "text-emerald-300 border-emerald-500/30" },
                ].map((c, idx) => (
                  <motion.div
                    key={c.title}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + idx * 0.16 }}
                    className={`cad-panel rounded-xl p-3.5 border ${c.tint}`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                      <c.icon className="w-4 h-4" />
                      <span>{c.title}</span>
                    </div>
                    <div className="mt-1 font-mono-num text-lg font-bold text-white">{c.val}</div>
                    <div className="text-xs text-slate-400">{c.note}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 2: THE PROBLEM */}
          {storyScene === 1 && (
            <motion.div
              key="scene-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
            >
              <div className="lg:col-span-7 cad-panel rounded-2xl p-5 border-red-500/35 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono-num text-red-400">
                    <AlertTriangle className="w-4 h-4 animate-pulse" /> CLOUD SHOCK &amp; EVENING RAMP IMBALANCE
                  </span>
                  <motion.span
                    animate={{ opacity: [1, 0.55, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="rounded px-2 py-0.5 text-xs font-mono-num font-bold bg-red-500/20 border border-red-500/50 text-red-300"
                  >
                    FREQ 49.74 Hz ↓
                  </motion.span>
                </div>

                <svg viewBox="0 0 640 245" className="w-full h-52 sm:h-60">
                  {/* Approaching Dark Cloud Cover */}
                  <motion.g
                    animate={{ x: [0, 72, 20] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ellipse cx="145" cy="56" rx="68" ry="24" fill="rgba(100,116,139,0.5)" />
                    <ellipse cx="185" cy="64" rx="52" ry="20" fill="rgba(71,85,105,0.65)" />
                    <text x="155" y="61" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontFamily="JetBrains Mono">
                      CLOUD TRANSIENT ↓GHI
                    </text>
                  </motion.g>

                  {/* Dropped Solar Panel Output */}
                  <rect x="75" y="150" width="150" height="44" rx="5" fill="rgba(127,29,29,0.28)" stroke="#EF4444" strokeDasharray="4 3" />
                  <text x="150" y="176" textAnchor="middle" fill="#FCA5A5" fontSize="11" fontFamily="JetBrains Mono">
                    SOLAR DROP -420 MW
                  </text>

                  {/* Stressed Transmission Line */}
                  <motion.path
                    d="M 230 172 L 385 130"
                    stroke="#EF4444"
                    strokeWidth="3.5"
                    strokeDasharray="8 6"
                    animate={{ strokeDashoffset: [0, -28] }}
                    transition={{ duration: 0.55, repeat: Infinity, ease: "linear" }}
                  />
                  <rect x="258" y="112" width="102" height="22" rx="4" fill="rgba(239,68,68,0.2)" stroke="#EF4444" />
                  <text x="309" y="126" textAnchor="middle" fill="#FECACA" fontSize="9.5" fontFamily="JetBrains Mono">
                    LINE OVERLOAD
                  </text>

                  {/* Surging Demand & Late Backup Plant */}
                  <rect x="395" y="96" width="105" height="98" rx="4" fill="rgba(245,158,11,0.12)" stroke="#F59E0B" />
                  <text x="447" y="120" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="JetBrains Mono">
                    EVENING SURGE
                  </text>
                  <text x="447" y="140" textAnchor="middle" fill="#F59E0B" fontSize="15" fontWeight="700" fontFamily="JetBrains Mono">
                    +1,650 MW/h
                  </text>

                  {/* Late Fossil Backup with Smoke */}
                  <rect x="525" y="126" width="76" height="68" rx="4" fill="rgba(51,65,85,0.5)" stroke="#94A3B8" />
                  <text x="563" y="164" textAnchor="middle" fill="#CBD5E1" fontSize="9" fontFamily="JetBrains Mono">
                    LATE BACKUP
                  </text>
                  <text x="563" y="180" textAnchor="middle" fill="#FCA5A5" fontSize="9" fontFamily="JetBrains Mono">
                    HIGH CO₂
                  </text>
                  <motion.circle
                    cx="563"
                    cy="92"
                    r="11"
                    fill="rgba(148,163,184,0.38)"
                    animate={{ cy: [110, 55], opacity: [0.7, 0] }}
                    transition={{ duration: 1.9, repeat: Infinity }}
                  />
                </svg>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                {[
                  "Clouds & weather shocks drop solar without warning",
                  "Manual reactivity arrives after imbalance occurs",
                  "Volatile ramping triggers expensive reserve penalties",
                  "Grid frequency stability & congestion suffer",
                  "Surplus clean energy gets wasted via curtailment",
                  "Unnecessary fossil backup spikes carbon emissions",
                ].map((line, i) => (
                  <motion.div
                    key={line}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.12 }}
                    className="flex items-center gap-2.5 rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-xs sm:text-sm text-slate-200"
                  >
                    <CloudRain className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{line}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 3: WHY WE BUILT THIS (CAD BLUEPRINT SELF-ASSEMBLY) */}
          {storyScene === 2 && (
            <motion.div
              key="scene-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-5xl cad-panel rounded-2xl p-5 sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                <div className="flex items-center gap-2 text-xs font-mono-num text-cyan-300">
                  <Cpu className="w-4 h-4" /> SYSTEM BLUEPRINT · STRICT CHRONOLOGICAL ZERO-LEAKAGE PIPELINE
                </div>
                <span className="text-[11px] font-mono-num rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-cyan-200">
                  43,824 Hourly Observations · Train → Val → Test
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
                {SCENE3_MODULES.map((mod, idx) => (
                  <motion.div
                    key={mod.name}
                    initial={{ opacity: 0, y: 18, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + idx * 0.16, duration: 0.4 }}
                    className={`rounded-xl border p-3.5 ${mod.color} shadow-lg`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-num text-[10px] opacity-75">MOD 0{idx + 1}</span>
                      <motion.span
                        animate={{ scale: [1, 1.35, 1] }}
                        transition={{ duration: 1.5, delay: idx * 0.2, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-current"
                      />
                    </div>
                    <div className="font-display font-semibold text-sm text-white">{mod.name}</div>
                    <div className="text-[11px] text-slate-300/80 mt-0.5 font-mono-num">{mod.sub}</div>
                  </motion.div>
                ))}

                {/* 8th Hub Slot converging all modules */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.35, duration: 0.45 }}
                  className="rounded-xl border border-cyan-400/70 bg-gradient-to-br from-cyan-500/20 to-amber-500/15 p-3.5 flex flex-col justify-center"
                >
                  <div className="flex items-center gap-2 text-cyan-200 font-display font-bold text-sm">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Unified GridPulse Core
                  </div>
                  <div className="text-[11px] font-mono-num text-slate-200 mt-1">
                    148 Models Audited · Champion: Stacking Ridge + M9
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* SCENE 4: WHAT WE SOLVED */}
          {storyScene === 3 && (
            <motion.div
              key="scene-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
            >
              {/* Left Equilibrium Indicators */}
              <div className="lg:col-span-5 space-y-3">
                <div className="cad-panel rounded-xl p-4 border-emerald-500/40">
                  <div className="flex items-center justify-between text-xs font-mono-num text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> GRID FREQUENCY LOCKED
                    </span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold">50.00 Hz</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 text-center font-mono-num">
                    <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5">
                      <div className="text-[10px] text-slate-400">SOLAR 1H SKILL</div>
                      <div className="text-lg font-bold text-amber-300">+88.8%</div>
                      <div className="text-[10px] text-slate-500">24.95 MW RMSE</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5">
                      <div className="text-[10px] text-slate-400">DEMAND 1H MAPE</div>
                      <div className="text-lg font-bold text-cyan-300">0.96%</div>
                      <div className="text-[10px] text-slate-500">160.28 MW RMSE</div>
                    </div>
                  </div>
                </div>

                <div className="cad-panel rounded-xl p-4 border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <BatteryCharging className="w-4 h-4 text-emerald-400" />
                      Proactive Reserve &amp; Storage Dispatch
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Surplus solar stored ahead of the 17:00–20:00 Duck Curve climb
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {[1, 2, 3, 4].map((bar, i) => (
                      <motion.div
                        key={bar}
                        initial={{ scaleY: 0.2, opacity: 0.3 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                        transition={{ delay: 0.2 * i, duration: 0.45 }}
                        className="w-2.5 h-8 rounded-sm bg-emerald-400 origin-bottom"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right 8 Verified Checkmarks */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SCENE4_CHECKS.map((item, idx) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.14 }}
                    className="cad-panel rounded-xl px-3.5 py-2.5 border-emerald-500/30 flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-slate-100">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 5: SIGNATURE d <-> p YIN-YANG REVEAL + SILENT WHISPER LOADER (ZERO PROGRESS BARS) */}
          {storyScene === 4 && (
            <motion.div
              key="scene-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center text-center py-6 relative"
            >
              {/* Converging orbital energy streams */}
              <motion.div
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: [0, 0.7, 0.3] }}
                transition={{ duration: 2.2, ease: "easeOut" }}
                className="pointer-events-none absolute w-72 h-72 rounded-full border border-cyan-400/20"
              />
              <motion.div
                initial={{ scale: 2.2, opacity: 0 }}
                animate={{ scale: 0.9, opacity: [0, 0.5, 0.2] }}
                transition={{ duration: 2.5, ease: "easeOut" }}
                className="pointer-events-none absolute w-96 h-96 rounded-full border border-amber-400/20"
              />

              <GridPulseLogo mode="reveal" />

              <motion.div
                key={whisperIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-8 text-xs sm:text-sm font-mono-num tracking-widest text-cyan-300/80"
              >
                {WHISPER_MESSAGES[whisperIdx]}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM NARRATION & STORY CONTROLS */}
      <footer className="relative z-10 px-5 sm:px-8 pb-5 pt-2">
        <div className="mx-auto max-w-4xl">
          {storyScene < 4 && (
            <motion.div
              key={`narration-${storyScene}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cad-panel rounded-2xl px-5 py-4 mb-3"
            >
              <h2 className="font-display text-lg sm:text-xl font-bold text-white mb-1">
                {scene.title}
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                {scene.narration}
              </p>
            </motion.div>
          )}

          {/* Scene Dots & Prev/Next Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {SCENES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setAutoAdvance(false);
                    setStoryScene(s.id);
                  }}
                  aria-label={`Jump to Scene ${s.id + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    s.id === storyScene
                      ? "w-8 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                      : s.id < storyScene
                      ? "w-3 bg-emerald-400/70"
                      : "w-3 bg-slate-700 hover:bg-slate-500"
                  }`}
                />
              ))}
            </div>

            {storyScene < 4 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={storyScene === 0}
                  onClick={() => {
                    setAutoAdvance(false);
                    setStoryScene(Math.max(0, storyScene - 1));
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-35 hover:border-slate-500 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  onClick={() => {
                    setAutoAdvance(false);
                    setStoryScene(Math.min(4, storyScene + 1));
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition cursor-pointer"
                >
                  {storyScene === 3 ? "Initialize GridPulse" : "Next Scene"}
                  {storyScene === 3 ? <ArrowRight className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
