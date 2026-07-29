"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface ConfidenceGaugeProps {
  value: number; // 0-1
  label?: string;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

/**
 * Mission-control confidence gauge — animated ring with needle-style indicator.
 * Uses Framer Motion for the arc transition.
 */
export function ConfidenceGauge({
  value,
  label = "CONFIDENCE",
  size = "md",
  showValue = true,
  className,
}: ConfidenceGaugeProps) {
  const sizeMap = {
    sm: { outer: 64, stroke: 4, font: "text-base" },
    md: { outer: 96, stroke: 5, font: "text-xl" },
    lg: { outer: 132, stroke: 6, font: "text-2xl" },
  } as const;
  const { outer, stroke, font } = sizeMap[size];

  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const dashOffset = circumference * (1 - clamped);

  // Color band by confidence
  const color =
    clamped >= 0.85
      ? "#22D3B8"
      : clamped >= 0.7
        ? "#5B8DEF"
        : clamped >= 0.5
          ? "#F5B547"
          : "#F97A47";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: outer, height: outer }}>
        <svg width={outer} height={outer} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="#1B2433"
            strokeWidth={stroke}
          />
          {/* Active ring */}
          <motion.circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {showValue && (
            <div className="flex flex-col items-center leading-none">
              <span
                className={cn(
                  "mono font-semibold tabular-nums",
                  font
                )}
                style={{ color }}
              >
                {(clamped * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </div>
      {label && (
        <span className="text-2xs uppercase tracking-[0.18em] text-ink-tertiary">
          {label}
        </span>
      )}
    </div>
  );
}