"use client";

import { useMemo } from "react";
import { Panel } from "@/components/ui/Panel";
import { DigitalTwin } from "@/components/digitalTwin/DigitalTwin";
import { useInvestigationStore } from "@/stores/investigationStore";
import type { SSEEvent, AgentName } from "@/types";
import { cn } from "@/lib/cn";

export default function DigitalTwinPage() {
  const events = useInvestigationStore((s) => s.events);
  const state = useInvestigationStore((s) => s.state);

  const markers = useMemo(() => {
    if (events.length === 0) return [];
    const first = new Date(events[0].timestamp).getTime();
    const last = new Date(events[events.length - 1].timestamp).getTime();
    const span = Math.max(1, last - first);
    return events.map((ev, i) => {
      const t = new Date(ev.timestamp).getTime();
      const pct = ((t - first) / span) * 100;
      const meta = markerMeta(ev);
      return { ev, pct, meta, key: `${ev.type}-${i}` };
    });
  }, [events]);

  return (
    <div className="h-full w-full overflow-hidden p-2 flex flex-col gap-2">
      {/* Timeline strip */}
      <Panel
        title="Timeline"
        className="shrink-0"
        noPadding
      >
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex-1 relative h-6">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-line-default" />
            {markers.map((m) => (
              <div
                key={m.key}
                className={cn(
                  "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full",
                  m.meta.dotClass
                )}
                style={{ left: `${Math.min(100, Math.max(0, m.pct))}%` }}
                title={m.meta.label}
              />
            ))}
          </div>
          {/* Compact legend */}
          <div className="hidden lg:flex items-center gap-2 pl-2 ml-2 border-l border-line-subtle text-[10px] mono text-ink-tertiary">
            <LegendDot className="bg-agent-sensing" />
            <LegendDot className="bg-agent-hydrodynamic" />
            <LegendDot className="bg-agent-regulatory" />
            <LegendDot className="bg-agent-mitigation" />
            <LegendDot className="bg-sev-critical" />
          </div>
        </div>
      </Panel>

      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <DigitalTwin />
      </div>

      {/* Micro stats footer */}
      {state && (
        <div className="shrink-0 flex items-center gap-1.5 text-[10px] mono text-ink-tertiary">
          <Chip label="NODES" value={state.watershedNetwork?.nodes.length ?? 0} />
          <Chip label="SENSORS" value={state.telemetry.length} />
          <Chip label="FACTORIES" value={state.factories.length} />
          <Chip label="EVENTS" value={events.length} />
          <div className="ml-auto flex items-center gap-1">
            <span className="text-ink-tertiary uppercase tracking-wider">ITER</span>
            <span className="text-ink-primary font-semibold">{state.workflowIteration}</span>
            <span>/{state.maxIterations}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ className }: { className: string }) {
  return <span className={cn("w-1.5 h-1.5 rounded-full", className)} />;
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-1 border border-line-subtle rounded-sm bg-bg-base/40 flex items-center gap-1.5">
      <span className="text-ink-tertiary uppercase tracking-wider">{label}</span>
      <span className="text-ink-primary font-semibold">{value}</span>
    </div>
  );
}

interface MarkerMeta {
  label: string;
  dotClass: string;
}

function markerMeta(ev: SSEEvent): MarkerMeta {
  switch (ev.type) {
    case "agent.started":
    case "agent.completed":
      return { label: `Agent: ${ev.payload.agent}`, dotClass: colorForAgent(ev.payload.agent) };
    case "tool.called":
    case "tool.completed":
      return { label: "Tool", dotClass: "bg-ink-secondary" };
    case "reasoning.updated":
      return { label: "Reasoning", dotClass: "bg-agent-regulatory" };
    case "confidence.updated":
      return { label: "Confidence", dotClass: "bg-agent-sensing" };
    case "simulation.completed":
      return { label: "Simulation", dotClass: "bg-agent-hydrodynamic" };
    case "state.updated":
      return { label: "State", dotClass: "bg-ink-tertiary" };
    case "approval.requested":
      return { label: "Approval", dotClass: "bg-sev-critical" };
    case "workflow.started":
    case "workflow.completed":
      return { label: "Workflow", dotClass: "bg-agent-mitigation" };
    default:
      return { label: "Event", dotClass: "bg-ink-tertiary" };
  }
}

function colorForAgent(agent: AgentName): string {
  switch (agent) {
    case "sensing":
      return "bg-agent-sensing";
    case "hydrodynamic":
      return "bg-agent-hydrodynamic";
    case "regulatory":
      return "bg-agent-regulatory";
    case "mitigation":
      return "bg-agent-mitigation";
    default:
      return "bg-ink-secondary";
  }
}