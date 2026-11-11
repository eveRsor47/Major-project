import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CloudLightning,
  Command,
  Cpu,
  FileSpreadsheet,
  HelpCircle,
  Home,
  Layers,
  Moon,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Waves,
  Zap,
} from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import type { ProblemId, RoomId } from "../types";

interface CmdAction {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: typeof Activity;
  run: () => void;
}

export function CommandPalette() {
  const {
    cmdPaletteOpen,
    setCmdPaletteOpen,
    enterRoom,
    setProblem,
    setSplit,
    toggleTheme,
    theme,
    toggleBgMotion,
    bgMotionEnabled,
    startTourForCurrentRoom,
    replayStory,
    testData,
    valData,
    activeSplit,
    setCursorIndex,
  } = useGridStore();

  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const ds = activeSplit === "val_2025" && valData ? valData : testData;

  const actions = useMemo<CmdAction[]>(() => {
    const jumpRoom = (room: RoomId) => () => {
      enterRoom(room);
      setCmdPaletteOpen(false);
    };

    const jumpScenario = (type: "peak" | "evening" | "night" | "shock") => () => {
      if (!ds) return;
      let target = 132;
      if (type === "peak") {
        let best = -1;
        ds.duck_curve.true_solar.forEach((v, i) => {
          if (v > best) {
            best = v;
            target = i;
          }
        });
      } else if (type === "night") {
        const hit = ds.weather.zenith.findIndex((z) => z >= 95);
        if (hit >= 0) target = hit;
      } else if (type === "shock") {
        target = ds.shock_events[0]?.index ?? 132;
      } else if (type === "evening") {
        let bestDelta = -Infinity;
        for (let i = 1; i < ds.count; i++) {
          const d = ds.duck_curve.true_net_load[i] - ds.duck_curve.true_net_load[i - 1];
          const hr = Number(ds.timestamps[i].slice(11, 13));
          if (hr >= 16 && hr <= 21 && d > bestDelta) {
            bestDelta = d;
            target = i;
          }
        }
      }
      enterRoom("mission-control");
      setCursorIndex(target);
      setCmdPaletteOpen(false);
    };

    return [
      { id: "rm-home", group: "Rooms", label: "Go to GridPulse Home Hub", hint: "Overview", icon: Home, run: jumpRoom("home") },
      { id: "rm-mc", group: "Rooms", label: "Open Mission Control Room", hint: "Duck Curve", icon: Activity, run: jumpRoom("mission-control") },
      { id: "rm-nm", group: "Rooms", label: "Open AI Neural Mixer", hint: "NNLS & 5 DL", icon: Sliders, run: jumpRoom("neural-mixer") },
      { id: "rm-cr", group: "Rooms", label: "Open Cloud Radar & Shocks", hint: "Doppler", icon: CloudLightning, run: jumpRoom("cloud-radar") },
      { id: "rm-dt", group: "Rooms", label: "Open Pavagada 8-Block Digital Twin", hint: "2,050 MW Map", icon: Layers, run: jumpRoom("digital-twin") },
      { id: "rm-vw", group: "Rooms", label: "Open Viva Examiner War Room", hint: "148 Models", icon: Cpu, run: jumpRoom("viva-war-room") },
      { id: "rm-kc", group: "Rooms", label: "Open KSLDC DSM Compliance Suite", hint: "±10% Band", icon: FileSpreadsheet, run: jumpRoom("ksldc-compliance") },

      { id: "sc-peak", group: "Grid Scenarios", label: "Jump to Peak Midday Solar Output", hint: "Irradiance Peak", icon: Sun, run: jumpScenario("peak") },
      { id: "sc-eve", group: "Grid Scenarios", label: "Jump to Steep Evening Net Ramp (17:00–20:00)", hint: "Duck Curve", icon: Zap, run: jumpScenario("evening") },
      { id: "sc-shock", group: "Grid Scenarios", label: "Jump to Steepest Real Cloud Shock Event", hint: "Ramp Alert", icon: CloudLightning, run: jumpScenario("shock") },
      { id: "sc-night", group: "Grid Scenarios", label: "Verify Night Zero Lock (Solar Zenith ≥ 90°)", hint: "M9 Physics", icon: Moon, run: jumpScenario("night") },

      ...(["S1", "S24", "D1", "D24"] as ProblemId[]).map((pid) => ({
        id: `prob-${pid}`,
        group: "Horizons",
        label: `Switch Forecast Target to ${pid}`,
        hint: pid.startsWith("S") ? "Pavagada Solar" : "State Demand",
        icon: Sparkles,
        run: () => {
          setProblem(pid);
          setCmdPaletteOpen(false);
        },
      })),

      {
        id: "sys-split-test",
        group: "System & Appearance",
        label: "Load Quarantined Test 2026 Dataset (1,393 hrs)",
        icon: ShieldCheck,
        run: () => {
          void setSplit("test_2026");
          setCmdPaletteOpen(false);
        },
      },
      {
        id: "sys-split-val",
        group: "System & Appearance",
        label: "Load Validation 2025 Dataset (8,737 hrs)",
        icon: Activity,
        run: () => {
          void setSplit("val_2025");
          setCmdPaletteOpen(false);
        },
      },
      {
        id: "sys-theme",
        group: "System & Appearance",
        label: theme === "dark" ? "Switch to Clean Daylight Light Mode" : "Switch to Obsidian Dark Mode",
        hint: "Theme",
        icon: theme === "dark" ? Sun : Moon,
        run: () => {
          toggleTheme();
          setCmdPaletteOpen(false);
        },
      },
      {
        id: "sys-bg",
        group: "System & Appearance",
        label: bgMotionEnabled ? "Pause Ambient Circuit Background" : "Enable Ambient Circuit Background",
        hint: "Canvas",
        icon: Waves,
        run: () => {
          toggleBgMotion();
          setCmdPaletteOpen(false);
        },
      },
      {
        id: "sys-guide",
        group: "System & Appearance",
        label: "Open Contextual Room Screen Guide (?)",
        icon: HelpCircle,
        run: () => {
          setCmdPaletteOpen(false);
          startTourForCurrentRoom();
        },
      },
      {
        id: "sys-story",
        group: "System & Appearance",
        label: "Replay Cinematic 5-Scene Introduction Story",
        icon: RotateCcw,
        run: () => {
          setCmdPaletteOpen(false);
          replayStory();
        },
      },
      {
        id: "sys-print",
        group: "System & Appearance",
        label: "Print / Export Compliance Dossier PDF",
        icon: Printer,
        run: () => {
          setCmdPaletteOpen(false);
          setTimeout(() => window.print(), 180);
        },
      },
    ];
  }, [
    enterRoom,
    setCmdPaletteOpen,
    ds,
    setCursorIndex,
    setProblem,
    setSplit,
    theme,
    toggleTheme,
    bgMotionEnabled,
    toggleBgMotion,
    startTourForCurrentRoom,
    replayStory,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        (a.hint?.toLowerCase().includes(q) ?? false)
    );
  }, [actions, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query, cmdPaletteOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdPaletteOpen(!cmdPaletteOpen);
        return;
      }
      if (!cmdPaletteOpen) return;
      if (e.key === "Escape") {
        setCmdPaletteOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (filtered.length > 0 ? (i + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (filtered.length > 0 ? (i - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter" && filtered[selectedIdx]) {
        e.preventDefault();
        filtered[selectedIdx].run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cmdPaletteOpen, setCmdPaletteOpen, filtered, selectedIdx]);

  if (!cmdPaletteOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4 bg-black/60 light:bg-slate-900/35 backdrop-blur-sm"
        onClick={() => setCmdPaletteOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl cad-panel rounded-2xl overflow-hidden shadow-2xl border border-white/15 light:border-slate-900/15"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] light:border-slate-900/10">
            <Search className="w-4 h-4 text-[#5CB8E4] light:text-sky-600 shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to room, scenario, horizon, theme, or dossier..."
              className="flex-1 bg-transparent text-sm text-white light:text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="inline-flex items-center gap-1 rounded border border-white/10 light:border-slate-300 px-1.5 py-0.5 text-[10px] font-mono-num text-slate-400">
              ESC
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No matching GridPulse command.
              </div>
            ) : (
              filtered.map((item, idx) => {
                const Icon = item.icon;
                const active = idx === selectedIdx;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={item.run}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer ${
                      active
                        ? "bg-[#5CB8E4]/16 light:bg-sky-500/12 text-white light:text-slate-950 border border-[#5CB8E4]/40 light:border-sky-600/35"
                        : "text-slate-300 light:text-slate-700 border border-transparent hover:bg-white/[0.04] light:hover:bg-slate-900/[0.04]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-[#E5A93C] light:text-amber-600 shrink-0" />
                      <span className="truncate font-medium">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0 text-[10px] font-mono-num text-slate-400 light:text-slate-500">
                      {item.hint && <span>{item.hint}</span>}
                      <span className="rounded px-1.5 py-0.5 bg-white/[0.05] light:bg-slate-900/[0.06]">
                        {item.group}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] light:border-slate-900/10 text-[10px] font-mono-num text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Command className="w-3 h-3" /> ↑↓ Select · Enter Execute
            </span>
            <span>Ctrl+K Anytime</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
