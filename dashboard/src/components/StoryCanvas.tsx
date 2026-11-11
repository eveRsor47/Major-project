import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  polarity: "gold" | "azure";
  size: number;
  angle: number;
  radius: number;
}

interface StoryCanvasProps {
  scene: number; // 0..4
}

/**
 * Full-bleed 60fps High-DPI HTML5 Canvas engine:
 * Renders a 3D perspective topographical energy lattice + volumetric light particles,
 * morphing across Challenge -> Grid Instability -> CAD Neural Scan -> Equilibrium ->
 * Dual-Arm Yin-Yang Gravitational Convergence in Scene 5.
 */
export function StoryCanvas({ scene }: StoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef(scene);

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 1366;
    let height = 768;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rafId = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize 240 bipolar particles (Solar Gold + Grid Azure)
    const COUNT = 240;
    const particles: Particle[] = Array.from({ length: COUNT }, (_, i) => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return {
        x,
        y,
        px: x,
        py: y,
        vx: (Math.random() - 0.5) * 0.8 + 0.5,
        vy: (Math.random() - 0.5) * 0.4,
        polarity: i % 2 === 0 ? "gold" : "azure",
        size: 1.1 + Math.random() * 1.6,
        angle: (i / COUNT) * Math.PI * 2,
        radius: 90 + Math.random() * Math.max(width, height) * 0.45,
      };
    });

    let t = 0;
    const render = () => {
      t += 0.016;
      const s = sceneRef.current;

      // Subtle motion-trail persistence fill
      ctx.fillStyle = s === 4 ? "rgba(7, 8, 11, 0.24)" : "rgba(7, 8, 11, 0.34)";
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.48;

      // 1. Perspective 3D Topographical Wireframe Mesh (Scenes 0..3)
      if (s < 4) {
        const cols = 28;
        const rows = 14;
        const fov = 420;
        const horizonY = height * 0.28;

        ctx.lineWidth = 0.8;

        const project = (ix: number, iz: number) => {
          const nx = (ix / cols - 0.5) * 2.4;
          const nz = iz / rows;
          const depth = 0.55 + nz * 2.1;

          // Harmonic wave height governed by active scene
          let waveAmp = 34;
          let waveFreq = 3.2;
          if (s === 1) {
            waveAmp = 62;
            waveFreq = 6.2;
          } else if (s === 2) {
            waveAmp = 16;
            waveFreq = 4.0;
          } else if (s === 3) {
            waveAmp = 24;
            waveFreq = 2.6;
          }

          const yOff =
            Math.sin(nx * waveFreq + t * (s === 1 ? 2.6 : 1.1)) *
              Math.cos(nz * 4.5 - t * 0.9) *
              waveAmp +
            (s === 1 ? Math.sin(nx * 14 + t * 5.2) * 8 : 0);

          const scale = fov / (fov + depth * 460);
          const sx = cx + nx * width * 0.72 * scale;
          const sy = horizonY + (nz * height * 0.78 + yOff) * scale;
          return { sx, sy, nz };
        };

        for (let r = 0; r < rows; r++) {
          ctx.beginPath();
          for (let c = 0; c <= cols; c++) {
            const p = project(c, r);
            if (c === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          }
          const alpha = 0.04 + (r / rows) * 0.14;
          if (s === 0) ctx.strokeStyle = `rgba(229, 169, 60, ${alpha})`;
          else if (s === 1) ctx.strokeStyle = `rgba(244, 96, 96, ${alpha * 1.15})`;
          else if (s === 2) ctx.strokeStyle = `rgba(92, 184, 228, ${alpha * 1.25})`;
          else ctx.strokeStyle = `rgba(52, 211, 153, ${alpha * 1.1})`;
          ctx.stroke();
        }

        // Cross longitudinal grid lines subtly for Scene 2 CAD scan & Scene 0
        if (s === 0 || s === 2 || s === 3) {
          for (let c = 0; c <= cols; c += 2) {
            ctx.beginPath();
            for (let r = 0; r < rows; r++) {
              const p = project(c, r);
              if (r === 0) ctx.moveTo(p.sx, p.sy);
              else ctx.lineTo(p.sx, p.sy);
            }
            ctx.strokeStyle =
              s === 2 ? "rgba(92, 184, 228, 0.09)" : "rgba(255, 255, 255, 0.04)";
            ctx.stroke();
          }
        }

        // Subtle CAD Laser Scan Sweep in Scene 2
        if (s === 2) {
          const scanX = ((t * 170) % (width + 220)) - 110;
          const grad = ctx.createLinearGradient(scanX - 90, 0, scanX + 16, 0);
          grad.addColorStop(0, "rgba(92, 184, 228, 0)");
          grad.addColorStop(0.86, "rgba(92, 184, 228, 0.06)");
          grad.addColorStop(1, "rgba(142, 216, 248, 0.14)");
          ctx.fillStyle = grad;
          ctx.fillRect(scanX - 90, 0, 106, height);
        }
      }

      // 2. Bipolar Field Particles & Scene 5 Dual-Arm Spiral Vortex
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        pt.px = pt.x;
        pt.py = pt.y;

        if (s === 4) {
          // Scene 5 Gravitational Yin-Yang Vortex framed around the centered d <-> p emblem
          const armOffset = pt.polarity === "gold" ? 0 : Math.PI;
          const minBand = Math.max(96, Math.min(width, height) * 0.125);
          const targetBand = minBand + (i % 7) * 14;
          const emblemY = height >= 880 ? height * 0.415 : height * 0.405;
          pt.angle += 0.02 + (150 / Math.max(100, pt.radius)) * 0.009;
          pt.radius = pt.radius + (targetBand - pt.radius) * 0.05;
          const targetX = cx + Math.cos(pt.angle + armOffset) * pt.radius;
          const targetY = emblemY + Math.sin(pt.angle + armOffset) * pt.radius * 0.78;
          pt.x += (targetX - pt.x) * 0.16;
          pt.y += (targetY - pt.y) * 0.16;
        } else if (s === 1) {
          // Turbulent gust / fault drift
          const angle = Math.sin(pt.x * 0.008 + t * 2.2) * Math.cos(pt.y * 0.008 - t * 1.9) * Math.PI;
          pt.x += Math.cos(angle) * 2.1 + 1.1;
          pt.y += Math.sin(angle) * 2.1;
        } else if (s === 2) {
          // Precision laminar parallel data bus streams
          pt.x += 2.3;
          pt.y += Math.sin(t * 2 + pt.x * 0.015) * 0.45;
        } else {
          // Scene 0 & 3 serene laminar energy streams
          const drift = Math.sin(pt.x * 0.004 + t * 0.7) * 0.65;
          pt.x += pt.polarity === "gold" ? 1.15 : 0.85;
          pt.y += drift;
        }

        if (s < 4) {
          if (pt.x > width + 10) {
            pt.x = -10;
            pt.px = pt.x;
          }
          if (pt.x < -10) {
            pt.x = width + 10;
            pt.px = pt.x;
          }
          if (pt.y > height + 10) {
            pt.y = -10;
            pt.py = pt.y;
          }
          if (pt.y < -10) {
            pt.y = height + 10;
            pt.py = pt.y;
          }
        }

        // Draw smooth trail stroke + crisp luminous core
        const goldColor = s === 1 ? "rgba(244, 96, 96, 0.65)" : "rgba(229, 169, 60, 0.72)";
        const azureColor =
          s === 3
            ? "rgba(52, 211, 153, 0.68)"
            : s === 1
            ? "rgba(229, 169, 60, 0.48)"
            : "rgba(92, 184, 228, 0.72)";
        const col = pt.polarity === "gold" ? goldColor : azureColor;

        ctx.beginPath();
        ctx.moveTo(pt.px, pt.py);
        ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = col;
        ctx.lineWidth = pt.size;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
