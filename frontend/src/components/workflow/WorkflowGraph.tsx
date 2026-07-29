"use client";

import { useMemo, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  type NodeTypes,
  MarkerType,
} from "reactflow";
import { Panel } from "@/components/ui/Panel";
import { useInvestigationStore } from "@/stores/investigationStore";
import { AGENT_ORDER, AGENT_META } from "@/lib/agentMeta";
import { AgentNode, type AgentNodeData } from "./AgentNode";
import { EscalationNode } from "./escalationNode";
import { CheckpointNode } from "./checkpointNode";
import { useAgentEnrichment } from "./eventReducers";
import type { AgentName } from "@/types";

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  escalation: EscalationNode,
  checkpoint: CheckpointNode,
};

type AgentState = "pending" | "active" | "completed";

const HEX: Record<AgentName, string> = {
  sensing: "#38BDF8",
  hydrodynamic: "#5B8DEF",
  regulatory: "#A78BFA",
  mitigation: "#34D399",
};

const NODE_WIDTH = 260;
const NODE_HEIGHT = 200;
const NODE_GAP = 90;
const ROW_HEIGHT = 220;

export function WorkflowGraph() {
  const events = useInvestigationStore((s) => s.events);
  const agentTimings = useInvestigationStore((s) => s.agentTimings);
  const status = useInvestigationStore((s) => s.state?.status);
  const approvalStatus = useInvestigationStore((s) => s.state?.approvalStatus);
  const approvalDecidedAt = useInvestigationStore(
    (s) =>
      s.state?.approvalStatus === "approved" || s.state?.approvalStatus === "rejected"
        ? s.state.updatedAt
        : null
  );
  const iteration = useInvestigationStore((s) => s.state?.workflowIteration);
  const maxIterations = useInvestigationStore((s) => s.state?.maxIterations);
  const enrichment = useAgentEnrichment();
  const [, setTick] = useState(0);

  // Pulse once a second to refresh the "active" indicator
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const states = useMemo<Record<AgentName, AgentState>>(() => {
    const result: Record<AgentName, AgentState> = {
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
    return result;
  }, [events]);

  const checkpointState: "pending" | "active" | "completed" =
    status === "awaiting_approval"
      ? "active"
      : approvalStatus === "approved" || approvalStatus === "rejected"
        ? "completed"
        : approvalStatus === "pending"
          ? "active"
          : "pending";

  const checkpointDecision: "approved" | "rejected" | null =
    approvalStatus === "approved"
      ? "approved"
      : approvalStatus === "rejected"
        ? "rejected"
        : null;

  const escalationState: "pending" | "active" | "completed" =
    status === "escalated"
      ? "active"
      : status === "completed" && iteration === maxIterations
        ? "completed"
        : "pending";

  // Layout — main row of agents with checkpoint at the end, escalation
  // node tucked below the early agents.
  const nodes: Node[] = useMemo(() => {
    const totalWidth = 4 * NODE_WIDTH + 3 * NODE_GAP + NODE_WIDTH + NODE_GAP;
    const startX = 60;
    const baseY = 80;

    const agentNodes: Node<AgentNodeData>[] = AGENT_ORDER.map((agent, i) => ({
      id: agent,
      type: "agent",
      position: { x: startX + i * (NODE_WIDTH + NODE_GAP), y: baseY },
      data: {
        agent,
        state: states[agent],
        iteration: agentTimings[agent]?.iteration ?? enrichment[agent].iteration ?? undefined,
        durationMs: agentTimings[agent]?.durationMs,
        confidence: enrichment[agent].confidence ?? undefined,
        lastTool: enrichment[agent].lastTool,
        lastConclusion: enrichment[agent].lastConclusion,
        reasoningCount: enrichment[agent].reasoningCount,
        totalReasoning: enrichment[agent].totalReasoning,
      },
      draggable: false,
    }));

    const checkpoint: Node = {
      id: "checkpoint",
      type: "checkpoint",
      position: {
        x: startX + 4 * (NODE_WIDTH + NODE_GAP),
        y: baseY,
      },
      data: {
        state: checkpointState,
        decision: checkpointDecision,
        decidedBy: null,
        decidedAt: approvalDecidedAt ?? null,
      },
      draggable: false,
    };

    const escalation: Node = {
      id: "escalation",
      type: "escalation",
      position: {
        x: startX + 1.5 * (NODE_WIDTH + NODE_GAP),
        y: baseY + ROW_HEIGHT,
      },
      data: {
        state: escalationState,
        triggeredAt: status === "escalated" ? new Date().toISOString() : null,
        reason: "Reached max iterations without convergence",
      },
      draggable: false,
    };

    return [...agentNodes, checkpoint, escalation];
  }, [states, agentTimings, checkpointState, checkpointDecision, escalationState, enrichment, status, approvalDecidedAt]);

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];

    // Sequential agent chain
    for (let i = 0; i < AGENT_ORDER.length - 1; i++) {
      const from = AGENT_ORDER[i];
      const to = AGENT_ORDER[i + 1];
      const fromState = states[from];
      const toState = states[to];
      result.push({
        id: `${from}->${to}`,
        source: from,
        target: to,
        animated: fromState === "completed" && toState === "active",
        style: {
          stroke: edgeColor(fromState, toState),
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor(fromState, toState),
        },
        type: "smoothstep",
      });
    }

    // Mitigation → checkpoint (approval gate)
    result.push({
      id: "mitigation->checkpoint",
      source: "mitigation",
      target: "checkpoint",
      animated: states.mitigation === "completed" && checkpointState === "active",
      style: {
        stroke: "#E5484D",
        strokeWidth: 2.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#E5484D",
      },
      label: "requiresApproval",
      labelStyle: {
        fill: "#E5484D",
        fontSize: 10,
        fontFamily: "JetBrains Mono",
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: "#0B1018",
        stroke: "#E5484D",
        strokeWidth: 1,
      },
      labelBgPadding: [6, 10],
      type: "smoothstep",
    });

    // Confidence loop back edge (self-loop on sensing, expecting low conf)
    result.push({
      id: "sensing-confidence-loop",
      source: "mitigation",
      target: "sensing",
      style: {
        stroke: "#F5B547",
        strokeWidth: 1.5,
        strokeDasharray: "6 4",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#F5B547",
      },
      label: "confidence < threshold",
      labelStyle: {
        fill: "#F5B547",
        fontSize: 9,
        fontFamily: "JetBrains Mono",
      },
      labelBgStyle: {
        fill: "#0B1018",
        stroke: "#F5B547",
        strokeWidth: 1,
      },
      labelBgPadding: [4, 8],
      type: "smoothstep",
      pathOptions: { offset: 40 },
    });

    // Escalation edge from sensing
    result.push({
      id: "sensing->escalation",
      source: "sensing",
      target: "escalation",
      animated: escalationState === "active",
      style: {
        stroke: "#E5484D",
        strokeWidth: 1.5,
        strokeDasharray: "4 4",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#E5484D",
      },
      label: "iteration ≥ max",
      labelStyle: {
        fill: "#E5484D",
        fontSize: 9,
        fontFamily: "JetBrains Mono",
      },
      labelBgStyle: {
        fill: "#0B1018",
        stroke: "#E5484D",
        strokeWidth: 1,
      },
      labelBgPadding: [4, 8],
      type: "smoothstep",
    });

    // Reject loop back to mitigation
    result.push({
      id: "checkpoint->mitigation",
      source: "checkpoint",
      target: "mitigation",
      style: {
        stroke: "#F5B547",
        strokeWidth: 1.5,
        strokeDasharray: "4 4",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#F5B547",
      },
      label: "rejected → re-plan",
      labelStyle: {
        fill: "#F5B547",
        fontSize: 9,
        fontFamily: "JetBrains Mono",
      },
      labelBgStyle: {
        fill: "#0B1018",
        stroke: "#F5B547",
        strokeWidth: 1,
      },
      labelBgPadding: [4, 8],
      type: "smoothstep",
    });

    return result;
  }, [states, checkpointState, escalationState]);

  return (
    <Panel
      title="LangGraph Workflow"
      subtitle="StateGraph · autonomous swarm pipeline"
      badge={
        <span className="chip">
          ITER {iteration ?? 0} / {maxIterations ?? 5}
        </span>
      }
      className="h-full"
      noPadding
    >
      <div className="h-full grid-bg relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12, includeHiddenNodes: false }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll={true}
          zoomOnPinch={true}
          minZoom={0.5}
          maxZoom={1.6}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#1B2433"
          />
          <Controls
            showInteractive={false}
            className="!bottom-2 !right-2"
          />
        </ReactFlow>

        {/* Legend overlay (top-left) */}
        <div className="absolute top-2 left-2 panel px-3 py-2 text-2xs space-y-1 mono">
          <div className="text-ink-tertiary text-[10px] uppercase tracking-wider mb-1">Legend</div>
          <LegendLine color="#38BDF8" label="active flow" />
          <LegendLine color="#34D399" label="completed" />
          <LegendLine color="#E5484D" label="approval gate" dashed={false} thick />
          <LegendLine color="#F5B547" label="conditional loop" dashed />
          <div className="pt-1 mt-1 border-t border-line-subtle">
            <div className="flex items-center gap-1.5">
              <span className="status-dot status-dot-live" style={{ background: "#38BDF8" }} />
              <span className="text-ink-secondary">active agent</span>
            </div>
          </div>
        </div>

        {/* State summary (top-right) */}
        <div className="absolute top-2 right-2 panel px-3 py-2 text-2xs">
          <div className="text-ink-tertiary text-[10px] uppercase tracking-wider mb-1.5">Swarm</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {AGENT_ORDER.map((a) => (
              <div key={a} className="flex items-center gap-1.5 mono">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: states[a] === "completed" ? "#34D399" : states[a] === "active" ? HEX[a] : "#1B2433",
                  }}
                />
                <span
                  className={
                    states[a] === "completed"
                      ? "text-sev-low"
                      : states[a] === "active"
                        ? "text-ink-primary"
                        : "text-ink-tertiary"
                  }
                >
                  {AGENT_META[a].shortLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function LegendLine({
  color,
  label,
  dashed = false,
  thick = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  thick?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block"
        style={{
          width: 24,
          height: thick ? 2 : 1.5,
          background: dashed ? "transparent" : color,
          backgroundImage: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`
            : undefined,
        }}
      />
      <span className="text-ink-secondary">{label}</span>
    </div>
  );
}

function edgeColor(from: AgentState, to: AgentState): string {
  if (from === "completed" && to === "active") return "#38BDF8";
  if (from === "completed" && to === "completed") return "#34D399";
  return "#263042";
}

// ensure used export
void AGENT_META;
