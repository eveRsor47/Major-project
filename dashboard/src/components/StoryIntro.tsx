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
    tag: "CHAPTER 01 / 04 · GRID VOLATILITY",
    title: "The Growing Energy Challenge",
    narration:
      "At Pavagada's 2,050 MW solar plateau, generation swings steeply across irradiance cycles, monsoon cloud fronts, and ambient heat—while millions of residential, industrial, hospital, and EV loads reshape Karnataka's demand every hour.",
    durationMs: 12000,
  },
  {
    id: 1,
    tag: "CHAPTER 02 / 04 · THE REACTIVE GAP",
    title: "When Grids React Too Late",
    narration:
      "Static heuristics and manual monitoring respond only after an imbalance hits the bus. Cloud transients drop solar megawatts abruptly ahead of steep evening ramps—degrading frequency stability, forcing curtailed clean energy, and triggering expensive backup plants.",
    durationMs: 13000,
  },
  {
    id: 2,
    tag: "CHAPTER 03 / 04 · ENGINEERED INTELLIGENCE",
    title: "Why We Built GridPulse",
    narration:
      "GridPulse unifies five Optuna-tuned deep sequence architectures, Stacking Ridge meta-learning, Quantile LightGBM risk envelopes, and M9 physical safety locks—forecasting Solar, State Demand, and the Net Load Duck Curve across 1-hour and 24-hour markets.",
    durationMs: 13500,
  },
  {
    id: 3,
    tag: "CHAPTER 04 / 04 · VERIFIED OUTCOMES",
    title: "What We Solved",
    narration:
      "Validated strictly out-of-sample across 148 quarantined 2026 evaluations with 97 automated checks passed: solar ramp surprises are flagged early, night zeroing and ramp bounds hold mathematically, and net dispatch stabilizes cleanly.",
    durationMs: 14000,
  },
  {
    id: 4,
    tag: "INITIALIZATION · GRIDPULSE CORE",
    title: "This is GridPulse.",
    narration: "",
    durationMs: 5000,
  },
];

const ARCHITECTURE_LAYERS = [
  {
    stage: "01 · INPUT TENSOR",
    name: "Weather & Chronology",
    detail: "GHI · ClearSky · Solar Zenith · Ambient Temp · Wind · Cyclical Lags",
    accent: "border-[#E5A93C]/40 text-[#F3C669]",
    badge: "bg-[#E5A93C]/15 border-[#E5A93C]/35 text-[#F3C669]",
  },
  {
    stage: "02 · 5-DL COUNCIL",
    name: "Optuna Neural Ensemble",
    detail: "BiLSTM · GRU · CNN-LSTM · DLinear · LSTM tuned with 20 Huber Studies",
    accent: "border-[#5CB8E4]/40 text-[#8ED8F8]",
    badge: "bg-[#5CB8E4]/15 border-[#5CB8E4]/35 text-[#8ED8F8]",
  },
  {
    stage: "03 · META & RISK",
    name: "Stacking Ridge & Quantiles",
    detail: "Zero-Leakage Ridge · NNLS Convex Solver · P10 / P50 / P90 Intervals",
    accent: "border-white/25 text-white",
    badge: "bg-white/10 border-white/25 text-white",
  },
  {
    stage: "04 · M9 PHYSICS GATE",
    name: "Physical Grid Safety",
    detail: "Zenith ≥ 90° Clamp · ≤ 1,000 MW/h Ramp Cap · Duck Curve Net Balance",
    accent: "border-[#34D399]/40 text-[#6EE7B7]",
    badge: "bg-[#34D399]/15 border-[#34D399]/35 text-[#6EE7B7]",
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

  // Keyboard navigation for natural reading control
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (storyScene >= 4) return;
      if (e.key === "ArrowRight") {
        setAutoAdvance(false);
        setStoryScene(Math.min(4, storyScene + 1));
      } else if (e.key === "ArrowLeft" && storyScene > 0) {
        setAutoAdvance(false);
        setStoryScene(storyScene - 1);
      } else if (e.key.toLowerCase() === "p" || e.key === " ") {
        e.preventDefault();
        setAutoAdvance((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [storyScene, setStoryScene]);

  // Unhurried chapter auto-advance timer
  useEffect(() => {
    if (!autoAdvance || storyScene >= 4) return;
    const duration = SCENES[storyScene]?.durationMs ?? 12000;
    const t = setTimeout(() => {
      setStoryScene(storyScene + 1);
    }, duration);
    return () => clearTimeout(t);
  }, [autoAdvance, storyScene, setStoryScene]);

  // Scene 5 d <-> p reveal timing
  useEffect(() => {
    if (storyScene !== 4) {
      setRevealBeatDone(false);
      return;
    }
    sfx.playRevealChord();
    setRevealBeatDone(false);
    setWhisperIdx(0);
    const wTimer = setInterval(() => {
      setWhisperIdx((i) => Math.min(WHISPERS.length - 1, i + 1));
    }, 1100);
    const beatTimer = setTimeout(() => setRevealBeatDone(true), 4500);
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
            "radial-gradient(ellipse at center, transparent 38%, rgba(7, 8, 11, 0.84) 100%)",
        }}
      />

      {/* TOP BAR */}
      <header className="relative z-10 w-full max-w-[1640px] mx-auto flex items-center justify-between px-6 sm:px-10 tall:px-12 pt-3.5 tall:pt-6 pb-1.5 tall:pb-3 shrink-0">
        <div className="flex items-center gap-3.5 tall:gap-4">
          <GridPulseLogo mode="mark" />
          <div className="text-xs tall:text-sm font-mono-num tracking-[0.2em] uppercase text-slate-300">
            {scene.tag}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {storyScene < 4 && (
            <button
              onClick={() => setAutoAdvance((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 tall:px-4 tall:py-2 text-xs tall:text-sm text-slate-200 hover:border-white/30 hover:text-white transition cursor-pointer backdrop-blur-md"
              title="Toggle Autoplay (Space or P)"
            >
              {autoAdvance ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{autoAdvance ? "Pause Story" : "Resume Auto"}</span>
            </button>
          )}
          <button
            onClick={handleSkipIntro}
            className="inline-flex items-center gap-2 rounded-full border border-[#5CB8E4]/40 bg-[#5CB8E4]/12 px-3.5 py-1.5 tall:px-4 tall:py-2 text-xs tall:text-sm font-medium text-[#8ED8F8] hover:bg-[#5CB8E4]/22 hover:border-[#5CB8E4]/65 transition cursor-pointer backdrop-blur-md"
          >
            <span>{skipping ? "Loading Control Room..." : "Skip Intro"}</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* CENTER LIFE-SIZE CINEMA STAGE (Fluid Height-Safe Across 768p Laptops & 1080p/1200p Monitors) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-10 tall:px-12 py-1 tall:py-2 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* SCENE 1: KINETIC DIURNAL WAVE OSCILLOSCOPE + SCALE STATS */}
          {storyScene === 0 && (
            <motion.div
              key="sc-0"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[1640px] grid grid-cols-1 lg:grid-cols-12 gap-4 tall:gap-7 items-stretch"
            >
              <div className="lg:col-span-8 cad-panel rounded-2xl tall:rounded-3xl p-4 sm:p-5 tall:p-9 flex flex-col justify-between overflow-hidden relative">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs tall:text-sm font-mono-num text-slate-400">
                  <span className="flex items-center gap-2 text-[#F3C669] font-semibold">
                    <Sun className="w-4 h-4 tall:w-5 tall:h-5" /> DIURNAL GENERATION vs STATE LOAD WAVEFORM
                  </span>
                  <span className="text-slate-300">24-HOUR PHYSICAL PROFILE · PAVAGADA ↔ KSLDC</span>
                </div>

                {/* Height-Adaptive Animated Oscilloscope Dual Spline */}
                <div className="my-2 tall:my-5 relative">
                  <svg
                    viewBox="0 0 760 250"
                    className="w-full h-[clamp(170px,calc(43vh-110px),420px)] overflow-visible"
                  >
                    <defs>
                      <linearGradient id="sc1-solar-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E5A93C" stopOpacity="0.34" />
                        <stop offset="100%" stopColor="#E5A93C" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="sc1-demand-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5CB8E4" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#5CB8E4" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="sc1-demand-stroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#5CB8E4" />
                        <stop offset="100%" stopColor="#A5D8F3" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines & Hour Axis Ticks */}
                    {[55, 110, 165, 220].map((y) => (
                      <line key={y} x1="16" y1={y} x2="744" y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 6" />
                    ))}
                    {[
                      { x: 24, t: "00:00" },
                      { x: 204, t: "06:00" },
                      { x: 380, t: "12:00" },
                      { x: 556, t: "18:00" },
                      { x: 732, t: "24:00" },
                    ].map((tick) => (
                      <text key={tick.t} x={tick.x} y="243" textAnchor="middle" fill="#94A3B8" fontSize="12.5" fontFamily="JetBrains Mono">
                        {tick.t}
                      </text>
                    ))}

                    {/* Demand Soft Area + Curve */}
                    <motion.path
                      d="M 24 136 C 110 158, 185 96, 275 90 C 365 84, 435 112, 515 80 C 595 48, 665 36, 736 100 L 736 220 L 24 220 Z"
                      fill="url(#sc1-demand-fill)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.3, delay: 0.35 }}
                    />
                    <motion.path
                      d="M 24 136 C 110 158, 185 96, 275 90 C 365 84, 435 112, 515 80 C 595 48, 665 36, 736 100"
                      fill="none"
                      stroke="url(#sc1-demand-stroke)"
                      strokeWidth="3.6"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* Solar Bell Curve Fill & Animated Path Draw */}
                    <motion.path
                      d="M 24 218 L 175 218 C 235 218, 280 48, 380 48 C 480 48, 525 218, 585 218 L 736 218 Z"
                      fill="url(#sc1-solar-fill)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.4, delay: 0.25 }}
                    />
                    <motion.path
                      d="M 24 218 L 175 218 C 235 218, 280 48, 380 48 C 480 48, 525 218, 585 218 L 736 218"
                      fill="none"
                      stroke="#E5A93C"
                      strokeWidth="3.8"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* Pulsing Highlight Anchors */}
                    <motion.circle
                      cx="380"
                      cy="48"
                      r="5.5"
                      fill="#F3C669"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2.2, repeat: Infinity }}
                    />
                    <motion.circle
                      cx="645"
                      cy="48"
                      r="5.5"
                      fill="#8ED8F8"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2.2, delay: 0.8, repeat: Infinity }}
                    />

                    {/* Slow, Smooth Travelling Scan Playhead across the 24h day */}
                    <motion.g
                      animate={{ x: [0, 690, 0] }}
                      transition={{ duration: 9.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <line x1="34" y1="20" x2="34" y2="220" stroke="rgba(255,255,255,0.34)" strokeWidth="1.2" strokeDasharray="3 4" />
                      <circle cx="34" cy="20" r="3.5" fill="#EDF2F7" />
                    </motion.g>

                    {/* Labels */}
                    <text x="380" y="29" textAnchor="middle" fill="#F3C669" fontSize="13.5" fontWeight="600" fontFamily="JetBrains Mono">
                      MIDDAY PV CREST (2,050 MW)
                    </text>
                    <text x="645" y="25" textAnchor="middle" fill="#8ED8F8" fontSize="13.5" fontWeight="600" fontFamily="JetBrains Mono">
                      EVENING DEMAND RAMP
                    </text>
                  </svg>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs tall:text-base font-mono-num text-slate-300 pt-2.5 tall:pt-4 border-t border-white/10">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5A93C]" /> Pavagada PV Generation (Solar Plateau)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5CB8E4]" /> Karnataka Grid Load (Homes · Hospitals · Industry · EV)
                  </span>
                </div>
              </div>

              {/* Right Metric Column - Large Commanding Figures */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-2.5 tall:gap-5">
                {[
                  {
                    label: "INSTALLED SOLAR CAPACITY",
                    val: "2,050 MW",
                    sub: "13,000 acres across 8 sectors in Tumkur",
                    tint: "text-[#F3C669]",
                    border: "border-l-[#E5A93C]",
                  },
                  {
                    label: "AVERAGE STATE LOAD",
                    val: "13,481 MW",
                    sub: "Continuous industrial, hospital & EV demand flux",
                    tint: "text-[#8ED8F8]",
                    border: "border-l-[#5CB8E4]",
                  },
                  {
                    label: "EXOGENOUS DRIVERS",
                    val: "GHI · Cloud · Wind",
                    sub: "Uncontrollable monsoon & thermal volatility",
                    tint: "text-white",
                    border: "border-l-white/60",
                  },
                ].map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.12, duration: 0.45 }}
                    className={`cad-panel rounded-2xl px-5 py-3.5 tall:p-7 border-l-4 ${m.border} flex-1 flex flex-col justify-center`}
                  >
                    <div className="text-[11px] tall:text-xs font-mono-num tracking-[0.16em] text-slate-400">
                      {m.label}
                    </div>
                    <div className={`mt-1 tall:mt-2 font-display text-2xl xl:text-3xl tall:text-[42px] font-bold leading-tight ${m.tint}`}>
                      {m.val}
                    </div>
                    <div className="text-xs tall:text-base text-slate-300 mt-1 tall:mt-2 leading-snug">{m.sub}</div>
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
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.55 }}
              className="w-full max-w-[1640px] grid grid-cols-1 lg:grid-cols-12 gap-4 tall:gap-7 items-stretch"
            >
              <div className="lg:col-span-7 cad-panel rounded-2xl tall:rounded-3xl p-4 sm:p-5 tall:p-9 border-[#F46060]/35 flex flex-col justify-between">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs tall:text-sm font-mono-num">
                  <span className="flex items-center gap-2 text-[#F46060] font-semibold">
                    <Waves className="w-4 h-4 tall:w-5 tall:h-5" /> CLOUD TRANSIENT &amp; FREQUENCY DEVIATION SCOPE
                  </span>
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.0, repeat: Infinity }}
                    className="rounded-full border border-[#F46060]/50 bg-[#F46060]/15 px-3 py-0.5 tall:px-4 tall:py-1 text-[#FCA5A5] font-bold"
                  >
                    49.71 Hz ↘ RAMP DEFICIT
                  </motion.span>
                </div>

                <svg viewBox="0 0 680 235" className="w-full h-[clamp(165px,calc(41vh-110px),400px)] my-2 tall:my-4 overflow-visible">
                  {[60, 120, 180].map((y) => (
                    <line key={y} x1="16" y1={y} x2="664" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" />
                  ))}

                  {/* Smooth nominal clear-sky curve vs sharp cloud notch */}
                  <path
                    d="M 24 195 C 140 190, 200 48, 330 48 C 460 48, 520 190, 640 195"
                    fill="none"
                    stroke="rgba(229,169,60,0.3)"
                    strokeWidth="2.6"
                    strokeDasharray="6 6"
                  />

                  {/* Fractured actual PV output */}
                  <motion.path
                    d="M 24 195 C 125 190, 190 50, 272 50 L 315 162 L 362 170 L 405 80 C 475 104, 535 190, 640 195"
                    fill="none"
                    stroke="#F46060"
                    strokeWidth="3.8"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.6, ease: "easeOut" }}
                  />

                  {/* Pulsing Energy Deficit Fill */}
                  <motion.polygon
                    points="272,50 315,162 362,170 405,80 330,48"
                    fill="rgba(244,96,96,0.22)"
                    animate={{ opacity: [0.25, 0.75, 0.25] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />

                  {/* Expanding Fault Shockwave Rings at Impact Knee */}
                  <motion.circle
                    cx="315"
                    cy="162"
                    r="12"
                    fill="none"
                    stroke="#F46060"
                    strokeWidth="1.6"
                    animate={{ scale: [0.7, 3.2], opacity: [0.85, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    style={{ transformOrigin: "315px 162px" }}
                  />
                  <circle cx="315" cy="162" r="5" fill="#FCA5A5" />

                  <line x1="315" y1="22" x2="315" y2="210" stroke="rgba(244,96,96,0.5)" strokeDasharray="3 4" />
                  <text x="315" y="15" textAnchor="middle" fill="#FCA5A5" fontSize="13" fontWeight="600" fontFamily="JetBrains Mono">
                    SUDDEN CLOUD TRANSIENT (-420 MW/h)
                  </text>
                  <text x="338" y="106" textAnchor="middle" fill="#FCA5A5" fontSize="11.5" fontFamily="JetBrains Mono">
                    DEFICIT
                  </text>
                </svg>

                <div className="grid grid-cols-3 gap-3 text-center font-mono-num text-xs tall:text-sm pt-2.5 tall:pt-4 border-t border-white/10">
                  <div>
                    <div className="text-[10px] tall:text-xs text-slate-400">RESERVE LATENCY</div>
                    <div className="font-bold text-[#FCA5A5] text-sm tall:text-lg">Reactive</div>
                  </div>
                  <div>
                    <div className="text-[10px] tall:text-xs text-slate-400">CLEAN CURTAILMENT</div>
                    <div className="font-bold text-[#F3C669] text-sm tall:text-lg">Unavoided</div>
                  </div>
                  <div>
                    <div className="text-[10px] tall:text-xs text-slate-400">FOSSIL BACKUP</div>
                    <div className="font-bold text-white text-sm tall:text-lg">Late Start · CO₂ ↑</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 gap-2.5 tall:gap-4 content-stretch">
                {[
                  {
                    title: "Blind to Sub-Hour Weather Shocks",
                    desc: "Naive persistence lags hours behind sudden monsoon cloud passage and irradiance cliffs.",
                  },
                  {
                    title: "Grid Frequency Instability",
                    desc: "Unpredicted net ramps stress thermal spinning reserves and threaten the 50 Hz band.",
                  },
                  {
                    title: "DSM Deviation Penalties",
                    desc: "Breaching KSLDC's ±10% scheduling corridor triggers steep regulatory settlement fees.",
                  },
                  {
                    title: "Clean Curtailment & Avoidable Emissions",
                    desc: "Solar spills midday while fossil backup generators start late to chase evening demand.",
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.07, duration: 0.35 }}
                    className="cad-panel rounded-2xl px-4 py-2.5 tall:px-7 tall:py-5 border-l-4 border-l-[#F46060]/75 flex flex-col justify-center"
                  >
                    <div className="font-display text-sm sm:text-base tall:text-xl font-bold text-white">{item.title}</div>
                    <div className="text-xs tall:text-[15px] text-slate-300 mt-0.5 tall:mt-1.5 leading-snug tall:leading-relaxed">{item.desc}</div>
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
              transition={{ duration: 0.45 }}
              className="w-full max-w-[1640px] cad-panel rounded-2xl tall:rounded-3xl p-5 sm:p-6 tall:p-11"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 tall:mb-9">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm tall:text-base font-mono-num text-[#8ED8F8] font-semibold">
                  <Cpu className="w-4 h-4 tall:w-5 tall:h-5" /> UNIFIED AI PIPELINE · ZERO-LEAKAGE CHRONOLOGICAL ARCHITECTURE
                </div>
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1 tall:px-5 tall:py-1.5 text-[11px] sm:text-xs tall:text-sm font-mono-num text-slate-200">
                  43,824 Hours · Train (2021–24) → Val (2025) → Test (2026)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 tall:gap-6 relative">
                {/* Animated Telemetry Conduit Line across the 4 stages */}
                <div className="hidden md:block absolute left-8 right-8 top-1/2 -translate-y-1/2 h-[2px] bg-white/[0.08] pointer-events-none overflow-hidden">
                  <motion.div
                    className="h-full w-40 bg-gradient-to-r from-transparent via-[#5CB8E4] to-transparent"
                    animate={{ x: ["-15%", "420%"] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                {ARCHITECTURE_LAYERS.map((layer, idx) => (
                  <motion.div
                    key={layer.stage}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + idx * 0.1, duration: 0.38 }}
                    className={`rounded-2xl border bg-[#0D1017]/95 p-4 sm:p-5 tall:p-8 ${layer.accent} relative z-10 flex flex-col justify-between min-h-[175px] tall:min-h-[320px] shadow-xl`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3 tall:mb-5">
                        <span className={`rounded-full border px-2.5 py-0.5 tall:px-3 tall:py-1 text-[10px] tall:text-xs font-mono-num ${layer.badge}`}>
                          {layer.stage}
                        </span>
                        <motion.span
                          animate={{ opacity: [0.35, 1, 0.35], scale: [1, 1.35, 1] }}
                          transition={{ duration: 1.6, delay: idx * 0.25, repeat: Infinity }}
                          className="w-2.5 h-2.5 tall:w-3 tall:h-3 rounded-full bg-current"
                        />
                      </div>
                      <h3 className="font-display text-lg sm:text-xl tall:text-[26px] font-bold text-white leading-snug">
                        {layer.name}
                      </h3>
                    </div>

                    <p className="mt-3 tall:mt-6 text-xs tall:text-[15px] font-mono-num text-slate-300 leading-relaxed pt-2.5 tall:pt-4 border-t border-white/[0.08]">
                      {layer.detail}
                    </p>
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
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45 }}
              className="w-full max-w-[1640px] grid grid-cols-1 lg:grid-cols-12 gap-4 tall:gap-7 items-stretch"
            >
              <div className="lg:col-span-5 grid grid-cols-2 gap-3 tall:gap-5">
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
                    transition={{ delay: 0.04 + idx * 0.06, duration: 0.32 }}
                    className="cad-panel rounded-2xl p-4 sm:p-5 tall:p-7 flex flex-col justify-center"
                  >
                    <div className="text-[11px] tall:text-xs font-mono-num tracking-wider text-slate-400">{k.label}</div>
                    <div className={`mt-1 tall:mt-2 font-display text-2xl sm:text-3xl tall:text-[44px] font-bold leading-tight ${k.color}`}>{k.val}</div>
                    <div className="text-xs tall:text-sm font-mono-num text-slate-400 mt-1 tall:mt-2">{k.sub}</div>
                  </motion.div>
                ))}

                <div className="col-span-2 cad-panel rounded-2xl px-4 py-3 tall:px-6 tall:py-5 flex items-center justify-between text-xs tall:text-base font-mono-num">
                  <span className="flex items-center gap-2 text-[#34D399] font-semibold">
                    <ShieldCheck className="w-4 h-4 tall:w-5 tall:h-5" /> HARMONIC GRID FREQUENCY
                  </span>
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 80 24" className="w-16 tall:w-24 h-5 tall:h-6 hidden sm:block">
                      <motion.path
                        d="M 2 12 Q 12 4, 22 12 T 42 12 T 62 12 T 78 12"
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="2.2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2 }}
                      />
                    </svg>
                    <span className="font-bold text-white text-xs sm:text-sm tall:text-lg">50.00 Hz LOCKED</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 tall:gap-4 content-stretch">
                {OUTCOME_PILLS.map((text, idx) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.05, duration: 0.3 }}
                    className="cad-panel rounded-2xl px-4 py-2.5 tall:px-6 tall:py-5 flex items-center gap-3 tall:gap-4"
                  >
                    <span className="w-5 h-5 tall:w-7 tall:h-7 rounded-full bg-[#34D399]/15 border border-[#34D399]/45 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 tall:w-4 tall:h-4 text-[#34D399]" />
                    </span>
                    <span className="text-xs sm:text-sm tall:text-[17px] text-slate-100 leading-snug font-medium">{text}</span>
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
              transition={{ duration: 0.85 }}
              className="flex flex-col items-center justify-center text-center py-4 mb-4 tall:mb-8"
            >
              <GridPulseLogo mode="reveal" />

              <motion.div
                key={whisperIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-6 tall:mt-9 text-xs sm:text-sm tall:text-base font-mono-num tracking-[0.26em] text-slate-300/95"
              >
                {WHISPERS[whisperIdx]}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM EDITORIAL NARRATION & NAVIGATION (ALIGNED TO STAGE RAIL) */}
      <footer className="relative z-10 w-full max-w-[1640px] mx-auto px-6 sm:px-10 tall:px-12 pb-3.5 tall:pb-6 pt-1 tall:pt-2 shrink-0">
        {storyScene < 4 && (
          <motion.div
            key={`narr-${storyScene}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="cad-panel rounded-2xl px-5 py-3 tall:px-9 tall:py-6 mb-2.5 tall:mb-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1 tall:mb-2">
              <div className="flex items-center gap-2 tall:gap-3">
                <Activity className="w-4 h-4 tall:w-5 tall:h-5 text-[#5CB8E4]" />
                <h2 className="font-display text-lg sm:text-xl tall:text-3xl font-bold text-white">
                  {scene.title}
                </h2>
              </div>
              <span
                className={`text-[10px] tall:text-xs font-mono-num tracking-wider px-2.5 py-0.5 rounded-full border ${
                  autoAdvance
                    ? "border-[#5CB8E4]/30 bg-[#5CB8E4]/10 text-[#8ED8F8]"
                    : "border-[#E5A93C]/40 bg-[#E5A93C]/12 text-[#F3C669]"
                }`}
              >
                {autoAdvance
                  ? `AUTO · ${Math.round(scene.durationMs / 1000)}S`
                  : "PAUSED · PRESS SPACE TO RESUME"}
              </span>
            </div>
            <p className="text-xs sm:text-sm tall:text-xl leading-snug tall:leading-relaxed text-slate-200 max-w-6xl">
              {scene.narration}
            </p>
          </motion.div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {SCENES.map((s) => {
                const isCurrent = s.id === storyScene;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setAutoAdvance(false);
                      setStoryScene(s.id);
                    }}
                    aria-label={`Jump to Scene ${s.id + 1}`}
                    className={`relative h-2 tall:h-2.5 rounded-full transition-all duration-300 overflow-hidden cursor-pointer ${
                      isCurrent
                        ? "w-14 tall:w-20 bg-white/20"
                        : s.id < storyScene
                        ? "w-4 bg-[#34D399]/75"
                        : "w-4 bg-white/15 hover:bg-white/35"
                    }`}
                  >
                    {isCurrent && autoAdvance && storyScene < 4 ? (
                      <motion.span
                        key={`prog-${storyScene}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: scene.durationMs / 1000, ease: "linear" }}
                        style={{ transformOrigin: "left center" }}
                        className="absolute inset-0 bg-[#EDF2F7] rounded-full"
                      />
                    ) : isCurrent ? (
                      <span className="absolute inset-0 bg-[#EDF2F7] rounded-full" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            {storyScene < 4 && (
              <span className="hidden sm:inline text-[11px] font-mono-num text-slate-500 ml-2">
                Space: Pause/Play · ← → Step
              </span>
            )}
          </div>

          {storyScene < 4 && (
            <div className="flex items-center gap-2.5">
              <button
                disabled={storyScene === 0}
                onClick={() => {
                  setAutoAdvance(false);
                  setStoryScene(Math.max(0, storyScene - 1));
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 tall:px-4 tall:py-2 text-xs tall:text-sm text-slate-200 disabled:opacity-30 hover:border-white/35 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => {
                  setAutoAdvance(false);
                  setStoryScene(Math.min(4, storyScene + 1));
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#EDF2F7] px-4 py-1.5 tall:px-5 tall:py-2 text-xs tall:text-sm font-semibold text-[#07080B] hover:bg-white transition cursor-pointer shadow-lg"
              >
                {storyScene === 3 ? "Initialize GridPulse" : "Next Scene"}
                {storyScene === 3 ? <ArrowRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
