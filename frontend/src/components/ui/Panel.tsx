import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
  style?: CSSProperties;
}

/**
 * Foundational panel — used everywhere. Header is consistent (title + badge/actions),
 * body provides default padding that can be overridden.
 */
export function Panel({
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
  bodyClassName,
  noPadding = false,
  style,
}: PanelProps) {
  return (
    <div className={cn("panel flex flex-col", className)} style={style}>
      {(title || actions || badge) && (
        <div className="panel-header">
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <h3 className="panel-title whitespace-nowrap">{title}</h3>
            )}
            {subtitle && (
              <span className="text-2xs text-ink-tertiary mono truncate">
                {subtitle}
              </span>
            )}
            {badge}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div
        className={cn(
          noPadding ? "" : "panel-body",
          "flex-1 min-h-0",
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}