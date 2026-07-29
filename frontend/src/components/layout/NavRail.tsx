"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Squares2X2Icon,
  MapIcon,
  CpuChipIcon,
  ShareIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Tailwind text color class for the active state */
  accent: string;
  /** Tailwind border color for the left bar */
  borderAccent: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "OPS",
    Icon: Squares2X2Icon,
    accent: "text-agent-sensing",
    borderAccent: "border-agent-sensing",
  },
  {
    href: "/digital-twin",
    label: "Digital Twin",
    shortLabel: "MAP",
    Icon: MapIcon,
    accent: "text-agent-hydrodynamic",
    borderAccent: "border-agent-hydrodynamic",
  },
  {
    href: "/investigation",
    label: "AI Investigation",
    shortLabel: "AI",
    Icon: CpuChipIcon,
    accent: "text-agent-regulatory",
    borderAccent: "border-agent-regulatory",
  },
  {
    href: "/workflow",
    label: "Workflow Graph",
    shortLabel: "GRAF",
    Icon: ShareIcon,
    accent: "text-sev-moderate",
    borderAccent: "border-sev-moderate",
  },
  {
    href: "/reports",
    label: "Reports",
    shortLabel: "RPT",
    Icon: DocumentChartBarIcon,
    accent: "text-agent-mitigation",
    borderAccent: "border-agent-mitigation",
  },
];

/**
 * Left vertical navigation rail. Highlights the active route via
 * usePathname. Collapses gracefully on narrow viewports — icons stay,
 * labels hide below `md`.
 */
export function NavRail() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      className="hidden md:flex flex-col items-stretch w-[68px] shrink-0 border-r border-line-subtle bg-bg-surface/60 backdrop-blur-sm"
      aria-label="Primary navigation"
    >
      {/* Spacer to clear the header visual mass */}
      <div className="h-2" />

      <div className="flex-1 flex flex-col gap-1 px-1.5 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-2.5 rounded-sm transition-colors",
                "border-l-2 border-transparent",
                "hover:bg-bg-raised/60",
                active && cn("bg-bg-raised", item.borderAccent)
              )}
              aria-current={active ? "page" : undefined}
              title={item.label}
            >
              <item.Icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  active ? item.accent : "text-ink-tertiary"
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-mono uppercase tracking-[0.14em] transition-colors",
                  active ? cn("font-semibold", item.accent) : "text-ink-tertiary"
                )}
              >
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer indicator — small brand accent */}
      <div className="px-1.5 py-3 flex justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-agent-sensing animate-pulseDot" />
      </div>
    </nav>
  );
}
