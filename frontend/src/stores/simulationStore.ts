import { create } from "zustand";
import type { ScenarioSummary } from "../types";

interface SimulationStoreState {
  scenarios: ScenarioSummary[];
  selectedScenarioId: string | null;
  isLaunching: boolean;
  isTicking: boolean;
  ticksProcessed: number;
  showScenarioPicker: boolean;

  setScenarios: (scenarios: ScenarioSummary[]) => void;
  selectScenario: (id: string | null) => void;
  setLaunching: (b: boolean) => void;
  setTicking: (b: boolean) => void;
  setShowScenarioPicker: (b: boolean) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStoreState>((set) => ({
  scenarios: [],
  selectedScenarioId: null,
  isLaunching: false,
  isTicking: false,
  ticksProcessed: 0,
  showScenarioPicker: false,

  setScenarios(scenarios) {
    set((s) => {
      const next: Partial<SimulationStoreState> = { scenarios };
      if (scenarios.length > 0 && !s.selectedScenarioId) {
        next.selectedScenarioId = scenarios[0].scenarioId;
      }
      return next;
    });
  },
  selectScenario(id) {
    set({ selectedScenarioId: id });
  },
  setLaunching(b) {
    set({ isLaunching: b });
  },
  setTicking(b) {
    set({ isTicking: b });
  },
  setShowScenarioPicker(b) {
    set({ showScenarioPicker: b });
  },
  reset() {
    set({
      selectedScenarioId: null,
      isLaunching: false,
      isTicking: false,
      ticksProcessed: 0,
      showScenarioPicker: false,
    });
  },
}));