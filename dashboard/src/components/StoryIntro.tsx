import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Pause,
  Play,
  ShieldCheck,
  SkipForward,
  Sun,
  Waves,
} from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { GridPulseLogo } from "./GridPulseLogo";
import { StoryCanvas } from "./StoryCanvas";
import { sfx } from "../utils/sfx";

const SCENES = [
  {
    id: 0,
    tag: "CHAPTER 01 · GRID VOLATILITY",
    title: "The Growing Energy Challenge",
    narration:
      "At Pavagada's 2,050 MW solar plateau, generation swings steeply across irradiance cycles, monsoon cloud fronts, and ambient heat—while millions of residential, industrial, hospital, and EV loads reshape state demand every hour.",
  },
  {
    id: 1,
    tag: "CHAPTER 02 · THE REACTIVE GAP",
    title: "When Grids React Too Late",
    narration:
      "Static heuristics and manual monitoring respond only after an imbalance hits the bus. Cloud transients drop solar megawatts abruptly ahead of steep evening ramps—degrading frequency stability, forcing curtailed clean energy, and triggering expensive backup plants.",
  },
  {
    id: 2,
    tag: "CHAPTER 03 · ENGINEERED INTELLIGENCE",
    title: "Why We Built GridPulse",
    narration:
      "GridPulse unifies five Optuna-tuned deep sequence architectures, Stacking Ridge meta-learning, Quantile LightGBM risk envelopes, and M9 physical safety locks—forecasting Solar, State Demand, and the Net Load Duck Curve across 1-hour and 24-hour markets.",
  },
  {
    id: 3,
    tag: "CHAPTER 04 · VERIFIED OUTCOMES",
    title: "What We Solved",
    narration:
      "Validated strictly out-of-sample across 148 quarantined 2026 evaluations with 97 automated checks passed: solar ramp surprises are flagged early, night zeroing and ramp bounds hold mathematically, and net dispatch stabilizes cleanly.",
  },
  {
    id: 4,
    tag: "CHAPTER 05 · INITIALIZATION",
    title: "This is GridPulse.",
    narration: "",
  },
];

const ARCHITECTURE_LAYERS = [
  {
    stage: "01 · INPUT TENSOR",
    name: "Weather & Chronology",
    detail: "GHI · ClearSky · Zenith · Temp · Wind · Lags",
    accent: "border-[#E5A93C]/35 text-[#F3C669]",
  },
  {
    stage: "02 · 5-DL COUNCIL",
    name: "Optuna Neural Ensemble",
    detail: "BiLSTM · GRU · CNN-LSTM · DLinear · LSTM",
    accent: "border-[#5CB8E4]/35 text-[#8ED8F8]",
  },
  {
    stage: "03 · META & RISK",
    name: "Stacking Ridge & Quantiles",
    detail: "Zero-Leakage Ridge · NNLS · P10 / P50 / P90",
    accent: "border-white/25 text-white",
  },
  {
    stage: "04 · M9 PHYSICS GATE",
    name: "Physical Grid Safety",
    detail: "Zenith ≥ 90° Clamp · ≤ 1,000 MW/h Ramp · Duck Net",
    accent: "border-[#34D399]/35 text-[#6EE7B7]",
  },
];

const OUTCOME_PILLS = [
  "Accurate 1h & 24h Demand Load (0.96% D1 MAPE)",
  "Solar Peak & Twilight Curve Tracking (24.95 MW S1)",
  "Weather Transient & Thermal Volatility Modeling",
  "Conservation of Energy Duck Curve Estimation",
  "Reduced Renewable Curtailment Exposure",
  "Early Quantile P10–P90 Ramp Alerting",
  "Guaranteed Night-Zero & Capacity Physics Locks",
  "Real-Time Operator & DSM Decision Support",
];

const WHISPERS = [
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

  useEffect(() => {
    void loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    if (!autoAdvance || storyScene >= 4) return;
    const duration = storyScene === 2 || storyScene === 3 ? 6600 : 5800;
    const t = setTimeout(() => {
      setStoryScene(storyScene + 1);
    }, duration);
    return () => clearTimeout(t);
  }, [autoAdvance, storyScene, setStoryScene]);

  useEffect(() => {
    if (storyScene !== 4) {
      setRevealBeatDone(false);
      return;
    }
    sfx.playRevealChord();
    setRevealBeatDone(false);
    const wTimer = setInterval(() => {
      setWhisperIdx((i) => Math.min(WHISPERS.length - 1, i + 1));
    }, 800);
    const beatTimer = setTimeout(() => setRevealBeatDone(true), 3300);
    return () => {
      clearInterval(wTimer);
      clearTimeout(beatTimer);
    };
  }, [storyScene]);

  useEffect(() => {
    if (storyScene === 4 && revealBeatDone && coreLoaded) {
      setPhase("app");
    }
  }, [storyScene, revealBeatDone, coreLoaded, setPhase]);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#07080B] overflow-hidden select-none">
      {/* 60fps 3D Terrain & Particle Vortex Engine */}
      <StoryCanvas scene={storyScene} />

      {/* Atmospheric Radial Vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(7, 8, 11, 0.86) 100%)",
        }}
      />

      {/* TOP BAR */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-5 pb-2">
        <div className="flex items-center gap-3.5">
          <GridPulseLogo mode="mark" />
          <div className="text-[11px] font-mono-num tracking-[0.2em] uppercase text-slate-400">
            {scene.tag}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {storyScene < 4 && (
            <button
              onClick={() => setAutoAdvance((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:border-white/25 hover:text-white transition cursor-pointer backdrop-blur-md"
            >
              {autoAdvance ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="hidden sm:inline">{autoAdvance ? "Autoplay" : "Paused"}</span>
            </button>
          )}
          <button
            onClick={handleSkipIntro}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#5CB8E4]/35 bg-[#5CB8E4]/10 px-3.5 py-1.5 text-xs font-medium text-[#8ED8F8] hover:bg-[#5CB8E4]/20 hover:border-[#5CB8E4]/60 transition cursor-pointer backdrop-blur-md"
          >
            <span>{skipping ? "Loading Control Room..." : "Skip Intro"}</span>
            <SkipForward className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* CENTER KINETIC CINEMA STAGE */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 sm:px-12 py-2">
        <AnimatePresence mode="wait">
          {/* SCENE 1: KINETIC DIURNAL WAVE OSCILLOSCOPE + SCALE STATS */}
          {storyScene === 0 && (
            <motion.div
              key="sc-0"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
            >
              <div className="lg:col-span-8 cad-panel rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden relative">
                <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400">
                  <span className="flex items-center gap-2 text-[#F3C669]">
                    <Sun className="w-3.5 h-3.5" /> DIURNAL GENERATION vs STATE LOAD WAVEFORM
                  </span>
                  <span>24-HOUR PHYSICAL PROFILE</span>
                </div>

                {/* High-Craft Animated Oscilloscope Dual Spline */}
                <div className="my-4 relative">
                  <svg viewBox="0 0 680 210" className="w-full h-44 sm:h-52 overflow-visible">
                    <defs>
                      <linearGradient id="sc1-solar-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E5A93C" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#E5A93C" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="sc1-demand-stroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#5CB8E4" />
                        <stop offset="100%" stopColor="#A5D8F3" />
                      </linearGradient>
                    </defs>

                    {/* Baseline Axes */}
                    {[50, 100, 150].map((y) => (
                      <line key={y} x1="12" y1={y} x2="668" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
                    ))}

                    {/* Solar Bell Curve Fill & Animated Path Draw */}
                    <motion.path
                      d="M 20 185 L 155 185 C 210 185, 250 42, 340 42 C 430 42, 470 185, 525 185 L 660 185 Z"
                      fill="url(#sc1-solar-fill)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.1, delay: 0.25 }}
                    />
                    <motion.path
                      d="M 20 185 L 155 185 C 210 185, 250 42, 340 42 C 430 42, 470 185, 525 185 L 660 185"
                      fill="none"
                      stroke="#E5A93C"
                      strokeWidth="2.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* Karnataka Grid Demand Double-Peak Curve */}
                    <motion.path
                      d="M 20 118 C 95 135, 165 82, 245 78 C 325 74, 390 95, 460 72 C 530 48, 595 36, 660 88"
                      fill="none"
                      stroke="url(#sc1-demand-stroke)"
                      strokeWidth="2.6"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* Travelling Scan Playhead across the day */}
                    <motion.g
                      animate={{ x: [0, 620, 0] }}
                      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <line x1="30" y1="22" x2="30" y2="188" stroke="rgba(255,255,255,0.28)" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx="30" cy="22" r="3" fill="#EDF2F7" />
                    </motion.g>

                    {/* Labels */}
                    <text x="340" y="30" textAnchor="middle" fill="#F3C669" fontSize="10.5" fontFamily="JetBrains Mono">
                      MIDDAY PV CREST (2,050 MW)
                    </text>
                    <text x="585" y="28" textAnchor="middle" fill="#8ED8F8" fontSize="10.5" fontFamily="JetBrains Mono">
                      EVENING DEMAND RAMP
                    </text>
                  </svg>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num text-slate-400 pt-2 border-t border-white/8">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E5A93C]" /> Pavagada PV Generation
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#5CB8E4]" /> Karnataka Grid Load (Homes · Hospitals · Industry · EV)
                  </span>
                </div>
              </div>

              {/* Right Metric Column */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-3">
                {[
                  { label: "INSTALLED CAPACITY", val: "2,050 MW", sub: "13,000 acres · 8 sectors in Tumkur", tint: "text-[#F3C669]" },
                  { label: "AVERAGE STATE LOAD", val: "13,481 MW", sub: "Continuous industrial & EV flux", tint: "text-[#8ED8F8]" },
                  { label: "WEATHER EXOGENOUS DRIVERS", val: "GHI · Cloud · Wind", sub: "Uncontrollable atmospheric volatility", tint: "text-slate-100" },
                ].map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.14, duration: 0.5 }}
                    className="cad-panel rounded-2xl p-4"
                  >
                    <div className="text-[10px] font-mono-num tracking-[0.16em] text-slate-400">
                      {m.label}
                    </div>
                    <div className={`mt-1 font-display text-2xl font-bold ${m.tint}`}>{m.val}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.sub}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 2: GRID INSTABILITY & CLOUD NOTCH OSCILLOSCOPE */}
          {storyScene === 1 && (
            <motion.div
              key="sc-1"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55 }}
              className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
            >
              <div className="lg:col-span-7 cad-panel rounded-2xl p-5 sm:p-6 border-[#F46060]/30 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-mono-num">
                  <span className="flex items-center gap-2 text-[#F46060]">
                    <Waves className="w-3.5 h-3.5" /> CLOUD TRANSIENT &amp; FREQUENCY DEVIATION SCOPE
                  </span>
                  <motion.span
                    animate={{ opacity: [1, 0.45, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    className="rounded-full border border-[#F46060]/45 bg-[#F46060]/15 px-2.5 py-0.5 text-[#FCA5A5] font-bold"
                  >
                    49.71 Hz · RAMP DEFICIT
                  </motion.span>
                </div>

                <svg viewBox="0 0 600 200" className="w-full h-44 sm:h-48 my-3 overflow-visible">
                  {/* Smooth nominal dashed curve vs sudden drop */}
                  <path
                    d="M 20 165 C 120 160, 175 42, 285 42 C 395 42, 450 160, 560 165"
                    fill="none"
                    stroke="rgba(229,169,60,0.22)"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  />
                  {/* Real fractured generation with sharp cloud drop notch */}
                  <motion.path
                    d="M 20 165 C 110 160, 165 44, 240 44 L 278 134 L 316 142 L 352 68 C 415 88, 465 160, 560 165"
                    fill="none"
                    stroke="#F46060"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.35, ease: "easeOut" }}
                  />
                  {/* Deficit highlight area */}
                  <motion.polygon
                    points="240,44 278,134 316,142 352,68 295,42"
                    fill="rgba(244,96,96,0.18)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.2, 0.65, 0.2] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                  <line x1="278" y1="20" x2="278" y2="178" stroke="rgba(244,96,96,0.45)" strokeDasharray="3 4" />
                  <text x="278" y="16" textAnchor="middle" fill="#FCA5A5" fontSize="10" fontFamily="JetBrains Mono">
                    SUDDEN IRRADIANCE DROP (-420 MW/h)
                  </text>
                </svg>

                <div className="grid grid-cols-3 gap-2.5 text-center font-mono-num text-xs pt-2 border-t border-white/8">
                  <div>
                    <div className="text-[10px] text-slate-400">RESERVE LATENCY</div>
                    <div className="font-bold text-[#FCA5A5]">Reactive</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">CLEAN CURTAILMENT</div>
                    <div className="font-bold text-[#F3C669]">Unavoided</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">FOSSIL BACKUP</div>
                    <div className="font-bold text-slate-200">Late Start · CO₂ ↑</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 gap-2.5 content-center">
                {[
                  { title: "Blind to Sub-Hour Shocks", desc: "Persistence lags behind abrupt irradiance changes." },
                  { title: "Grid Frequency Deviation", desc: "Unpredicted net ramps stress spinning thermal reserves." },
                  { title: "DSM Deviation Penalties", desc: "Breaching the ±10% scheduling corridor incurs regulatory fees." },
                  { title: "Curtailment & Emissions", desc: "Clean PV spills midday while coal/gas turbines spin late." },
                ].map((item, idx) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.07, duration: 0.32 }}
                    className="cad-panel rounded-xl px-4 py-3 border-l-2 border-l-[#F46060]/70"
                  >
                    <div className="font-display text-sm font-semibold text-white">{item.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 3: SELF-WIRING NEURAL ARCHITECTURE */}
          {storyScene === 2 && (
            <motion.div
              key="sc-2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-5xl cad-panel rounded-2xl p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-2 text-xs font-mono-num text-[#8ED8F8]">
                  <Cpu className="w-4 h-4" /> UNIFIED AI PIPELINE · ZERO-LEAKAGE CHRONOLOGICAL ARCHITECTURE
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-mono-num text-slate-300">
                  43,824 Hours · Train (2021–24) → Val (2025) → Test (2026)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 relative">
                {ARCHITECTURE_LAYERS.map((layer, idx) => (
                  <motion.div
                    key={layer.stage}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + idx * 0.09, duration: 0.35 }}
                    className={`rounded-xl border bg-white/[0.025] p-4 ${layer.accent} relative`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400 mb-2">
                      <span>{layer.stage}</span>
                      <motion.span
                        animate={{ opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 1.4, delay: idx * 0.2, repeat: Infinity }}
                        className="w-1.5 h-1.5 rounded-full bg-current"
                      />
                    </div>
                    <div className="font-display text-base font-bold text-white leading-snug">
                      {layer.name}
                    </div>
                    <div className="mt-2 text-[11px] font-mono-num text-slate-300/85 leading-relaxed">
                      {layer.detail}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 4: HARMONIC CONVERGENCE & VERIFIED RESULTS */}
          {storyScene === 3 && (
            <motion.div
              key="sc-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
            >
              <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                {[
                  { label: "S1 SOLAR SKILL", val: "+88.8%", sub: "24.95 MW RMSE", color: "text-[#F3C669]" },
                  { label: "D1 DEMAND MAPE", val: "0.96%", sub: "160.28 MW RMSE", color: "text-[#8ED8F8]" },
                  { label: "NET DUCK CURVE R²", val: "0.9903", sub: "161.35 MW Net RMSE", color: "text-[#34D399]" },
                  { label: "P10–P90 COVERAGE", val: "86.5%", sub: "S1 Unblinded Test", color: "text-white" },
                ].map((k, idx) => (
                  <motion.div
                    key={k.label}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.04 + idx * 0.06, duration: 0.3 }}
                    className="cad-panel rounded-2xl p-4"
                  >
                    <div className="text-[10px] font-mono-num text-slate-400">{k.label}</div>
                    <div className={`mt-1.5 font-display text-2xl font-bold ${k.color}`}>{k.val}</div>
                    <div className="text-[11px] font-mono-num text-slate-400 mt-0.5">{k.sub}</div>
                  </motion.div>
                ))}

                <div className="col-span-2 cad-panel rounded-2xl px-4 py-3 flex items-center justify-between text-xs font-mono-num">
                  <span className="flex items-center gap-2 text-[#34D399]">
                    <ShieldCheck className="w-4 h-4" /> HARMONIC GRID FREQUENCY
                  </span>
                  <span className="font-bold text-white">50.00 Hz LOCKED</span>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {OUTCOME_PILLS.map((text, idx) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.05, duration: 0.3 }}
                    className="cad-panel rounded-xl px-3.5 py-2.5 flex items-center gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#34D399]/15 border border-[#34D399]/40 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#34D399]" />
                    </span>
                    <span className="text-xs text-slate-200 leading-snug">{text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCENE 5: CONVERGING d <-> p YIN-YANG REVEAL & SILENT LOADER */}
          {storyScene === 4 && (
            <motion.div
              key="sc-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center text-center py-6"
            >
              <GridPulseLogo mode="reveal" />

              <motion.div
                key={whisperIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="mt-8 text-xs sm:text-sm font-mono-num tracking-[0.22em] text-slate-300/85"
              >
                {WHISPERS[whisperIdx]}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM EDITORIAL NARRATION & NAVIGATION */}
      <footer className="relative z-10 px-6 sm:px-10 pb-6 pt-2">
        <div className="mx-auto max-w-4xl">
          {storyScene < 4 && (
            <motion.div
              key={`narr-${storyScene}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="cad-panel rounded-2xl px-6 py-4 mb-3.5"
            >
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-[#5CB8E4]" />
                <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                  {scene.title}
                </h2>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                {scene.narration}
              </p>
            </motion.div>
          )}

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
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    s.id === storyScene
                      ? "w-9 bg-[#EDF2F7]"
                      : s.id < storyScene
                      ? "w-3 bg-[#34D399]/75"
                      : "w-3 bg-white/15 hover:bg-white/35"
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
                  className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.03] px-3.5 py-1.5 text-xs text-slate-300 disabled:opacity-30 hover:border-white/30 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  onClick={() => {
                    setAutoAdvance(false);
                    setStoryScene(Math.min(4, storyScene + 1));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF2F7] px-4 py-1.5 text-xs font-semibold text-[#07080B] hover:bg-white transition cursor-pointer shadow-lg"
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
