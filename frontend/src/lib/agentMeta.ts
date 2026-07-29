import type {
  AgentName,
  SeverityLevel,
  WorkflowStatus,
  ApprovalStatus,
  ContaminantType,
} from "../types";

/**
 * Single source of truth for agent presentation.
 * Every component that needs an agent label / color / icon pulls from here.
 */
export const AGENT_META: Record<
  AgentName,
  {
    label: string;
    shortLabel: string;
    description: string;
    color: string;        // tailwind text-* class
    bg: string;           // tailwind bg-* class
    border: string;       // tailwind border-* class
    ring: string;         // ring class for active glow
    shadowClass: string;  // box-shadow utility class
  }
> = {
  sensing: {
    label: "Sensing Agent",
    shortLabel: "SENSING",
    description: "Telemetry, anomalies, initial hypothesis",
    color: "text-agent-sensing",
    bg: "bg-[rgba(56,189,248,0.08)]",
    border: "border-agent-sensing",
    ring: "ring-agent-sensing",
    shadowClass: "shadow-glow-sensing",
  },
  hydrodynamic: {
    label: "Hydrodynamic Reasoning",
    shortLabel: "HYDRO",
    description: "Downstream plume spread, flow modeling",
    color: "text-agent-hydrodynamic",
    bg: "bg-[rgba(91,141,239,0.08)]",
    border: "border-agent-hydrodynamic",
    ring: "ring-agent-hydrodynamic",
    shadowClass: "shadow-glow-hydrodynamic",
  },
  regulatory: {
    label: "Regulatory Compliance",
    shortLabel: "REG",
    description: "Thresholds, permit exceedances, violations",
    color: "text-agent-regulatory",
    bg: "bg-[rgba(167,139,250,0.08)]",
    border: "border-agent-regulatory",
    ring: "ring-agent-regulatory",
    shadowClass: "shadow-glow-regulatory",
  },
  mitigation: {
    label: "Mitigation Planning",
    shortLabel: "MIT",
    description: "Action plan, urgency, approval gate",
    color: "text-agent-mitigation",
    bg: "bg-[rgba(52,211,153,0.08)]",
    border: "border-agent-mitigation",
    ring: "ring-agent-mitigation",
    shadowClass: "shadow-glow-mitigation",
  },
};

/**
 * Canonical agent execution order.
 * Used by swarm visualization, workflow graph, and reasoning chain.
 */
export const AGENT_ORDER: readonly AgentName[] = [
  "sensing",
  "hydrodynamic",
  "regulatory",
  "mitigation",
] as const;

export function agentIndex(a: AgentName): number {
  return AGENT_ORDER.indexOf(a);
}

/**
 * Severity presentation
 */
export const SEVERITY_META: Record<
  SeverityLevel,
  { label: string; chipClass: string; dotClass: string; tint: string }
> = {
  low: {
    label: "LOW",
    chipClass: "chip chip-severity-low",
    dotClass: "bg-sev-low",
    tint: "rgba(34,211,184,0.10)",
  },
  moderate: {
    label: "MODERATE",
    chipClass: "chip chip-severity-moderate",
    dotClass: "bg-sev-moderate",
    tint: "rgba(245,181,71,0.10)",
  },
  high: {
    label: "HIGH",
    chipClass: "chip chip-severity-high",
    dotClass: "bg-sev-high",
    tint: "rgba(249,122,71,0.10)",
  },
  critical: {
    label: "CRITICAL",
    chipClass: "chip chip-severity-critical",
    dotClass: "bg-sev-critical",
    tint: "rgba(229,72,77,0.10)",
  },
};

/**
 * Workflow status presentation
 */
export const WORKFLOW_STATUS_META: Record<
  WorkflowStatus,
  { label: string; dotClass: string; tone: "live" | "idle" | "error" | "approval" }
> = {
  idle: { label: "IDLE", dotClass: "bg-ink-tertiary", tone: "idle" },
  running: { label: "RUNNING", dotClass: "bg-agent-sensing", tone: "live" },
  awaiting_approval: {
    label: "AWAITING APPROVAL",
    dotClass: "bg-sev-moderate",
    tone: "approval",
  },
  escalated: { label: "ESCALATED", dotClass: "bg-sev-critical", tone: "error" },
  completed: { label: "COMPLETED", dotClass: "bg-sev-low", tone: "idle" },
  failed: { label: "FAILED", dotClass: "bg-sev-critical", tone: "error" },
};

/**
 * Approval status presentation
 */
export const APPROVAL_STATUS_META: Record<
  ApprovalStatus,
  { label: string; tone: "live" | "idle" | "error" | "approval" }
> = {
  not_required: { label: "NOT REQUIRED", tone: "idle" },
  pending: { label: "PENDING", tone: "approval" },
  approved: { label: "APPROVED", tone: "live" },
  rejected: { label: "REJECTED", tone: "error" },
  timed_out: { label: "TIMED OUT", tone: "error" },
};

/**
 * Contaminant presentation
 */
export const CONTAMINANT_META: Record<
  ContaminantType,
  { label: string; tint: string }
> = {
  heavy_metal: { label: "Heavy Metal", tint: "rgba(167,139,250,0.20)" },
  industrial_solvent: {
    label: "Industrial Solvent",
    tint: "rgba(249,122,71,0.20)",
  },
  agricultural_runoff: {
    label: "Agricultural Runoff",
    tint: "rgba(34,211,184,0.20)",
  },
  sewage: { label: "Sewage", tint: "rgba(245,181,71,0.20)" },
  unknown: { label: "Unknown", tint: "rgba(154,167,189,0.20)" },
};

/**
 * Human-readable tool name.
 */
export function toolLabel(t: string): string {
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}