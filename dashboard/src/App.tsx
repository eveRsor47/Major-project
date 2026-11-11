import { useEffect } from "react";
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
      <div className="min-h-screen flex items-center justify-center bg-[#060911] p-6 text-center">
        <div className="cad-panel rounded-2xl border-red-500/40 max-w-md p-6">
          <h1 className="font-display text-lg font-bold text-red-400">Telemetry Stream Unavailable</h1>
          <p className="mt-2 text-xs text-slate-300">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {phase !== "app" && <StoryIntro />}

      {phase === "app" && (
        <ControlRoomShell>
          {activeRoom === "mission-control" && <MissionControl />}
          {activeRoom === "neural-mixer" && <NeuralMixer />}
          {activeRoom === "cloud-radar" && <CloudRadar />}
          {activeRoom === "digital-twin" && <DigitalTwin />}
          {activeRoom === "viva-war-room" && <VivaWarRoom />}
          {activeRoom === "ksldc-compliance" && <KsldcCompliance />}
        </ControlRoomShell>
      )}

      {phase === "app" && <SpotlightTour />}
    </>
  );
}

