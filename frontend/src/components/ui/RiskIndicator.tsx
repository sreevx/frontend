import { cn } from "@/lib/cn";
import { SEVERITY_META } from "@/lib/agentMeta";
import type { SeverityLevel } from "../../types";

interface RiskIndicatorProps {
  severity: SeverityLevel;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
} as const;

const labelSizeClasses = {
  sm: "text-2xs",
  md: "text-xs",
  lg: "text-sm",
} as const;

/**
 * Horizontal risk bar with severity color + level label.
 * Used in the header summary.
 */
export function RiskIndicator({
  severity,
  label,
  size = "md",
  className,
}: RiskIndicatorProps) {
  const meta = SEVERITY_META[severity];
  // Map severity to a fill width (visual progression)
  const widthMap: Record<SeverityLevel, string> = {
    low: "33%",
    moderate: "60%",
    high: "82%",
    critical: "100%",
  };

  return (
    <div className={cn("flex flex-col gap-1 min-w-0", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-2xs uppercase tracking-[0.14em] text-ink-tertiary">
            {label}
          </span>
          <span
            className={cn(
              "mono uppercase tracking-wider font-semibold",
              labelSizeClasses[size]
            )}
            style={{ color: meta.dotClass.replace("bg-", "") }}
          >
            {meta.label}
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-sm bg-bg-overlay overflow-hidden border border-line-subtle",
          sizeClasses[size]
        )}
      >
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{
            width: widthMap[severity],
            background: meta.dotClass.replace("bg-", ""),
            boxShadow: `0 0 8px ${meta.dotClass.replace("bg-", "")}66`,
          }}
        />
      </div>
    </div>
  );
}