"use client";

import { Panel } from "@/components/ui/Panel";
import { WorkflowGraph } from "@/components/workflow/WorkflowGraph";
import { ConfidenceGauge } from "@/components/ui/ConfidenceGauge";
import { useInvestigationStore, selectConfidence } from "@/stores/investigationStore";
import { AGENT_META } from "@/lib/agentMeta";
import { formatPercent } from "@/lib/format";

/**
 * Workflow page — dedicated full-bleed view of the LangGraph state
 * machine so each agent, checkpoint, and escalation node has room to
 * breathe with its labels readable.
 */
export default function WorkflowPage() {
  const confidence = useInvestigationStore(selectConfidence);
  const status = useInvestigationStore((s) => s.state?.status);
  const iteration = useInvestigationStore((s) => s.state?.workflowIteration);
  const maxIterations = useInvestigationStore((s) => s.state?.maxIterations);

  return (
    <div className="h-full w-full overflow-hidden p-2 flex flex-col gap-2">
      {/* Status strip — agent states + confidence */}
      <Panel
        title="LangGraph State Machine"
        subtitle={
          status === "running"
            ? "Workflow executing…"
            : status === "awaiting_approval"
              ? "Awaiting human approval"
              : status === "completed"
                ? "Workflow completed"
                : "Idle"
        }
        className="shrink-0"
        noPadding
      >
        <div className="px-3 py-2 flex items-center gap-4 flex-wrap">
          <ConfidenceGauge value={confidence} label="Confidence" size="sm" />
          <div className="hidden md:flex items-center gap-3">
            {(Object.keys(AGENT_META) as Array<keyof typeof AGENT_META>).map((a) => (
              <AgentCell key={a} agent={a} />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 shrink-0 text-2xs mono text-ink-tertiary">
            <span className="uppercase tracking-wider">ITER</span>
            <span className="text-ink-primary text-sm font-semibold">
              {iteration ?? 0}
            </span>
            <span>/</span>
            <span>{maxIterations ?? 5}</span>
          </div>
        </div>
      </Panel>

      {/* Workflow graph — full bleed */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <WorkflowGraph />
      </div>
    </div>
  );
}

function AgentCell({ agent }: { agent: keyof typeof AGENT_META }) {
  const meta = AGENT_META[agent];
  const confidence = useInvestigationStore(selectConfidence);
  const tinted = Math.max(0.3, confidence);
  const dotColor =
    agent === "sensing"
      ? "#38BDF8"
      : agent === "hydrodynamic"
        ? "#5B8DEF"
        : agent === "regulatory"
          ? "#A78BFA"
          : "#34D399";
  return (
    <div className="flex items-center gap-2 px-2 py-1 border border-line-subtle rounded bg-bg-base/40 min-w-[120px]">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dotColor }}
      />
      <div className="flex flex-col min-w-0">
        <span className="text-2xs mono uppercase tracking-wider text-ink-tertiary">
          {meta.shortLabel}
        </span>
        <span className="text-2xs mono text-ink-secondary">
          {formatPercent(tinted, 0)}
        </span>
      </div>
    </div>
  );
}
