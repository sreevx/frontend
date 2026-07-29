"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { ExclamationTriangleIcon, ClockIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

export interface EscalationNodeData {
  state: "pending" | "active" | "completed";
  triggeredAt?: string | null;
  reason?: string | null;
}

export function EscalationNode({ data }: NodeProps<EscalationNodeData>) {
  const isActive = data.state === "active";
  const isCompleted = data.state === "completed";

  return (
    <div
      className={cn(
        "panel relative overflow-hidden w-[240px]",
        "border-2",
        isActive && "border-sev-critical shadow-[0_0_0_1px_rgba(229,72,77,0.5),0_0_18px_rgba(229,72,77,0.4)]",
        isCompleted && "border-sev-critical",
        !isActive && !isCompleted && "border-line-subtle opacity-55"
      )}
      style={{
        background: isActive ? "rgba(229,72,77,0.08)" : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-sev-critical !border-sev-critical !w-2 !h-2"
      />

      {/* Active pulse */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 animate-pulseDot bg-sev-critical/5" />
        </div>
      )}

      <div className="p-3 relative">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "w-6 h-6 rounded flex items-center justify-center shrink-0",
                isActive || isCompleted
                  ? "bg-[rgba(229,72,77,0.18)] border border-sev-critical/60"
                  : "bg-bg-base border border-line-subtle"
              )}
            >
              <ExclamationTriangleIcon
                className={cn(
                  "w-3.5 h-3.5",
                  isActive || isCompleted ? "text-sev-critical" : "text-ink-tertiary"
                )}
              />
            </div>
            <div>
              <div className="text-2xs uppercase tracking-[0.16em] text-sev-critical font-semibold">
                ESCALATION
              </div>
              <div className="text-[11px] text-ink-secondary">
                Manual Review
              </div>
            </div>
          </div>
          <StatusBadge state={data.state} />
        </div>

        <p className="text-2xs text-ink-tertiary leading-snug mb-2">
          Triggered when iteration ≥ max. Operator takes over from autonomous swarm.
        </p>

        {data.triggeredAt && (
          <div className="border-t border-line-subtle pt-2 flex items-center gap-1.5 text-2xs mono">
            <ClockIcon className="w-3 h-3 text-ink-tertiary" />
            <span className="text-ink-tertiary">at</span>
            <span className="text-ink-secondary">{formatTime(data.triggeredAt)}</span>
          </div>
        )}
        {data.reason && (
          <div className="mt-1 text-2xs text-ink-secondary italic line-clamp-2">
            {data.reason}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ state }: { state: "pending" | "active" | "completed" }) {
  if (state === "active") {
    return (
      <span className="chip border-sev-critical text-sev-critical">
        <span className="status-dot status-dot-error" />
        ARMED
      </span>
    );
  }
  if (state === "completed") {
    return (
      <span className="chip border-sev-critical text-sev-critical">
        FIRED
      </span>
    );
  }
  return (
    <span className="chip text-ink-tertiary">
      DORMANT
    </span>
  );
}