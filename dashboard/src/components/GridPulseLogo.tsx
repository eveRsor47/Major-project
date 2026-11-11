import { motion } from "framer-motion";

interface GridPulseLogoProps {
  mode?: "reveal" | "header" | "mark";
  className?: string;
}

/**
 * Signature GridPulse brand mark:
 * Lowercase `d` (Solar Amber #F59E0B, stem up) & lowercase `p` (Grid Cyan #06B6D4, stem down)
 * share 180-degree rotational Yin-Yang symmetry and perform the signature d <-> p swing.
 */
export function GridPulseLogo({ mode = "header", className = "" }: GridPulseLogoProps) {
  const isReveal = mode === "reveal";
  const isMark = mode === "mark";
  const size = isReveal ? 128 : isMark ? 32 : 34;

  const MarkSvg = (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 overflow-visible"
      initial={isReveal ? { rotate: -180, scale: 0.7, opacity: 0 } : false}
      animate={
        isReveal
          ? {
              rotate: [-180, 18, -6, 0],
              scale: [0.7, 1.08, 0.98, 1],
              opacity: 1,
            }
          : { rotate: 0, scale: 1, opacity: 1 }
      }
      whileHover={!isReveal ? { rotate: 180, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } : undefined}
      transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <linearGradient id="gp-amber" x1="18" y1="16" x2="72" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="gp-cyan" x1="50" y1="32" x2="104" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <filter id="gp-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer subtle pulse halo */}
      <motion.circle
        cx="60"
        cy="60"
        r="54"
        stroke="url(#gp-cyan)"
        strokeWidth="1.2"
        strokeDasharray="6 6"
        opacity={isReveal ? 0.55 : 0.35}
        animate={isReveal ? { rotate: 360 } : undefined}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "60px 60px" }}
      />

      {/* Taiji-inspired interlocking core */}
      <g filter="url(#gp-glow)">
        {/* Lowercase `d`: Left semi-bowl + vertical stem rising top-center-left */}
        <path
          d="M 55 17 L 55 76 C 55 83.5 49 89 41.5 89 C 29.5 89 20 78.5 20 64 C 20 49.5 29.5 39 41.5 39 C 47 39 51.5 41.5 55 45"
          stroke="url(#gp-amber)"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Amber Yin eye (inside p's cyan head) */}
        <circle cx="80.5" cy="56" r="4.8" fill="#FBBF24" />

        {/* Lowercase `p`: Exact 180-deg rotational twin on right (stem down) */}
        <path
          d="M 65 103 L 65 44 C 65 36.5 71 31 78.5 31 C 90.5 31 100 41.5 100 56 C 100 70.5 90.5 81 78.5 81 C 73 81 68.5 78.5 65 75"
          stroke="url(#gp-cyan)"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Cyan Yang eye (inside d's amber belly) */}
        <circle cx="39.5" cy="64" r="4.8" fill="#38BDF8" />
      </g>
    </motion.svg>
  );

  if (isMark) return MarkSvg;

  if (isReveal) {
    return (
      <div className={`flex flex-col items-center gap-5 ${className}`}>
        {MarkSvg}
        <motion.div
          initial={{ opacity: 0, y: 14, letterSpacing: "0.35em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.06em" }}
          transition={{ delay: 0.9, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-4xl sm:text-5xl font-bold tracking-tight select-none"
        >
          <span className="text-slate-100">Gri</span>
          <span className="text-amber-400">d</span>
          <span className="text-cyan-400">P</span>
          <span className="text-slate-100">ulse</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {MarkSvg}
      <div className="leading-none">
        <div className="font-display text-lg font-bold tracking-tight">
          <span className="text-slate-100">Gri</span>
          <span className="text-amber-400">d</span>
          <span className="text-cyan-400">P</span>
          <span className="text-slate-100">ulse</span>
        </div>
        <div className="text-[10px] font-mono-num tracking-widest uppercase text-cyan-400/75">
          KSLDC · 2,050 MW
        </div>
      </div>
    </div>
  );
}

