import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";
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

    let attempts = 0;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let observedEl: Element | null = null;

    const measure = () => {
      if (cancelled) return;
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
      const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        if (observedEl !== el) {
          ro?.disconnect();
          ro = new ResizeObserver(measure);
          ro.observe(el);
          observedEl = el;
          el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
      }
    };

    measure();
    const poll = setInterval(() => {
      attempts += 1;
      measure();
      if (attempts > 25) clearInterval(poll);
    }, 65);

    const settleT = setTimeout(measure, 520);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(settleT);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      ro?.disconnect();
    };
  }, [tourActive, step, activeRoom, tourStepIndex]);

  if (!tourActive || !step) return null;

  const pad = 10;
  const spot = rect
    ? {
        x: Math.max(4, rect.left - pad),
        y: Math.max(4, rect.top - pad),
        w: rect.width + pad * 2,
        h: rect.height + pad * 2,
      }
    : null;

  const cardW = Math.min(370, winSize.w - 32);
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
        {/* Architectural Obsidian Scrim with Smooth Mask Cutout */}
        <svg className="fixed inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="gp-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spot && (
                <rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx="14" fill="black" />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(4, 5, 8, 0.82)"
            mask="url(#gp-spotlight-mask)"
          />
        </svg>

        <div className="fixed inset-0" onClick={nextTourStep} aria-hidden="true" />

        {/* Architectural CAD Corner Bracket Reticle (zero cartoon icons) */}
        {spot && (
          <motion.div
            animate={{ top: spot.y, left: spot.x, width: spot.w, height: spot.h }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed rounded-xl border border-white/25 shadow-[0_0_32px_rgba(92,184,228,0.28)] pointer-events-none"
          >
            {/* 4 Precision Corner Brackets */}
            <span className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#5CB8E4] rounded-tl-md" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#5CB8E4] rounded-tr-md" />
            <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#5CB8E4] rounded-bl-md" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#5CB8E4] rounded-br-md" />
          </motion.div>
        )}

        {/* Contextual Coachmark Card */}
        <motion.div
          key={`${activeRoom}-${tourStepIndex}`}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          style={{ top: cardTop, left: cardLeft, width: cardW }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[75] cad-panel rounded-2xl border-white/15 p-4.5 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-num uppercase tracking-[0.14em] text-[#8ED8F8] light:text-sky-700">
              <Compass className="w-3.5 h-3.5" />
              <span>
                {roomInfo?.shortLabel} · Step {tourStepIndex + 1}/{steps.length}
              </span>
            </div>
            <button
              onClick={skipTour}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-slate-400 light:text-slate-600 hover:bg-white/10 light:hover:bg-slate-900/10 hover:text-white light:hover:text-slate-950 transition cursor-pointer"
            >
              <span>Skip Tour</span>
              <X className="w-3 h-3" />
            </button>
          </div>

          <h3 className="font-display text-base font-bold text-white light:text-slate-900 leading-snug">
            {step.title}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300 light:text-slate-700">
            {step.description}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {steps.map((s, i) => (
                <span
                  key={s.targetId}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === tourStepIndex
                      ? "w-5 bg-[#EDF2F7] light:bg-slate-900"
                      : i < tourStepIndex
                      ? "w-2 bg-[#34D399]/75 light:bg-emerald-600"
                      : "w-2 bg-white/15 light:bg-slate-300"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {tourStepIndex > 0 && (
                <button
                  onClick={prevTourStep}
                  className="inline-flex items-center gap-0.5 rounded-full border border-white/12 light:border-slate-300 bg-white/[0.04] light:bg-slate-100 px-2.5 py-1 text-xs text-slate-300 light:text-slate-700 hover:border-white/25 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              <button
                onClick={nextTourStep}
                className="inline-flex items-center gap-1 rounded-full bg-[#EDF2F7] light:bg-slate-900 px-3.5 py-1 text-xs font-semibold text-[#07080B] light:text-white hover:bg-white light:hover:bg-slate-800 transition cursor-pointer"
              >
                <span>{tourStepIndex + 1 >= steps.length ? "Done" : "Next"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
