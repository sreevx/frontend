"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { AGENT_META } from "@/lib/agentMeta";
import {
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/lib/cn";
import type { AgentName } from "@/types";
import { formatDuration, formatPercent } from "@/lib/format";

export interface AgentNodeData {
  agent: AgentName;
  state: "pending" | "active" | "completed";
  iteration?: number;
  durationMs?: number;
  confidence?: number;
  lastTool?: string | null;
  lastConclusion?: string | null;
  reasoningCount?: number;
  totalReasoning?: number;
}

const HEX: Record<AgentName, string> = {
  sensing: "#38BDF8",
  hydrodynamic: "#5B8DEF",
  regulatory: "#A78BFA",
  mitigation: "#34D399",
};

export function AgentNode({ data }: NodeProps<AgentNodeData>) {
  const meta = AGENT_META[data.agent];
  const color = HEX[data.agent];
  const isActive = data.state === "active";
  const isCompleted = data.state === "completed";
  const isPending = data.state === "pending";

  return (
    <div
      className={cn(
        "panel relative overflow-hidden transition-all",
        "w-[260px]",
        isActive && "shadow-glow-" + data.agent,
        !isActive && !isCompleted && "opacity-55"
      )}
      style={{
        borderTopWidth: 3,
        borderTopColor: isActive
          ? color
          : isCompleted
            ? "#34D399"
            : "#1B2433",
        borderTopStyle: "solid",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-line-strong !border-line-strong !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-line-strong !border-line-strong !w-2 !h-2"
      />

      {/* Active scanline overlay */}
      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute inset-x-0 h-6 animate-scanline"
            style={{
              background: `linear-gradient(180deg, transparent, ${color}22, transparent)`,
            }}
          />
        </div>
      )}

      <div className="p-3 relative">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded flex items-center justify-center shrink-0"
              style={{
                background: `${color}1A`,
                border: `1px solid ${color}55`,
              }}
            >
              <CpuChipIcon
                className="w-3.5 h-3.5"
                style={{ color }}
              />
            </div>
            <div className="min-w-0">
              <div
                className="text-2xs uppercase tracking-[0.16em] font-semibold"
                style={{ color }}
              >
                {meta.shortLabel}
              </div>
              <div className="text-[11px] text-ink-secondary truncate">
                {meta.label}
              </div>
            </div>
          </div>
          <StatusBadge state={data.state} color={color} />
        </div>

        {/* Description */}
        <p className="text-2xs text-ink-tertiary leading-snug mb-3 line-clamp-2">
          {meta.description}
        </p>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <Metric
            label="ITER"
            value={data.iteration != null ? String(data.iteration) : "—"}
          />
          <Metric
            label="TIME"
            value={data.durationMs ? formatDuration(data.durationMs) : isPending ? "—" : "·"}
          />
          <Metric
            label="CONF"
            value={
              typeof data.confidence === "number"
                ? formatPercent(data.confidence, 0)
                : "—"
            }
            valueClass={
              typeof data.confidence === "number"
                ? data.confidence >= 0.85
                  ? "text-sev-low"
                  : data.confidence >= 0.7
                    ? "text-sev-moderate"
                    : "text-sev-high"
                : undefined
            }
          />
        </div>

        {/* Last activity */}
        {(data.lastTool || data.lastConclusion) && (
          <div className="border-t border-line-subtle pt-2 space-y-1">
            {data.lastTool && (
              <div className="flex items-center gap-1.5 text-2xs mono">
                <WrenchScrewdriverIcon className="w-3 h-3 text-ink-tertiary shrink-0" />
                <span className="text-ink-tertiary">last tool</span>
                <span className="text-ink-secondary truncate">{data.lastTool}</span>
              </div>
            )}
            {data.lastConclusion && (
              <div className="flex items-start gap-1.5 text-2xs">
                <SparklesIcon
                  className="w-3 h-3 text-ink-tertiary shrink-0 mt-0.5"
                />
                <span className="text-ink-secondary leading-snug line-clamp-2">
                  {data.lastConclusion}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-bg-base rounded-full overflow-hidden border border-line-subtle">
            <div
              className="h-full transition-all"
              style={{
                width: `${
                  typeof data.confidence === "number"
                    ? data.confidence * 100
                    : isCompleted
                      ? 100
                      : isActive
                        ? 50
                        : 0
                }%`,
                background: color,
                opacity: 0.85,
              }}
            />
          </div>
          <span className="text-2xs mono text-ink-tertiary">
            {data.reasoningCount ?? 0}/{data.totalReasoning ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  state,
  color,
}: {
  state: "pending" | "active" | "completed";
  color: string;
}) {
  if (state === "completed") {
    return (
      <span className="chip" style={{ borderColor: "#34D399", color: "#34D399" }}>
        <CheckCircleIcon className="w-3 h-3" />
        DONE
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="chip"
        style={{ borderColor: color, color }}
      >
        <span
          className="status-dot status-dot-live"
          style={{ background: color }}
        />
        LIVE
      </span>
    );
  }
  return (
    <span className="chip text-ink-tertiary">
      <ClockIcon className="w-3 h-3" />
      QUEUE
    </span>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-line-subtle rounded bg-bg-base/40 px-1.5 py-1">
      <div className="text-[9px] mono uppercase tracking-wider text-ink-tertiary">
        {label}
      </div>
      <div className={cn("text-xs mono font-semibold leading-tight", valueClass ?? "text-ink-primary")}>
        {value}
      </div>
    </div>
  );
}