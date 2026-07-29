import type {
  AgentName,
  ReasoningStep,
  SSEEvent,
  WorkflowState,
} from "../types";

/**
 * Reducer: how an SSE event mutates the projected UI state.
 *
 * IMPORTANT: this is purely a UI projection. The backend remains the
 * single source of truth. Reducers here are exhaustive over the SSE
 * discriminated union.
 */
export function applySSEEvent(
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
      return {
        ...state,
        status: state.status === "idle" ? "running" : state.status,
      };

    case "agent.completed":
      return state;

    case "tool.called":
      return state;

    case "tool.completed":
      return state;

    case "reasoning.updated": {
      const step = event.payload.step;
      // Append if not already present
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
      return {
        ...state,
        confidence: event.payload.newConfidence,
      };

    case "state.updated":
      // Backend signals a state change; the store will trigger a
      // targeted re-fetch of GET /api/investigations/:id via the
      // connection layer. The reducer here is a no-op.
      return state;

    case "approval.requested":
      return {
        ...state,
        status: "awaiting_approval",
        recommendation: event.payload.recommendation,
        approvalStatus: "pending",
      };

    case "simulation.completed":
      return state;

    default: {
      // Exhaustiveness check
      const _exhaustive: never = event as never;
      void _exhaustive;
      return state;
    }
  }
}

/**
 * Project which agent is "active", "completed", or "pending"
 * based on the SSE timeline so far.
 *
 * The agent is considered completed if we have an agent.completed event
 * for it after the most recent agent.started. Active if started but not
 * completed. Pending if not yet started.
 */
export function projectSwarmState(
  events: SSEEvent[]
): Record<AgentName, "pending" | "active" | "completed"> {
  const allAgents: AgentName[] = [
    "sensing",
    "hydrodynamic",
    "regulatory",
    "mitigation",
  ];
  const result: Record<AgentName, "pending" | "active" | "completed"> = {
    sensing: "pending",
    hydrodynamic: "pending",
    regulatory: "pending",
    mitigation: "pending",
  };

  for (const ev of events) {
    if (ev.type === "agent.started") {
      result[ev.payload.agent] = "active";
    } else if (ev.type === "agent.completed") {
      result[ev.payload.agent] = "completed";
    }
  }
  // Default any un-touched to pending
  for (const a of allAgents) {
    if (!result[a]) result[a] = "pending";
  }
  return result;
}

/**
 * Get the latest tool call per agent from event history (for the ticker).
 */
export function latestToolCalls(
  events: SSEEvent[]
): Array<{
  callId: string;
  agent: AgentName;
  tool: string;
  status: "called" | "completed";
  timestamp: string;
  durationMs?: number;
}> {
  const calls = new Map<
    string,
    {
      callId: string;
      agent: AgentName;
      tool: string;
      status: "called" | "completed";
      timestamp: string;
      durationMs?: number;
    }
  >();

  for (const ev of events) {
    if (ev.type === "tool.called") {
      const callId = `${ev.payload.agent}-${ev.payload.tool}-${ev.timestamp}`;
      calls.set(callId, {
        callId,
        agent: ev.payload.agent,
        tool: ev.payload.tool,
        status: "called",
        timestamp: ev.timestamp,
      });
    } else if (ev.type === "tool.completed") {
      const callId = `${ev.payload.agent}-${ev.payload.tool}-${ev.timestamp}`;
      calls.set(callId, {
        callId,
        agent: ev.payload.agent,
        tool: ev.payload.tool,
        status: "completed",
        timestamp: ev.timestamp,
        durationMs: ev.payload.durationMs,
      });
    }
  }

  return Array.from(calls.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
}

/**
 * Group reasoning steps by agent, preserving original order.
 */
export function reasoningByAgent(
  steps: ReasoningStep[]
): Record<AgentName, ReasoningStep[]> {
  const result: Record<AgentName, ReasoningStep[]> = {
    sensing: [],
    hydrodynamic: [],
    regulatory: [],
    mitigation: [],
  };
  for (const s of steps) {
    result[s.agent].push(s);
  }
  return result;
}