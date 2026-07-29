import { create } from "zustand";
import type {
  WorkflowState,
  ReasoningStep,
  EvidenceItem,
  AffectedLocation,
  RegulatoryViolation,
  MitigationAction,
  Recommendation,
  ToolCallRecord,
  AgentName,
  SensorReading,
  WatershedNode,
  Factory,
  WeatherSnapshot,
  SSEEvent,
} from "../types";

/**
 * The single investigation store.
 *
 * Holds the projected state that mirrors backend WorkflowState plus an
 * append-only event timeline. Components subscribe to slices; updates
 * are pure (no business logic, only projections of SSE events).
 *
 * The store does NOT compute agent decisions. It only mirrors what
 * the backend reports.
 */

interface AgentTiming {
  agent: AgentName;
  iteration: number;
  durationMs?: number;
  completedAt?: string;
}

interface InvestigationStoreState {
  state: WorkflowState | null;
  events: SSEEvent[];
  agentTimings: Record<AgentName, AgentTiming | undefined>;
  confidenceHistory: Array<{
    timestamp: string;
    value: number;
    agent: AgentName;
  }>;
  selectedNodeId: string | null;
  selectedFactoryId: string | null;

  // Actions
  hydrate: (state: WorkflowState) => void;
  applyEvent: (event: SSEEvent) => void;
  appendEvents: (events: SSEEvent[]) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedFactory: (id: string | null) => void;
  patchState: (patch: Partial<WorkflowState>) => void;
  reset: () => void;
}

export const useInvestigationStore = create<InvestigationStoreState>(
  (set) => ({
    state: null,
    events: [],
    agentTimings: {
      sensing: undefined,
      hydrodynamic: undefined,
      regulatory: undefined,
      mitigation: undefined,
    },
    confidenceHistory: [],
    selectedNodeId: null,
    selectedFactoryId: null,

    hydrate(state) {
      // Seed confidence history from current confidence if we have one
      const history = state.confidence
        ? [
            {
              timestamp: state.updatedAt,
              value: state.confidence,
              agent: "sensing" as AgentName,
            },
          ]
        : [];
      set({
        state,
        events: [],
        agentTimings: {
          sensing: undefined,
          hydrodynamic: undefined,
          regulatory: undefined,
          mitigation: undefined,
        },
        confidenceHistory: history,
      });
    },

    appendEvents(events) {
      set((s) => {
        const existing = new Set(
          s.events.map((e) => `${e.type}|${e.timestamp}`)
        );
        const fresh = events.filter(
          (e) => !existing.has(`${e.type}|${e.timestamp}`)
        );
        for (const ev of fresh) applyEventInternal(ev);
        return { events: [...s.events, ...events] };
      });
    },

    applyEvent(event) {
      set((s) => {
        if (!s.state) return s;
        const next = applySSEToState(s.state, event);
        const nextEvents = [...s.events, event];

        const nextTimings = { ...s.agentTimings };
        if (event.type === "agent.started") {
          nextTimings[event.payload.agent] = {
            agent: event.payload.agent,
            iteration: event.payload.iteration,
          };
        } else if (event.type === "agent.completed") {
          const existing = nextTimings[event.payload.agent];
          nextTimings[event.payload.agent] = {
            agent: event.payload.agent,
            iteration: event.payload.iteration,
            durationMs: event.payload.durationMs,
            completedAt: event.timestamp,
            ...(existing ?? {}),
          };
        }

        let nextConfidenceHistory = s.confidenceHistory;
        if (event.type === "confidence.updated") {
          nextConfidenceHistory = [
            ...s.confidenceHistory,
            {
              timestamp: event.timestamp,
              value: event.payload.newConfidence,
              agent: event.payload.agent,
            },
          ];
        }

        return {
          state: next,
          events: nextEvents,
          agentTimings: nextTimings,
          confidenceHistory: nextConfidenceHistory,
        };
      });
    },

    setSelectedNode(id) {
      set({ selectedNodeId: id });
    },

    setSelectedFactory(id) {
      set({ selectedFactoryId: id });
    },

    patchState(patch) {
      set((s) => (s.state ? { state: { ...s.state, ...patch } } : s));
    },

    reset() {
      set({
        state: null,
        events: [],
        agentTimings: {
          sensing: undefined,
          hydrodynamic: undefined,
          regulatory: undefined,
          mitigation: undefined,
        },
        confidenceHistory: [],
        selectedNodeId: null,
        selectedFactoryId: null,
      });
    },
  })
);

// Internal helpers (file-scoped)
function applyEventInternal(_ev: SSEEvent) {
  // intentionally minimal — full apply happens via applyEvent on the store
  void _ev;
}

function applySSEToState(
  state: WorkflowState,
  event: SSEEvent
): WorkflowState {
  switch (event.type) {
    case "workflow.started":
      return { ...state, status: "running" };
    case "workflow.completed":
      return {
        ...state,
        status: event.payload.status,
        recommendation: event.payload.recommendation ?? state.recommendation,
      };
    case "agent.started":
    case "agent.completed":
    case "tool.called":
    case "tool.completed":
    case "state.updated":
    case "simulation.completed":
      return state;
    case "reasoning.updated": {
      const step = event.payload.step;
      const exists = state.reasoningHistory.some(
        (s) => s.stepId === step.stepId
      );
      if (exists) return state;
      return {
        ...state,
        reasoningHistory: [...state.reasoningHistory, step],
      };
    }
    case "confidence.updated":
      return { ...state, confidence: event.payload.newConfidence };
    case "approval.requested":
      return {
        ...state,
        status: "awaiting_approval",
        approvalStatus: "pending",
        recommendation: event.payload.recommendation,
      };
    default: {
      const _x: never = event as never;
      void _x;
      return state;
    }
  }
}

// ============================================================
// Convenience selectors
// ============================================================

export const selectConfidence = (s: InvestigationStoreState) =>
  s.state?.confidence ?? 0;

export const selectRecommendation = (
  s: InvestigationStoreState
): Recommendation | null => s.state?.recommendation ?? null;

export const selectStatus = (s: InvestigationStoreState) =>
  s.state?.status ?? "idle";

export const selectReasoningSteps = (s: InvestigationStoreState): ReasoningStep[] =>
  s.state?.reasoningHistory ?? [];

export const selectEvidence = (s: InvestigationStoreState): EvidenceItem[] =>
  s.state?.evidence ?? [];

export const selectViolations = (s: InvestigationStoreState): RegulatoryViolation[] =>
  s.state?.violations ?? [];

export const selectAffectedLocations = (s: InvestigationStoreState): AffectedLocation[] =>
  s.state?.affectedLocations ?? [];

export const selectTelemetry = (s: InvestigationStoreState): SensorReading[] =>
  s.state?.telemetry ?? [];

export const selectWatershedNodes = (s: InvestigationStoreState): WatershedNode[] =>
  s.state?.watershedNetwork?.nodes ?? [];

export const selectFactories = (s: InvestigationStoreState): Factory[] =>
  s.state?.factories ?? [];

export const selectWeather = (s: InvestigationStoreState): WeatherSnapshot[] =>
  s.state?.weather ?? [];

export const selectActions = (
  s: InvestigationStoreState
): MitigationAction[] => s.state?.recommendation?.actions ?? [];

export const selectToolHistory = (s: InvestigationStoreState): ToolCallRecord[] =>
  s.state?.toolHistory ?? [];