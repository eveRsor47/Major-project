import { useEffect, useRef } from "react";
import { useGridStore } from "../store/useGridStore";

interface Packet {
  gx: number;
  gy: number;
  dirIdx: number; // 0:E, 1:NE, 2:S, 3:SE, 4:W, 5:NW, 6:N, 7:SW
  progress: number;
  speed: number;
  kind: "solar" | "azure" | "emerald";
  history: Array<{ x: number; y: number }>;
}

const CELL = 72;
const DIRS = [
  [1, 0],
  [1, -1],
  [0, 1],
  [1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [-1, 1],
] as const;

/**
 * Distinct from StoryCanvas:
 * Architectural SCADA Circuit Matrix & Substation Telemetry Pulses.
 * Orthogonal + 45-deg chamfered busbars with traveling energy packets,
 * substation harmonic rings, Light/Dark theme reactivity, and live solar load modulation.
 */
export function DashboardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme, activeRoom, bgMotionEnabled, cursorIndex, activeSplit, testData, valData } =
    useGridStore();

  const ds = activeSplit === "val_2025" && valData ? valData : testData;
  const idx = ds ? Math.min(cursorIndex, ds.count - 1) : 0;
  const solarRatio = ds ? Math.min(1, Math.max(0, ds.duck_curve.true_solar[idx] / 2050)) : 0.6;
  const isNight = ds ? ds.weather.zenith[idx] >= 90 : false;

  const stateRef = useRef({ theme, activeRoom, bgMotionEnabled, solarRatio, isNight });
  useEffect(() => {
    stateRef.current = { theme, activeRoom, bgMotionEnabled, solarRatio, isNight };
  }, [theme, activeRoom, bgMotionEnabled, solarRatio, isNight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cols = Math.max(8, Math.ceil(w / CELL));
    let rows = Math.max(6, Math.ceil(h / CELL));
    let rafId = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cols = Math.max(8, Math.ceil(w / CELL));
      rows = Math.max(6, Math.ceil(h / CELL));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const packets: Packet[] = Array.from({ length: 58 }, (_, i) => {
      const gx = Math.floor(Math.random() * cols);
      const gy = Math.floor(Math.random() * rows);
      const kind = i % 5 === 0 ? "emerald" : i % 2 === 0 ? "solar" : "azure";
      return {
        gx,
        gy,
        dirIdx: (i * 3) % DIRS.length,
        progress: Math.random(),
        speed: 0.011 + Math.random() * 0.014,
        kind,
        history: [],
      };
    });

    const nodes = Array.from({ length: 18 }, (_, i) => ({
      gx: Math.floor(((i * 7 + 2) % Math.max(4, cols - 2)) + 1),
      gy: Math.floor(((i * 5 + 1) % Math.max(3, rows - 2)) + 1),
      phase: i * 0.7,
    }));

    let t = 0;
    const render = () => {
      const {
        theme: th,
        activeRoom: room,
        bgMotionEnabled: motionOn,
        solarRatio: sr,
        isNight: night,
      } = stateRef.current;

      const isLight = th === "light";
      ctx.clearRect(0, 0, w, h);

      // Subtle architectural substation lattice lines (every 2 cells)
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.042)" : "rgba(148, 163, 184, 0.042)";
      ctx.beginPath();
      for (let x = 0; x <= w; x += CELL * 2) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += CELL * 2) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Subtle diagonal chamfer buses anchored across columns
      ctx.strokeStyle = isLight ? "rgba(2, 132, 199, 0.04)" : "rgba(92, 184, 228, 0.035)";
      ctx.beginPath();
      for (let i = 0; i < nodes.length - 1; i += 2) {
        const a = nodes[i];
        const b = nodes[(i + 3) % nodes.length];
        const ax = (a.gx % Math.max(4, cols)) * CELL;
        const ay = (a.gy % Math.max(3, rows)) * CELL;
        const bx = (b.gx % Math.max(4, cols)) * CELL;
        const by = (b.gy % Math.max(3, rows)) * CELL;
        const midX = ax + Math.sign(bx - ax) * Math.min(Math.abs(bx - ax), CELL);
        ctx.moveTo(ax, ay);
        ctx.lineTo(midX, by);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();

      // Ambient Substation Anchor Nodes
      for (let i = 0; i < nodes.length; i++) {
        const nd = nodes[i];
        const nx = (nd.gx % Math.max(4, cols)) * CELL;
        const ny = (nd.gy % Math.max(3, rows)) * CELL;
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + nd.phase);
        const nodeColor =
          i % 3 === 0
            ? isLight
              ? `rgba(217, 119, 6, ${0.14 + pulse * 0.14})`
              : `rgba(229, 169, 60, ${0.18 + pulse * 0.22})`
            : isLight
            ? `rgba(2, 132, 199, ${0.12 + pulse * 0.14})`
            : `rgba(92, 184, 228, ${0.16 + pulse * 0.22})`;

        ctx.beginPath();
        ctx.arc(nx, ny, 2 + pulse * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        if (pulse > 0.78 && motionOn) {
          ctx.beginPath();
          ctx.arc(nx, ny, 6 + (pulse - 0.78) * 32, 0, Math.PI * 2);
          ctx.strokeStyle = isLight ? "rgba(2, 132, 199, 0.1)" : "rgba(92, 184, 228, 0.14)";
          ctx.stroke();
        }
      }

      // Radar Sweep Accent in Cloud Radar room (subtle corner pulse)
      if (room === "cloud-radar" && motionOn) {
        const rx = w * 0.86;
        const ry = h * 0.24;
        const ringR = ((t * 52) % 180) + 20;
        const alpha = Math.max(0, 0.18 - (ringR / 200) * 0.18);
        ctx.beginPath();
        ctx.arc(rx, ry, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = isLight ? `rgba(2, 132, 199, ${alpha})` : `rgba(92, 184, 228, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Live Moving Telemetry Packets on Grid Busbars
      const speedMult = room === "mission-control" || room === "digital-twin"
        ? night
          ? 0.75
          : 0.85 + sr * 0.55
        : 0.95;

      for (let i = 0; i < packets.length; i++) {
        const pk = packets[i];
        const [dx, dy] = DIRS[pk.dirIdx];

        if (motionOn) {
          pk.progress += pk.speed * speedMult;
          if (pk.progress >= 1) {
            pk.gx += dx;
            pk.gy += dy;
            pk.progress -= 1;

            if (pk.gx < 0 || pk.gx > cols || pk.gy < 0 || pk.gy > rows) {
              pk.gx = Math.floor(Math.random() * cols);
              pk.gy = Math.floor(Math.random() * rows);
              pk.history = [];
            }
            // Orthogonal / 45-deg routing turn probability
            if (Math.random() < 0.34) {
              const turn = Math.random() < 0.5 ? 1 : -1;
              pk.dirIdx = (pk.dirIdx + turn + DIRS.length) % DIRS.length;
            }
          }
        }

        const px = (pk.gx + dx * pk.progress) * CELL;
        const py = (pk.gy + dy * pk.progress) * CELL;

        if (motionOn) {
          pk.history.push({ x: px, y: py });
          if (pk.history.length > 14) pk.history.shift();
        }

        let colRgb = "92, 184, 228"; // azure default
        if (room === "viva-war-room" || room === "ksldc-compliance") {
          colRgb = pk.kind === "solar" ? (isLight ? "2, 132, 199" : "92, 184, 228") : isLight ? "5, 150, 105" : "52, 211, 153";
        } else if (room === "neural-mixer" && pk.kind === "emerald") {
          colRgb = isLight ? "124, 58, 237" : "159, 143, 239";
        } else if (pk.kind === "solar" && !night) {
          colRgb = isLight ? "217, 119, 6" : "229, 169, 60";
        } else if (pk.kind === "emerald") {
          colRgb = isLight ? "5, 150, 105" : "52, 211, 153";
        } else if (isLight) {
          colRgb = "2, 132, 199";
        }

        const baseAlpha = isLight ? 0.44 : 0.62;

        if (pk.history.length > 1) {
          ctx.beginPath();
          ctx.moveTo(pk.history[0].x, pk.history[0].y);
          for (let j = 1; j < pk.history.length; j++) {
            ctx.lineTo(pk.history[j].x, pk.history[j].y);
          }
          ctx.strokeStyle = `rgba(${colRgb}, ${baseAlpha * 0.55})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(px, py, 5.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colRgb}, ${isLight ? 0.12 : 0.16})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 2.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colRgb}, ${baseAlpha})`;
        ctx.fill();
      }

      if (motionOn) {
        t += 0.016;
        rafId = requestAnimationFrame(render);
      }
    };

    render();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [bgMotionEnabled]);

  return (
    <canvas
      ref={canvasRef}
      className="no-print fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
