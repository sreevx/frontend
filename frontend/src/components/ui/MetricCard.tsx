import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "critical" | "high" | "moderate" | "low" | "live";
  icon?: ReactNode;
  className?: string;
}

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-ink-primary",
  live: "text-agent-sensing",
  low: "text-sev-low",
  moderate: "text-sev-moderate",
  high: "text-sev-high",
  critical: "text-sev-critical",
};

const toneHintClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "border-line-subtle",
  live: "border-agent-sensing/40",
  low: "border-sev-low/40",
  moderate: "border-sev-moderate/40",
  high: "border-sev-high/40",
  critical: "border-sev-critical/40",
};

export function MetricCard({
  label,
  value,
  unit,
  hint,
  tone = "default",
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "panel px-3 py-2.5 flex flex-col gap-1 min-w-0",
        "border-l-2",
        toneHintClasses[tone],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs uppercase tracking-[0.14em] text-ink-tertiary">
          {label}
        </span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className={cn("text-2xl font-semibold mono tabular-nums truncate", toneClasses[tone])}>
          {value}
        </span>
        {unit && (
          <span className="text-2xs text-ink-tertiary mono">{unit}</span>
        )}
      </div>
      {hint && (
        <div className="text-2xs text-ink-tertiary mono truncate">{hint}</div>
      )}
    </div>
  );
}