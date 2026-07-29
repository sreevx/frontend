"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";

/**
 * Compact sparkline. Renders a smooth path through `data` points
 * normalized to [0..1]. Filled with a tinted gradient.
 */
export function Sparkline({
  data,
  height = 32,
  color = "#38BDF8",
  fill = true,
  className,
}: {
  data: number[];
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
}) {
  const { path, area } = useMemo(() => buildPath(data), [data]);
  const id = useMemo(
    () => `spark-grad-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  if (data.length < 2) {
    return (
      <div
        className={cn("w-full", className)}
        style={{ height }}
        aria-hidden
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildPath(data: number[]) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const w = 100;
  const h = 32;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });
  // Smooth path
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    d += ` Q ${cx} ${y0}, ${cx} ${(y0 + y1) / 2} T ${x1} ${y1}`;
  }
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  return { path: d, area };
}

/**
 * Donut chart with a single value (0..1) and a label in the center.
 */
export function Donut({
  value,
  size = 80,
  strokeWidth = 8,
  color = "#38BDF8",
  trackColor = "#1B2433",
  label,
  sublabel,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 600ms ease-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <div className="text-sm font-mono font-semibold text-ink-primary leading-none">
            {label}
          </div>
        )}
        {sublabel && (
          <div className="text-[9px] uppercase tracking-wider text-ink-tertiary mt-0.5">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact horizontal stacked bar showing segment proportions.
 */
export function MiniStack({
  segments,
  className,
}: {
  segments: Array<{ value: number; color: string; label?: string }>;
  className?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className={cn("w-full h-1.5 bg-bg-base rounded-sm overflow-hidden border border-line-subtle flex", className)}>
      {segments.map((s, i) => (
        <div
          key={i}
          style={{
            width: `${(s.value / total) * 100}%`,
            background: s.color,
            opacity: 0.85,
          }}
          title={s.label ? `${s.label}: ${s.value}` : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Stat tile — used in Dashboard hero.
 */
export function StatTile({
  icon,
  value,
  label,
  hint,
  tone = "neutral",
  className,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  hint?: string;
  tone?: "neutral" | "low" | "moderate" | "high" | "critical";
  className?: string;
}) {
  const toneColor =
    tone === "low"
      ? "#22D3B8"
      : tone === "moderate"
        ? "#F5B547"
        : tone === "high"
          ? "#F97A47"
          : tone === "critical"
            ? "#E5484D"
            : "#9AA7BD";
  return (
    <div
      className={cn(
        "panel relative overflow-hidden p-3 flex flex-col gap-1",
        className
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: toneColor, opacity: 0.7 }}
        aria-hidden
      />
      <div className="flex items-center gap-1.5 text-ink-tertiary">
        <span style={{ color: toneColor }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] mono">
          {label}
        </span>
      </div>
      <div className="text-xl mono font-semibold text-ink-primary leading-tight">
        {value}
      </div>
      {hint && (
        <div className="text-[10px] mono text-ink-tertiary truncate">{hint}</div>
      )}
    </div>
  );
}

/**
 * SeverityBar — wider, color-coded horizontal bar that visually conveys
 * where the current severity sits on a spectrum.
 */
export function SeverityBar({
  severity,
  label,
  className,
}: {
  severity: "low" | "moderate" | "high" | "critical";
  label?: string;
  className?: string;
}) {
  const order = ["low", "moderate", "high", "critical"] as const;
  const idx = order.indexOf(severity);
  const colors = ["#22D3B8", "#F5B547", "#F97A47", "#E5484D"];
  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-2 rounded-sm overflow-hidden border border-line-subtle">
        {colors.map((c, i) => (
          <div
            key={i}
            className="flex-1 relative"
            style={{
              background: c,
              opacity: i === idx ? 1 : 0.18,
            }}
            aria-hidden
          />
        ))}
      </div>
      {label && (
        <div className="mt-1 text-[10px] mono uppercase tracking-wider text-ink-tertiary text-center">
          {label}
        </div>
      )}
    </div>
  );
}