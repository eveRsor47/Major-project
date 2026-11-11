import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGridStore } from "./store/useGridStore";
import { StoryIntro } from "./components/StoryIntro";
import { ControlRoomShell } from "./components/ControlRoomShell";
import { SpotlightTour } from "./components/SpotlightTour";
import { MissionControl } from "./rooms/MissionControl";
import { NeuralMixer } from "./rooms/NeuralMixer";
import { CloudRadar } from "./rooms/CloudRadar";
import { DigitalTwin } from "./rooms/DigitalTwin";
import { VivaWarRoom } from "./rooms/VivaWarRoom";
import { KsldcCompliance } from "./rooms/KsldcCompliance";

export default function App() {
  const { phase, activeRoom, loadCoreData, loadError } = useGridStore();

  useEffect(() => {
    void loadCoreData();
  }, [loadCoreData]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080B] p-6 text-center">
        <div className="cad-panel rounded-2xl border-red-500/35 max-w-md p-6">
          <h1 className="font-display text-lg font-bold text-red-400">Telemetry Stream Unavailable</h1>
          <p className="mt-2 text-xs text-slate-300">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {phase !== "app" ? (
          <motion.div
            key="story-phase"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
          >
            <StoryIntro />
          </motion.div>
        ) : (
          <motion.div
            key="app-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <ControlRoomShell>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeRoom}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeRoom === "mission-control" && <MissionControl />}
                  {activeRoom === "neural-mixer" && <NeuralMixer />}
                  {activeRoom === "cloud-radar" && <CloudRadar />}
                  {activeRoom === "digital-twin" && <DigitalTwin />}
                  {activeRoom === "viva-war-room" && <VivaWarRoom />}
                  {activeRoom === "ksldc-compliance" && <KsldcCompliance />}
                </motion.div>
              </AnimatePresence>
            </ControlRoomShell>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "app" && <SpotlightTour />}
    </>
  );
}
