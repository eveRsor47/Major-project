import { create } from "zustand";
import type {
  AppPhase,
  BenchmarksPayload,
  ManifestData,
  ProblemId,
  RoomId,
  SplitDataset,
  SplitId,
} from "../types";
import { TOUR_BY_ROOM } from "../utils/metrics";
import { sfx } from "../utils/sfx";

export interface QuestProgress {
  inspectedShock: boolean;
  ranNnlsSolver: boolean;
  toggledHorizon: boolean;
  auditedLeaderboard: boolean;
}

interface GridState {
  phase: AppPhase;
  storyScene: number; // 0..4 (Scenes 1..5)
  activeRoom: RoomId;
  activeProblem: ProblemId;
  activeSplit: SplitId;
  cursorIndex: number;
  isPlaying: boolean;

  manifest: ManifestData | null;
  benchmarks: BenchmarksPayload | null;
  testData: SplitDataset | null;
  valData: SplitDataset | null;
  valLoading: boolean;
  loadStages: string[];
  coreLoaded: boolean;
  loadError: string | null;

  // Onboarding spotlight tour state
  seenRooms: Record<RoomId, boolean>;
  tourActive: boolean;
  tourStepIndex: number;

  // Interactive discovery quests
  quests: QuestProgress;
  sfxEnabled: boolean;

  // Actions
  setPhase: (phase: AppPhase) => void;
  setStoryScene: (scene: number) => void;
  enterRoom: (room: RoomId) => void;
  setProblem: (problem: ProblemId) => void;
  setSplit: (split: SplitId) => Promise<void>;
  setCursorIndex: (idx: number) => void;
  setIsPlaying: (playing: boolean) => void;

  startTourForCurrentRoom: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  skipTour: () => void;
  replayStory: () => void;

  completeQuest: (key: keyof QuestProgress) => void;
  toggleSfx: () => void;
  loadCoreData: () => Promise<void>;
  getActiveDataset: () => SplitDataset | null;
}

const INITIAL_SEEN: Record<RoomId, boolean> = {
  "mission-control": false,
  "neural-mixer": false,
  "cloud-radar": false,
  "digital-twin": false,
  "viva-war-room": false,
  "ksldc-compliance": false,
};

export const useGridStore = create<GridState>((set, get) => ({
  phase: "story",
  storyScene: 0,
  activeRoom: "mission-control",
  activeProblem: "S1",
  activeSplit: "test_2026",
  cursorIndex: 132, // Clear daytime solar peak in Jan 2026
  isPlaying: false,

  manifest: null,
  benchmarks: null,
  testData: null,
  valData: null,
  valLoading: false,
  loadStages: [],
  coreLoaded: false,
  loadError: null,

  seenRooms: { ...INITIAL_SEEN },
  tourActive: false,
  tourStepIndex: 0,

  quests: {
    inspectedShock: false,
    ranNnlsSolver: false,
    toggledHorizon: false,
    auditedLeaderboard: false,
  },
  sfxEnabled: true,

  setPhase: (phase) => {
    set({ phase });
    if (phase === "app") {
      const { activeRoom, seenRooms } = get();
      if (!seenRooms[activeRoom]) {
        set({ tourActive: true, tourStepIndex: 0 });
      }
    }
  },

  setStoryScene: (storyScene) => {
    sfx.playSceneTransition(storyScene);
    set({ storyScene });
  },

  enterRoom: (room) => {
    sfx.playTick(540, 0.05, 0.025);
    const { seenRooms } = get();
    const shouldGuide = !seenRooms[room];
    set({
      activeRoom: room,
      tourActive: shouldGuide,
      tourStepIndex: 0,
    });
  },

  setProblem: (problem) => {
    sfx.playTick(620, 0.04, 0.02);
    set((s) => ({
      activeProblem: problem,
      quests: { ...s.quests, toggledHorizon: true },
    }));
  },

  setSplit: async (split) => {
    sfx.playTick(480, 0.05, 0.025);
    if (split === "val_2025" && !get().valData) {
      set({ activeSplit: split, valLoading: true, cursorIndex: 2500 });
      try {
        const res = await fetch("/data/val_2025.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const valJson = (await res.json()) as SplitDataset;
        set({ valData: valJson, valLoading: false, cursorIndex: 2500 });
      } catch (err) {
        set({
          valLoading: false,
          activeSplit: "test_2026",
          loadError: err instanceof Error ? err.message : "Failed to load Val 2025",
        });
      }
    } else {
      set({
        activeSplit: split,
        cursorIndex: split === "test_2026" ? 132 : 2500,
      });
    }
  },

  setCursorIndex: (idx) => {
    const ds = get().getActiveDataset();
    const maxIdx = ds ? ds.count - 1 : 1392;
    const clamped = Math.max(0, Math.min(maxIdx, idx));
    set({ cursorIndex: clamped });
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  startTourForCurrentRoom: () => {
    sfx.playTick(700, 0.06, 0.03);
    set({ tourActive: true, tourStepIndex: 0 });
  },

  nextTourStep: () => {
    const { activeRoom, tourStepIndex, seenRooms } = get();
    const steps = TOUR_BY_ROOM[activeRoom] ?? [];
    sfx.playTick(680, 0.04, 0.02);
    if (tourStepIndex + 1 >= steps.length) {
      set({
        tourActive: false,
        tourStepIndex: 0,
        seenRooms: { ...seenRooms, [activeRoom]: true },
      });
    } else {
      set({ tourStepIndex: tourStepIndex + 1 });
    }
  },

  prevTourStep: () => {
    const { tourStepIndex } = get();
    if (tourStepIndex > 0) {
      sfx.playTick(520, 0.04, 0.02);
      set({ tourStepIndex: tourStepIndex - 1 });
    }
  },

  skipTour: () => {
    const { activeRoom, seenRooms } = get();
    sfx.playTick(400, 0.05, 0.02);
    set({
      tourActive: false,
      tourStepIndex: 0,
      seenRooms: { ...seenRooms, [activeRoom]: true },
    });
  },

  replayStory: () => {
    sfx.playSceneTransition(0);
    set({
      phase: "story",
      storyScene: 0,
      tourActive: false,
      seenRooms: { ...INITIAL_SEEN },
    });
  },

  completeQuest: (key) =>
    set((s) => ({
      quests: { ...s.quests, [key]: true },
    })),

  toggleSfx: () => {
    const next = !get().sfxEnabled;
    sfx.setEnabled(next);
    if (next) sfx.playTick(740, 0.06, 0.03);
    set({ sfxEnabled: next });
  },

  loadCoreData: async () => {
    if (get().coreLoaded) return;
    try {
      const mRes = await fetch("/data/manifest.json");
      if (!mRes.ok) throw new Error("Failed loading manifest.json");
      const manifest = (await mRes.json()) as ManifestData;
      set((s) => ({ manifest, loadStages: [...s.loadStages, "manifest"] }));

      const bRes = await fetch("/data/benchmarks.json");
      if (!bRes.ok) throw new Error("Failed loading benchmarks.json");
      const benchmarks = (await bRes.json()) as BenchmarksPayload;
      set((s) => ({ benchmarks, loadStages: [...s.loadStages, "benchmarks"] }));

      const tRes = await fetch("/data/test_2026.json");
      if (!tRes.ok) throw new Error("Failed loading test_2026.json");
      const testData = (await tRes.json()) as SplitDataset;
      set((s) => ({
        testData,
        coreLoaded: true,
        loadStages: [...s.loadStages, "test_2026"],
      }));
    } catch (err) {
      set({ loadError: err instanceof Error ? err.message : "Telemetry load failed" });
    }
  },

  getActiveDataset: () => {
    const s = get();
    if (s.activeSplit === "val_2025" && s.valData) return s.valData;
    return s.testData;
  },
}));

