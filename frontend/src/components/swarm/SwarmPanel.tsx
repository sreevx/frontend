"use client";

import { motion } from "framer-motion";
import { Panel } from "@/components/ui/Panel";
import {
  CheckCircleIcon,
  ChartBarIcon,
  CpuChipIcon,
  ClockIcon,
  ScaleIcon,
  SignalIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/20/solid";
import { useInvestigationStore } from "@/stores/investigationStore";
import { AGENT_META, AGENT_ORDER } from "@/lib/agentMeta";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { AgentName } from "../../types";

type AgentState = "pending" | "active" | "completed";

const agentIcons: Record<
  AgentName,
  React.ComponentType<{ className?: string }>
> = {
  sensing: SignalIcon,
  hydrodynamic: ChartBarIcon,
  regulatory: ScaleIcon,
  mitigation: WrenchScrewdriverIcon,
};

interface AgentTiming {
  agent: AgentName;
  iteration: number;
  durationMs?: number;
}

export function SwarmPanel() {
  const agentTimings = useInvestigationStore((s) => s.agentTimings);
  const events = useInvestigationStore((s) => s.events);

  const states: Record<AgentName, AgentState> = {
    sensing: "pending",
    hydrodynamic: "pending",
    regulatory: "pending",
    mitigation: "pending",
  };

  for (const ev of events) {
    if (ev.type === "agent.started") {
      states[ev.payload.agent] = "active";
    } else if (ev.type === "agent.completed") {
      states[ev.payload.agent] = "completed";
    }
  }

  const activeCount = Object.values(states).filter((s) => s === "active").length;
  const completedCount = Object.values(states).filter((s) => s === "completed").length;

  return (
    <Panel
      title="Specialist Swarm"
      subtitle={`${completedCount}/4 ${activeCount > 0 ? "· running" : ""}`}
      badge={
        activeCount > 0 ? (
          <span className="chip chip-severity-low animate-pulseDot">
            <span className="status-dot status-dot-live" />
            LIVE
          </span>
        ) : completedCount === 4 ? (
          <span className="chip chip-severity-low">DONE</span>
        ) : (
          <span className="chip">IDLE</span>
        )
      }
      className="h-full"
      noPadding
    >
      <div className="p-3 grid grid-cols-2 gap-2 h-full overflow-y-auto">
        {AGENT_ORDER.map((agent) => (
          <AgentCard
            key={agent}
            agent={agent}
            state={states[agent]}
            timing={agentTimings[agent]}
          />
        ))}
      </div>
    </Panel>
  );
}

interface AgentCardProps {
  agent: AgentName;
  state: AgentState;
  timing?: AgentTiming;
}

function AgentCard({ agent, state, timing }: AgentCardProps) {
  const meta = AGENT_META[agent];
  const Icon = agentIcons[agent];

  const isActive = state === "active";
  const isCompleted = state === "completed";

  const activeColor =
    agent === "sensing"
      ? "#38BDF8"
      : agent === "hydrodynamic"
        ? "#5B8DEF"
        : agent === "regulatory"
          ? "#A78BFA"
          : "#34D399";

  return (
    <motion.div
      animate={{ scale: isActive ? 1.02 : 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "panel p-3 relative overflow-hidden flex flex-col gap-2 min-h-[110px]",
        isActive && cn(meta.border, "border", meta.shadowClass),
        isCompleted && "border-line-default",
        !isActive && !isCompleted && "border-line-subtle"
      )}
    >
      {isActive && (
        <motion.div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${activeColor}, transparent)`,
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "w-7 h-7 rounded border flex items-center justify-center shrink-0",
              meta.bg,
              meta.border
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", meta.color)} />
          </div>
          <div className="min-w-0">
            <div className="text-2xs uppercase tracking-[0.14em] text-ink-tertiary">
              {meta.shortLabel}
            </div>
            <div className="text-sm font-medium text-ink-primary truncate">
              {meta.label}
            </div>
          </div>
        </div>
        <AgentStateBadge state={state} />
      </div>

      <div className="text-2xs text-ink-secondary line-clamp-2">
        {meta.description}
      </div>

      <div className="flex items-center justify-between text-2xs mono text-ink-tertiary mt-auto">
        <span className="flex items-center gap-1">
          <CpuChipIcon className="w-3 h-3" />
          iter {timing?.iteration ?? "—"}
        </span>
        {timing?.durationMs ? (
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {formatDuration(timing.durationMs)}
          </span>
        ) : (
          <span>—</span>
        )}
      </div>
    </motion.div>
  );
}

function AgentStateBadge({ state }: { state: AgentState }) {
  if (state === "active") {
    return (
      <span className="chip chip-severity-low animate-pulseDot">
        <span className="status-dot status-dot-live" />
        ACTIVE
      </span>
    );
  }
  if (state === "completed") {
    return (
      <span className="chip">
        <CheckCircleIcon className="w-3 h-3 text-sev-low" />
        DONE
      </span>
    );
  }
  return <span className="chip">PENDING</span>;
}
