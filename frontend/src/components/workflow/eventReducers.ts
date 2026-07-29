"use client";

import { useMemo } from "react";
import { useInvestigationStore } from "@/stores/investigationStore";
import type { AgentName, ReasoningStep, ToolCallRecord } from "@/types";

/**
 * Derive per-agent enrichment data for the WorkflowGraph:
 * - last tool call label
 * - last reasoning conclusion
 * - latest confidence value
 * - reasoning step count vs total
 */
export interface AgentEnrichment {
  lastTool: string | null;
  lastConclusion: string | null;
  confidence: number | null;
  reasoningCount: number;
  totalReasoning: number;
  iteration: number | null;
}

export function useAgentEnrichment(): Record<AgentName, AgentEnrichment> {
  const events = useInvestigationStore((s) => s.events);
  const reasoning = useInvestigationStore((s) => s.state?.reasoningHistory ?? []);
  const toolHistory = useInvestigationStore((s) => s.state?.toolHistory ?? []);
  const confidenceHistory = useInvestigationStore((s) => s.confidenceHistory);

  return useMemo(() => {
    const agents: AgentName[] = ["sensing", "hydrodynamic", "regulatory", "mitigation"];
    const result = {} as Record<AgentName, AgentEnrichment>;

    for (const agent of agents) {
      // Last tool call for this agent
      const agentTools: ToolCallRecord[] = toolHistory.filter(
        (t) => t.agent === agent
      );
      const lastTool = agentTools.length > 0
        ? agentTools[agentTools.length - 1].tool
        : null;

      // Last reasoning conclusion for this agent
      const agentSteps: ReasoningStep[] = reasoning.filter(
        (r) => r.agent === agent
      );
      const lastConclusion = agentSteps.length > 0
        ? agentSteps[agentSteps.length - 1].conclusion
        : null;

      // Latest confidence for this agent
      const agentConf = confidenceHistory.filter((c) => c.agent === agent);
      const confidence = agentConf.length > 0
        ? agentConf[agentConf.length - 1].value
        : null;

      // Last iteration for this agent
      const agentStartedEvents = events.filter(
        (e): e is Extract<typeof e, { type: "agent.started" }> =>
          e.type === "agent.started" && e.payload.agent === agent
      );
      const iteration = agentStartedEvents.length > 0
        ? agentStartedEvents[agentStartedEvents.length - 1].payload.iteration
        : null;

      result[agent] = {
        lastTool,
        lastConclusion,
        confidence,
        reasoningCount: agentSteps.length,
        totalReasoning: reasoning.length,
        iteration,
      };
    }

    return result;
  }, [events, reasoning, toolHistory, confidenceHistory]);
}
