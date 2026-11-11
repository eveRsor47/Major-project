import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MousePointerClick, Sparkles, X } from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { ROOM_META, TOUR_BY_ROOM } from "../utils/metrics";

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function SpotlightTour() {
  const { tourActive, tourStepIndex, activeRoom, nextTourStep, prevTourStep, skipTour } = useGridStore();
  const [rect, setRect] = useState<RectBox | null>(null);
  const [winSize, setWinSize] = useState({ w: 1366, h: 768 });

  const steps = TOUR_BY_ROOM[activeRoom] ?? [];
  const step = steps[tourStepIndex];
  const roomInfo = ROOM_META.find((r) => r.id === activeRoom);

  useEffect(() => {
    if (!tourActive || !step) {
      setRect(null);
      return;
    }

    const measure = () => {
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
      const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }

    const initialT = setTimeout(measure, 180);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    const ro = new ResizeObserver(measure);
    if (el) ro.observe(el);

    return () => {
      clearTimeout(initialT);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      ro.disconnect();
    };
  }, [tourActive, step, activeRoom, tourStepIndex]);

  if (!tourActive || !step) return null;

  const pad = 8;
  const spot = rect
    ? {
        x: Math.max(4, rect.left - pad),
        y: Math.max(4, rect.top - pad),
        w: rect.width + pad * 2,
        h: rect.height + pad * 2,
      }
    : null;

  // Smart tooltip coordinates clamped strictly inside viewport
  const cardW = Math.min(360, winSize.w - 32);
  let cardLeft = winSize.w / 2 - cardW / 2;
  let cardTop = winSize.h / 2 - 110;

  if (spot) {
    cardLeft = Math.max(16, Math.min(winSize.w - cardW - 16, spot.x + spot.w / 2 - cardW / 2));

    const spaceBelow = winSize.h - (spot.y + spot.h);
    const spaceAbove = spot.y;

    if (step.placement === "top" || (spaceBelow < 230 && spaceAbove > 210)) {
      cardTop = Math.max(16, spot.y - 205);
    } else {
      cardTop = Math.min(winSize.h - 210, spot.y + spot.h + 16);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="spotlight-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] pointer-events-auto"
      >
        {/* Dark SVG backdrop with live punctured mask around highlighted control */}
        <svg className="fixed inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="gp-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spot && (
                <rect
                  x={spot.x}
                  y={spot.y}
                  width={spot.w}
                  height={spot.h}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(3, 6, 14, 0.78)"
            mask="url(#gp-spotlight-mask)"
          />
        </svg>

        {/* Click catcher outside tooltip (closes cleanly only via buttons so accidental clicks don't skip prematurely, or click backdrop to advance) */}
        <div
          className="fixed inset-0"
          onClick={nextTourStep}
          aria-hidden="true"
        />

        {/* Glowing Cyan Reticle + Subtle Animated Pointer around the target */}
        {spot && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            style={{
              top: spot.y,
              left: spot.x,
              width: spot.w,
              height: spot.h,
            }}
            className="fixed rounded-xl border-2 border-cyan-400 shadow-[0_0_26px_rgba(6,182,212,0.55)] pointer-events-none"
          >
            <motion.div
              animate={{ x: [0, 5, 0], y: [0, 5, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-3 -right-3 rounded-full bg-cyan-400 text-slate-950 p-1.5 shadow-lg"
            >
              <MousePointerClick className="w-4 h-4" />
            </motion.div>
          </motion.div>
        )}

        {/* Contextual Coachmark Card */}
        <motion.div
          key={`${activeRoom}-${tourStepIndex}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{ top: cardTop, left: cardLeft, width: cardW }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[75] cad-panel rounded-2xl border-cyan-400/50 p-4 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-num uppercase tracking-wider text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {roomInfo?.shortLabel} Guide · Step {tourStepIndex + 1}/{steps.length}
              </span>
            </div>
            <button
              onClick={skipTour}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              title="Skip Tour & Enter Application"
            >
              <span>Skip Tour</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h3 className="font-display text-base font-bold text-white leading-snug">
            {step.title}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
            {step.description}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {steps.map((s, i) => (
                <span
                  key={s.targetId}
                  className={`h-1.5 rounded-full transition-all ${
                    i === tourStepIndex ? "w-5 bg-cyan-400" : i < tourStepIndex ? "w-2 bg-emerald-400/70" : "w-2 bg-slate-700"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {tourStepIndex > 0 && (
                <button
                  onClick={prevTourStep}
                  className="inline-flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              <button
                onClick={nextTourStep}
                className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition cursor-pointer"
              >
                <span>{tourStepIndex + 1 >= steps.length ? "Got It" : "Next"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
