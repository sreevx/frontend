"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import {
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

export interface CheckpointNodeData {
  state: "pending" | "active" | "completed";
  decision?: "approved" | "rejected" | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

export function CheckpointNode({ data }: NodeProps<CheckpointNodeData>) {
  const isActive = data.state === "active";
  const isCompleted = data.state === "completed";
  const decision = data.decision;

  return (
    <div
      className={cn(
        "panel relative overflow-hidden w-[240px] border-2",
        isActive && "border-approval shadow-[0_0_0_1px_rgba(229,72,77,0.5),0_0_18px_rgba(229,72,77,0.4)]",
        isCompleted && decision === "approved" && "border-sev-low",
        isCompleted && decision === "rejected" && "border-sev-critical",
        !isActive && !isCompleted && "border-line-subtle opacity-55"
      )}
      style={{
        background: isActive ? "rgba(229,72,77,0.08)" : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-approval !border-approval !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-approval !border-approval !w-2 !h-2"
      />

      {/* Active pulse */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 animate-pulseDot bg-approval/5" />
        </div>
      )}

      <div className="p-3 relative">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "w-6 h-6 rounded flex items-center justify-center shrink-0",
                isActive
                  ? "bg-[rgba(229,72,77,0.18)] border border-approval"
                  : isCompleted && decision === "approved"
                    ? "bg-[rgba(34,211,184,0.18)] border border-sev-low"
                    : isCompleted && decision === "rejected"
                      ? "bg-[rgba(229,72,77,0.18)] border border-sev-critical"
                      : "bg-bg-base border border-line-subtle"
              )}
            >
              <UserCircleIcon
                className={cn(
                  "w-3.5 h-3.5",
                  isActive
                    ? "text-approval"
                    : isCompleted && decision === "approved"
                      ? "text-sev-low"
                      : isCompleted && decision === "rejected"
                        ? "text-sev-critical"
                        : "text-ink-tertiary"
                )}
              />
            </div>
            <div>
              <div
                className={cn(
                  "text-2xs uppercase tracking-[0.16em] font-semibold",
                  isActive
                    ? "text-approval"
                    : decision === "approved"
                      ? "text-sev-low"
                      : decision === "rejected"
                        ? "text-sev-critical"
                        : "text-ink-secondary"
                )}
              >
                HUMAN APPROVAL
              </div>
              <div className="text-[11px] text-ink-secondary font-mono">
                interrupt()
              </div>
            </div>
          </div>
          <StatusBadge state={data.state} decision={decision} />
        </div>

        <p className="text-2xs text-ink-tertiary leading-snug mb-2">
          Hard gate for critical mitigation actions. Swarm pauses until operator decides.
        </p>

        {isCompleted && decision && (
          <div
            className={cn(
              "border-t border-line-subtle pt-2 space-y-1",
              decision === "approved" ? "" : ""
            )}
          >
            <div className="flex items-center gap-1.5 text-2xs mono">
              {decision === "approved" ? (
                <CheckCircleIcon className="w-3 h-3 text-sev-low" />
              ) : (
                <XCircleIcon className="w-3 h-3 text-sev-critical" />
              )}
              <span
                className={
                  decision === "approved" ? "text-sev-low" : "text-sev-critical"
                }
              >
                {decision.toUpperCase()}
              </span>
              {data.decidedAt && (
                <>
                  <ClockIcon className="w-3 h-3 text-ink-tertiary ml-1" />
                  <span className="text-ink-tertiary">{formatTime(data.decidedAt)}</span>
                </>
              )}
            </div>
            {data.decidedBy && (
              <div className="text-2xs mono text-ink-tertiary">
                by <span className="text-ink-secondary">{data.decidedBy}</span>
              </div>
            )}
          </div>
        )}

        {isActive && (
          <div className="border-t border-line-subtle pt-2 text-2xs text-ink-secondary italic">
            Awaiting operator decision…
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  state,
  decision,
}: {
  state: "pending" | "active" | "completed";
  decision?: "approved" | "rejected" | null;
}) {
  if (state === "active") {
    return (
      <span className="chip border-approval text-approval">
        <span className="status-dot status-dot-error" />
        GATE
      </span>
    );
  }
  if (state === "completed" && decision === "approved") {
    return (
      <span className="chip border-sev-low text-sev-low">
        PASS
      </span>
    );
  }
  if (state === "completed" && decision === "rejected") {
    return (
      <span className="chip border-sev-critical text-sev-critical">
        DENY
      </span>
    );
  }
  return (
    <span className="chip text-ink-tertiary">
      IDLE
    </span>
  );
}

export function RepeatNode() {
  return (
    <div className="panel px-3 py-2 min-w-[140px] border border-line-strong">
      <div className="text-2xs uppercase tracking-[0.14em] text-ink-tertiary">
        Confidence Loop
      </div>
      <div className="text-xs text-ink-secondary mt-0.5">
        reconvene sensing
      </div>
    </div>
  );
}