import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Award,
  CheckCircle2,
  Circle,
  CloudLightning,
  Cpu,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useGridStore } from "../store/useGridStore";
import { ROOM_META } from "../utils/metrics";
import type { RoomId } from "../types";
import { GridPulseLogo } from "./GridPulseLogo";

const ROOM_ICONS: Record<RoomId, typeof Activity> = {
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
    <div className="min-h-screen flex flex-col bg-[#07080B] cad-grid-bg text-[#EDF2F7]">
      {/* STICKY ARCHITECTURAL HEADER */}
      <header className="no-print sticky top-0 z-40 border-b border-white/[0.08] bg-[#07080B]/88 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-4">
            <GridPulseLogo mode="header" />
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-mono-num text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
              <span>ZERO-LEAKAGE TELEMETRY</span>
            </div>
          </div>

          {/* Morphing Pill Room Navigation (layoutId animated indicator) */}
          <nav className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 overflow-x-auto max-w-full">
            {ROOM_META.map((room) => {
              const Icon = ROOM_ICONS[room.id];
              const isActive = activeRoom === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => enterRoom(room.id)}
                  className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive ? "text-[#07080B]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-[#EDF2F7] shadow-sm"
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10 hidden 2xl:inline">{room.label}</span>
                  <span className="relative z-10 2xl:hidden">{room.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div
              data-tour-id="mc-split-toggle"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-[11px] font-mono-num"
            >
              <button
                onClick={() => void setSplit("test_2026")}
                className={`px-2.5 py-1 rounded-full transition cursor-pointer ${
                  activeSplit === "test_2026"
                    ? "bg-[#5CB8E4] text-[#07080B] font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Test 2026 (1.4k)
              </button>
              <button
                onClick={() => void setSplit("val_2025")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition cursor-pointer ${
                  activeSplit === "val_2025"
                    ? "bg-[#E5A93C] text-[#07080B] font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {valLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Val 2025 (8.7k)</span>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setQuestMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E5A93C]/30 bg-[#E5A93C]/10 px-2.5 py-1.5 text-xs font-mono-num text-[#F3C669] hover:bg-[#E5A93C]/20 transition cursor-pointer"
                title="Operator Exploration Quests"
              >
                <Award className="w-3.5 h-3.5" />
                <span>{questsDoneCount}/4</span>
              </button>
              {questMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 cad-panel rounded-2xl border-white/15 p-3 shadow-2xl z-50">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#F3C669] mb-2">
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
                        className="w-full text-left flex items-start gap-2 rounded-lg p-1.5 hover:bg-white/[0.05] transition cursor-pointer"
                      >
                        {q.done ? (
                          <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        )}
                        <span className={`text-xs ${q.done ? "text-slate-400 line-through" : "text-slate-200"}`}>
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
              className="rounded-full border border-white/10 bg-white/[0.03] p-1.5 text-slate-300 hover:border-white/25 hover:text-white transition cursor-pointer"
            >
              {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            <button
              onClick={startTourForCurrentRoom}
              className="inline-flex items-center gap-1 rounded-full border border-[#5CB8E4]/35 bg-[#5CB8E4]/10 px-3 py-1.5 text-xs font-medium text-[#8ED8F8] hover:bg-[#5CB8E4]/20 transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Screen Guide</span>
            </button>

            <button
              onClick={replayStory}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:border-white/25 hover:text-white transition cursor-pointer"
              title="Replay GridPulse Story Intro"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Story</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 sm:px-6 py-5">
        {children}
      </main>

      <footer className="no-print border-t border-white/[0.06] bg-[#07080B]/95 px-4 py-2.5 text-[11px] font-mono-num text-slate-500">
        <div className="mx-auto max-w-[1600px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
            <span>
              {manifest?.site.name ?? "Pavagada Ultra Mega Solar Park"} ({manifest?.site.capacity_mw ?? 2050} MW) ·{" "}
              {manifest?.verification.champion_pipeline ?? "Stacking Ridge + M9 Physical Constraints"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>{manifest?.verification.models_evaluated_test ?? 148} Test Evaluations</span>
            <span className="text-[#34D399]">
              {manifest?.verification.pytest_passed ?? 97}/{manifest?.verification.pytest_total ?? 97} Pytest Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
