import { motion } from "framer-motion";

interface GridPulseLogoProps {
  mode?: "reveal" | "header" | "mark";
  className?: string;
}

/**
 * Signature GridPulse Emblem:
 * Interlocked Burnished Gold `d` (stem up) and Glacier Azure `p` (stem down)
 * executing a weighted 180-degree Yin-Yang Swing before crystallizing into wordmark.
 */
export function GridPulseLogo({ mode = "header", className = "" }: GridPulseLogoProps) {
  const isReveal = mode === "reveal";
  const isMark = mode === "mark";
  const size = isReveal ? 140 : isMark ? 30 : 32;
  const goldId = `gp-gold-${mode}`;
  const azureId = `gp-azure-${mode}`;
  const bloomId = `gp-soft-bloom-${mode}`;

  const MarkSvg = (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 overflow-visible"
      initial={isReveal ? { rotate: -195, scale: 0.45, opacity: 0 } : false}
      animate={
        isReveal
          ? {
              rotate: [-195, 180, -14, 0],
              scale: [0.45, 1.06, 0.98, 1],
              opacity: [0, 1, 1, 1],
            }
          : { rotate: 0, scale: 1, opacity: 1 }
      }
      whileHover={
        !isReveal
          ? { rotate: 180, transition: { type: "spring", stiffness: 120, damping: 14 } }
          : undefined
      }
      transition={{ duration: 2.0, times: [0, 0.55, 0.85, 1], ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <linearGradient id={goldId} x1="20" y1="16" x2="72" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5D076" />
          <stop offset="100%" stopColor="#C98A22" />
        </linearGradient>
        <linearGradient id={azureId} x1="50" y1="30" x2="104" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8ED8F8" />
          <stop offset="100%" stopColor="#3B93C9" />
        </linearGradient>
        <filter id={bloomId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={isReveal ? "4.5" : "2.2"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Precision concentric dual counter-rotating orbital rings locked to viewBox center */}
      <motion.circle
        cx="60"
        cy="60"
        r="55"
        stroke={`url(#${azureId})`}
        strokeWidth="1"
        strokeDasharray="18 8 4 8"
        opacity={isReveal ? 0.5 : 0.24}
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "60px 60px", transformBox: "view-box" }}
      />
      {isReveal && (
        <motion.circle
          cx="60"
          cy="60"
          r="46"
          stroke={`url(#${goldId})`}
          strokeWidth="0.9"
          strokeDasharray="24 14"
          opacity={0.38}
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "60px 60px", transformBox: "view-box" }}
        />
      )}

      {/* Yin-Yang interlocked `d` & `p` geometry */}
      <g filter={`url(#${bloomId})`}>
        <path
          d="M 55 17 L 55 76 C 55 83.5 49 89 41.5 89 C 29.5 89 20 78.5 20 64 C 20 49.5 29.5 39 41.5 39 C 47 39 51.5 41.5 55 45"
          stroke={`url(#${goldId})`}
          strokeWidth="8.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="80.5" cy="56" r="4.5" fill="#F5D076" />

        <path
          d="M 65 103 L 65 44 C 65 36.5 71 31 78.5 31 C 90.5 31 100 41.5 100 56 C 100 70.5 90.5 81 78.5 81 C 73 81 68.5 78.5 65 75"
          stroke={`url(#${azureId})`}
          strokeWidth="8.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="39.5" cy="64" r="4.5" fill="#8ED8F8" />
      </g>
    </motion.svg>
  );

  if (isMark) return MarkSvg;

  if (isReveal) {
    return (
      <div className={`flex flex-col items-center gap-6 ${className}`}>
        <div className="relative flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.2, 1], opacity: [0, 0.55, 0.25] }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            className="pointer-events-none absolute w-48 h-48 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(92,184,228,0.22) 0%, rgba(229,169,60,0.14) 45%, transparent 72%)",
            }}
          />
          {MarkSvg}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16, letterSpacing: "0.42em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.04em" }}
          transition={{ delay: 0.85, duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-4xl sm:text-5xl font-bold select-none"
        >
          <span className="text-[#F5F7FA]">Gri</span>
          <span className="text-[#E5A93C]">d</span>
          <span className="text-[#5CB8E4]">P</span>
          <span className="text-[#F5F7FA]">ulse</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {MarkSvg}
      <div className="leading-none">
        <div className="font-display text-[17px] font-bold">
          <span className="text-[#F5F7FA]">Gri</span>
          <span className="text-[#E5A93C]">d</span>
          <span className="text-[#5CB8E4]">P</span>
          <span className="text-[#F5F7FA]">ulse</span>
        </div>
        <div className="text-[10px] font-mono-num tracking-[0.16em] uppercase text-slate-400 mt-0.5">
          KSLDC · 2,050 MW
        </div>
      </div>
    </div>
  );
}
