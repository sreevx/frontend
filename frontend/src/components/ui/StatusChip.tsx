import { cn } from "@/lib/cn";

interface StatusChipProps {
  label: string;
  tone?: "default" | "live" | "idle" | "warning" | "danger" | "success" | "approval";
  pulse?: boolean;
  mono?: boolean;
  className?: string;
}

const toneClasses: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  default: "bg-bg-overlay border-line-default text-ink-secondary",
  live: "bg-[rgba(56,189,248,0.08)] border-agent-sensing/40 text-agent-sensing",
  idle: "bg-bg-overlay border-line-subtle text-ink-tertiary",
  warning: "bg-[rgba(245,181,71,0.08)] border-sev-moderate/40 text-sev-moderate",
  danger: "bg-[rgba(229,72,77,0.08)] border-sev-critical/40 text-sev-critical",
  success: "bg-[rgba(34,211,184,0.08)] border-sev-low/40 text-sev-low",
  approval: "bg-[rgba(229,72,77,0.10)] border-approval/60 text-approval",
};

export function StatusChip({
  label,
  tone = "default",
  pulse = false,
  mono = true,
  className,
}: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-2xs uppercase tracking-wider",
        mono && "font-mono",
        toneClasses[tone],
        className
      )}
    >
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full",
          tone === "live" && "bg-agent-sensing",
          tone === "idle" && "bg-ink-tertiary",
          tone === "warning" && "bg-sev-moderate",
          tone === "danger" && "bg-sev-critical",
          tone === "success" && "bg-sev-low",
          tone === "approval" && "bg-approval",
          tone === "default" && "bg-ink-tertiary",
          pulse && "animate-pulseDot"
        )}
      />
      {label}
    </span>
  );
}