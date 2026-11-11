import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Award,
  CheckCircle2,
  Circle,
  CloudLightning,
  Command,
  Cpu,
  FileSpreadsheet,
  HelpCircle,
  Home,
  Layers,
  Loader2,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sun,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { ROOM_META } from "../utils/metrics";
import type { RoomId } from "../types";
import { GridPulseLogo } from "./GridPulseLogo";
import { DashboardCanvas } from "./DashboardCanvas";

const ROOM_ICONS: Record<RoomId, typeof Activity> = {
  home: Home,
  "mission-control": Activity,
  "neural-mixer": Sliders,
  "cloud-radar": CloudLightning,
  "digital-twin": Layers,
  "viva-war-room": Cpu,
  "ksldc-compliance": FileSpreadsheet,
};

export function ControlRoomShell({ children }: { children: ReactNode }) {
  const {
    activeRoom,
    enterRoom,
    activeSplit,
    setSplit,
    valLoading,
    sfxEnabled,
    toggleSfx,
    theme,
    toggleTheme,
    bgMotionEnabled,
    toggleBgMotion,
    setCmdPaletteOpen,
    startTourForCurrentRoom,
    replayStory,
    quests,
    manifest,
  } = useGridStore();
  const [questMenuOpen, setQuestMenuOpen] = useState(false);

  const questItems = [
    { key: "toggledHorizon", done: quests.toggledHorizon, label: "Switch forecast horizon (S1 / S24 / D1 / D24)", targetRoom: "mission-control" as RoomId },
    { key: "ranNnlsSolver", done: quests.ranNnlsSolver, label: "Run NNLS Auto-Solver in Neural Mixer", targetRoom: "neural-mixer" as RoomId },
    { key: "inspectedShock", done: quests.inspectedShock, label: "Inspect a real Cloud Shock event", targetRoom: "cloud-radar" as RoomId },
    { key: "auditedLeaderboard", done: quests.auditedLeaderboard, label: "Audit the 148-Model Test Leaderboard", targetRoom: "viva-war-room" as RoomId },
  ];
  const questsDoneCount = questItems.filter((q) => q.done).length;

  return (
    <div className="relative min-h-screen flex flex-col bg-[#07080B] light:bg-[#EEF3F8] cad-grid-bg text-[#EDF2F7] light:text-slate-900 transition-colors duration-300">
      {/* Live Kinetic Circuit & Substation Telemetry Background */}
      <DashboardCanvas />

      {/* STICKY ARCHITECTURAL HEADER */}
      <header className="no-print sticky top-0 z-40 border-b border-white/[0.08] light:border-slate-900/10 bg-[#07080B]/85 light:bg-white/82 backdrop-blur-xl transition-colors duration-300">
        <div className="mx-auto max-w-[1640px] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => enterRoom("home")}
              title="Go to GridPulse Home Page"
              className={`group flex items-center gap-2 rounded-xl px-2 py-1 -ml-2 transition cursor-pointer ${
                activeRoom === "home"
                  ? "bg-white/[0.06] light:bg-slate-900/[0.06] ring-1 ring-[#5CB8E4]/40 light:ring-sky-600/35"
                  : "hover:bg-white/[0.04] light:hover:bg-slate-900/[0.04]"
              }`}
            >
              <GridPulseLogo mode="header" />
            </button>
          </div>

          {/* Morphing Pill Room Navigation (layoutId animated indicator) */}
          <nav className="flex items-center gap-0.5 rounded-full border border-white/[0.08] light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.04] p-1 overflow-x-auto max-w-full">
            {ROOM_META.map((room) => {
              const Icon = ROOM_ICONS[room.id];
              const isActive = activeRoom === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => enterRoom(room.id)}
                  title={room.label}
                  className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? "text-[#07080B] light:text-white"
                      : "text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-[#EDF2F7] light:bg-slate-900 shadow-sm"
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{room.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <div
              data-tour-id="mc-split-toggle"
              className="inline-flex items-center rounded-full border border-white/10 light:border-slate-900/12 bg-white/[0.03] light:bg-slate-900/[0.04] p-0.5 text-[11px] font-mono-num"
            >
              <button
                onClick={() => void setSplit("test_2026")}
                className={`px-2 py-1 rounded-full transition cursor-pointer ${
                  activeSplit === "test_2026"
                    ? "bg-[#5CB8E4] light:bg-sky-600 text-[#07080B] light:text-white font-bold"
                    : "text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950"
                }`}
              >
                Test 2026
              </button>
              <button
                onClick={() => void setSplit("val_2025")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition cursor-pointer ${
                  activeSplit === "val_2025"
                    ? "bg-[#E5A93C] light:bg-amber-600 text-[#07080B] light:text-white font-bold"
                    : "text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950"
                }`}
              >
                {valLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Val 2025</span>
              </button>
            </div>

            <button
              onClick={() => setCmdPaletteOpen(true)}
              aria-label="Open Quick Command Palette"
              title="Command Palette (Ctrl+K)"
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 light:border-slate-300 bg-white/[0.03] light:bg-white px-2.5 py-1.5 text-[11px] font-mono-num text-slate-300 light:text-slate-700 hover:border-white/25 light:hover:border-slate-400 transition cursor-pointer"
            >
              <Command className="w-3 h-3 text-[#5CB8E4] light:text-sky-600" />
              <span>Ctrl+K</span>
            </button>

            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark / Light Mode"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="rounded-full border border-white/10 light:border-slate-300 bg-white/[0.03] light:bg-white p-1.5 text-slate-200 light:text-slate-700 hover:border-[#E5A93C]/50 light:hover:border-sky-500 transition cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-[#F3C669]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-sky-700" />
              )}
            </button>

            <button
              onClick={toggleBgMotion}
              aria-label="Toggle Live Grid Background Motion"
              title={bgMotionEnabled ? "Pause Live Grid Background" : "Enable Live Grid Background"}
              className={`rounded-full border p-1.5 transition cursor-pointer ${
                bgMotionEnabled
                  ? "border-[#34D399]/35 bg-[#34D399]/10 text-[#6EE7B7] light:border-emerald-600/35 light:bg-emerald-500/10 light:text-emerald-700"
                  : "border-white/10 light:border-slate-300 bg-white/[0.03] light:bg-white text-slate-500"
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setQuestMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5A93C]/30 light:border-amber-600/35 bg-[#E5A93C]/10 light:bg-amber-500/12 px-2.5 py-1.5 text-xs font-mono-num text-[#F3C669] light:text-amber-700 hover:bg-[#E5A93C]/20 transition cursor-pointer"
                title="Operator Exploration Quests"
              >
                <Award className="w-3.5 h-3.5" />
                <span>{questsDoneCount}/4</span>
              </button>
              {questMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 cad-panel rounded-2xl border-white/15 light:border-slate-200 p-3 shadow-2xl z-50">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#F3C669] light:text-amber-700 mb-2">
                    <span>Operator Verification Quests</span>
                    <span className="font-mono-num">{questsDoneCount}/4</span>
                  </div>
                  <div className="space-y-1">
                    {questItems.map((q) => (
                      <button
                        key={q.key}
                        onClick={() => {
                          setQuestMenuOpen(false);
                          enterRoom(q.targetRoom);
                        }}
                        className="w-full text-left flex items-start gap-2 rounded-lg p-1.5 hover:bg-white/[0.05] light:hover:bg-slate-900/[0.05] transition cursor-pointer"
                      >
                        {q.done ? (
                          <CheckCircle2 className="w-4 h-4 text-[#34D399] light:text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 light:text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-xs ${
                            q.done
                              ? "text-slate-400 light:text-slate-400 line-through"
                              : "text-slate-200 light:text-slate-800"
                          }`}
                        >
                          {q.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleSfx}
              aria-label="Toggle UI Sound Effects"
              className="rounded-full border border-white/10 light:border-slate-300 bg-white/[0.03] light:bg-white p-1.5 text-slate-300 light:text-slate-700 hover:border-white/25 transition cursor-pointer"
            >
              {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            <button
              onClick={startTourForCurrentRoom}
              className="inline-flex items-center gap-1 rounded-full border border-[#5CB8E4]/35 light:border-sky-600/35 bg-[#5CB8E4]/10 light:bg-sky-500/12 px-3 py-1.5 text-xs font-medium text-[#8ED8F8] light:text-sky-700 hover:bg-[#5CB8E4]/20 transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Screen Guide</span>
            </button>

            <button
              onClick={replayStory}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 light:border-slate-300 bg-white/[0.03] light:bg-white px-3 py-1.5 text-xs text-slate-300 light:text-slate-700 hover:border-white/25 transition cursor-pointer"
              title="Replay GridPulse Story Intro"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Story</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1640px] px-4 sm:px-6 py-5">
        {children}
      </main>

      <footer className="no-print relative z-10 border-t border-white/[0.06] light:border-slate-900/10 bg-[#07080B]/85 light:bg-white/80 backdrop-blur-md px-4 py-2.5 text-[11px] font-mono-num text-slate-500 light:text-slate-600">
        <div className="mx-auto max-w-[1640px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399] light:text-emerald-600" />
            <span>
              {manifest?.site.name ?? "Pavagada Ultra Mega Solar Park"} ({manifest?.site.capacity_mw ?? 2050} MW) ·{" "}
              {manifest?.verification.champion_pipeline ?? "Stacking Ridge + M9 Physical Constraints"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>{manifest?.verification.models_evaluated_test ?? 148} Test Evaluations</span>
            <span className="text-[#34D399] light:text-emerald-700">
              {manifest?.verification.pytest_passed ?? 97}/{manifest?.verification.pytest_total ?? 97} Pytest Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
