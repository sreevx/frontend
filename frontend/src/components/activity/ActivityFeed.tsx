"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightCircleIcon,
  CheckCircleIcon,
  CpuChipIcon,
  ExclamationCircleIcon,
  EyeIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  ScaleIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/20/solid";
import { Panel } from "@/components/ui/Panel";
import { useInvestigationStore } from "@/stores/investigationStore";
import { AGENT_META, toolLabel } from "@/lib/agentMeta";
import { formatTime, formatDuration, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SSEEvent, AgentName } from "@/types";

export function ActivityFeed() {
  const events = useInvestigationStore((s) => s.events);
  const showAll = useInvestigationStore;

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void showAll;
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [events.length, showAll]);

  const visible = [...events].slice(-80).reverse();

  return (
    <Panel
      title="Activity"
      badge={
        events.length > 0 ? (
          <span className="chip">
            <span className="status-dot status-dot-live" />
            {events.length}
          </span>
        ) : (
          <span className="chip text-ink-tertiary">0</span>
        )
      }
      className="h-full"
      noPadding
    >
      <div
        ref={containerRef}
        className="overflow-y-auto h-full px-1.5 py-1.5 space-y-0.5"
      >
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-ink-tertiary px-4 text-center">
            <EyeIcon className="w-6 h-6 mb-2 opacity-40" />
            <div className="text-xs">Waiting for swarm…</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((ev, idx) => (
              <EventRow key={`${ev.type}-${ev.timestamp}-${idx}`} event={ev} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </Panel>
  );
}

function EventRow({ event }: { event: SSEEvent }) {
  const meta = describe(event);
  const Icon = meta.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2 py-0.5 px-2 rounded-sm hover:bg-bg-overlay/50 transition-colors group"
    >
      <span
        className="shrink-0 w-5 h-5 rounded-sm flex items-center justify-center"
        style={{
          background: `${meta.colorHex}22`,
          color: meta.colorHex,
        }}
      >
        <Icon className="w-3 h-3" />
      </span>
      <span
        className="text-[10px] uppercase tracking-wider font-semibold mono w-16 shrink-0"
        style={{ color: meta.colorHex }}
      >
        {meta.label}
      </span>
      <span className="flex-1 min-w-0 text-[11px] text-ink-secondary truncate">
        {meta.summary}
      </span>
      <span className="text-[10px] mono text-ink-tertiary shrink-0">
        {formatTime(event.timestamp)}
      </span>
    </motion.div>
  );
}

interface EventMeta {
  label: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  colorHex: string;
}

function agentHex(a: AgentName): string {
  return a === "sensing"
    ? "#38BDF8"
    : a === "hydrodynamic"
      ? "#5B8DEF"
      : a === "regulatory"
        ? "#A78BFA"
        : "#34D399";
}

function describe(event: SSEEvent): EventMeta {
  switch (event.type) {
    case "workflow.started":
      return {
        label: "START",
        summary: event.payload.scenarioId,
        icon: PlayCircleIcon,
        colorHex: "#38BDF8",
      };
    case "workflow.completed":
      return {
        label: "DONE",
        summary: event.payload.status,
        icon: CheckCircleIcon,
        colorHex: "#22D3B8",
      };
    case "agent.started":
      return {
        label: AGENT_META[event.payload.agent].shortLabel,
        summary: `iter ${event.payload.iteration}`,
        icon: CpuChipIcon,
        colorHex: agentHex(event.payload.agent),
      };
    case "agent.completed":
      return {
        label: `${AGENT_META[event.payload.agent].shortLabel}✓`,
        summary: `${AGENT_META[event.payload.agent].label} · ${formatDuration(event.payload.durationMs)}`,
        icon: CheckCircleIcon,
        colorHex: "#34D399",
      };
    case "tool.called": {
      const input = event.payload.input;
      const first = Object.entries(input)[0];
      return {
        label: "TOOL",
        summary: first
          ? `${toolLabel(event.payload.tool)} · ${first[0]}:${shortVal(first[1])}`
          : toolLabel(event.payload.tool),
        icon: ArrowRightCircleIcon,
        colorHex: agentHex(event.payload.agent),
      };
    }
    case "tool.completed":
      return {
        label: "TOOL✓",
        summary: `${toolLabel(event.payload.tool)} · ${formatDuration(event.payload.durationMs)}`,
        icon: CheckCircleIcon,
        colorHex: "#34D399",
      };
    case "reasoning.updated":
      return {
        label: "REASON",
        summary: event.payload.step.conclusion.slice(0, 80),
        icon: SparklesIcon,
        colorHex: "#A78BFA",
      };
    case "confidence.updated":
      return {
        label: "CONF",
        summary: `${formatPercent(event.payload.previousConfidence, 0)}→${formatPercent(event.payload.newConfidence, 0)}`,
        icon: ArrowRightCircleIcon,
        colorHex: "#38BDF8",
      };
    case "state.updated":
      return {
        label: "STATE",
        summary: event.payload.changedFields.slice(0, 3).join(", "),
        icon: ArrowRightCircleIcon,
        colorHex: "#9AA7BD",
      };
    case "approval.requested":
      return {
        label: "APPROVE",
        summary: event.payload.recommendation.summary.slice(0, 80),
        icon: ExclamationCircleIcon,
        colorHex: "#E5484D",
      };
    case "simulation.completed":
      return {
        label: "SIM",
        summary: `tick ${event.payload.ticksProcessed}`,
        icon: PauseCircleIcon,
        colorHex: "#5B8DEF",
      };
    default: {
      const _x: never = event;
      void _x;
      return {
        label: "—",
        summary: "",
        icon: ScaleIcon,
        colorHex: "#5E6B82",
      };
    }
  }
}

function shortVal(v: unknown): string {
  if (Array.isArray(v)) return `[${v.slice(0, 2).join(",")}${v.length > 2 ? "…" : ""}]`;
  return String(v).slice(0, 20);
}