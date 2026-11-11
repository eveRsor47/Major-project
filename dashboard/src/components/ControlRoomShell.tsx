import { useState, type ReactNode } from "react";
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
    <div className="min-h-screen flex flex-col bg-[#060911] cad-grid-bg text-slate-100">
      {/* STICKY COMMAND HEADER */}
      <header className="no-print sticky top-0 z-40 border-b border-cyan-500/20 bg-[#070b15]/92 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Brand + Live Pulse */}
          <div className="flex items-center gap-4">
            <GridPulseLogo mode="header" />
            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono-num text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ZERO-LEAKAGE TELEMETRY</span>
            </div>
          </div>

          {/* 6 Room Navigation Pills */}
          <nav className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
            {ROOM_META.map((room) => {
              const Icon = ROOM_ICONS[room.id];
              const isActive = activeRoom === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => enterRoom(room.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/18 text-cyan-200 border border-cyan-400/60 shadow-[0_0_16px_rgba(6,182,212,0.2)]"
                      : "text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:inline">{room.label}</span>
                  <span className="2xl:hidden">{room.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Utilities: Split Switcher, Quests, SFX, ? Screen Guide, Replay Story */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Test 2026 vs Val 2025 Toggle */}
            <div
              data-tour-id="mc-split-toggle"
              className="inline-flex items-center rounded-lg border border-slate-700/80 bg-slate-900/90 p-0.5 text-[11px] font-mono-num"
            >
              <button
                onClick={() => void setSplit("test_2026")}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  activeSplit === "test_2026"
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Test 2026 (1.4k)
              </button>
              <button
                onClick={() => void setSplit("val_2025")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer ${
                  activeSplit === "val_2025"
                    ? "bg-amber-400 text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {valLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Val 2025 (8.7k)</span>
              </button>
            </div>

            {/* Operator Discovery Quests HUD */}
            <div className="relative">
              <button
                onClick={() => setQuestMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-mono-num text-amber-200 hover:bg-amber-500/20 transition cursor-pointer"
                title="Interactive Operator Exploration Quests"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {questsDoneCount}/4
                </span>
              </button>
              {questMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 cad-panel rounded-xl border-amber-500/40 p-3 shadow-2xl z-50">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-200 mb-2">
                    <span>Operator Verification Quests</span>
                    <span className="font-mono-num">{questsDoneCount}/4</span>
                  </div>
                  <div className="space-y-1.5">
                    {questItems.map((q) => (
                      <button
                        key={q.key}
                        onClick={() => {
                          setQuestMenuOpen(false);
                          enterRoom(q.targetRoom);
                        }}
                        className="w-full text-left flex items-start gap-2 rounded-lg p-1.5 hover:bg-slate-800/70 transition cursor-pointer"
                      >
                        {q.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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

            {/* Sound Toggle */}
            <button
              onClick={toggleSfx}
              aria-label="Toggle UI Sound Effects"
              className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-1.5 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-300 transition cursor-pointer"
              title={sfxEnabled ? "Mute Subtle SFX" : "Enable Subtle SFX"}
            >
              {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* ? Screen Guide (Contextual Tour Trigger) */}
            <button
              onClick={startTourForCurrentRoom}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/45 bg-cyan-500/12 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25 transition cursor-pointer"
              title="Open Interactive Walkthrough for This Screen"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Screen Guide</span>
            </button>

            {/* Replay Story Intro */}
            <button
              onClick={replayStory}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white transition cursor-pointer"
              title="Replay GridPulse Opening Story & d ↔ p Reveal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Story</span>
            </button>
          </div>
        </div>
      </header>

      {/* ACTIVE ROOM CANVAS */}
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-3 sm:px-5 py-4 sm:py-5">
        {children}
      </main>

      {/* PROVENANCE STATUS FOOTER */}
      <footer className="no-print border-t border-slate-800/80 bg-[#060911]/90 px-4 py-2.5 text-[11px] font-mono-num text-slate-400">
        <div className="mx-auto max-w-[1600px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {manifest?.site.name ?? "Pavagada Ultra Mega Solar Park"} ({manifest?.site.capacity_mw ?? 2050} MW) ·{" "}
              {manifest?.verification.champion_pipeline ?? "Stacking Ridge + M9 Physical Constraints"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>{manifest?.verification.models_evaluated_test ?? 148} Test Evaluations</span>
            <span className="text-emerald-400">
              {manifest?.verification.pytest_passed ?? 92}/{manifest?.verification.pytest_total ?? 92} Pytest Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

