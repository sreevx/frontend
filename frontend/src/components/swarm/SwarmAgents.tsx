"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/Panel";
import {
  SignalIcon,
  ChartBarIcon,
  ScaleIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  CpuChipIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  BoltIcon,
} from "@heroicons/react/20/solid";
import { useInvestigationStore } from "@/stores/investigationStore";
import { AGENT_META, AGENT_ORDER, toolLabel } from "@/lib/agentMeta";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { AgentName, ReasoningStep, ToolCallRecord } from "@/types";

type AgentState = "pending" | "active" | "completed";

const agentIcons: Record<AgentName, React.ComponentType<{ className?: string }>> = {
  sensing: SignalIcon,
  hydrodynamic: ChartBarIcon,
  regulatory: ScaleIcon,
  mitigation: WrenchScrewdriverIcon,
};

const AGENT_HEX: Record<AgentName, string> = {
  sensing: "#38BDF8",
  hydrodynamic: "#5B8DEF",
  regulatory: "#A78BFA",
  mitigation: "#34D399",
};

/** Build a hex polygon path centered at (cx, cy) with radius r, pointy-top. */
function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * r * Math.sin(a) / r}`.replace(/[\d.-]+$/, ""));
  }
  return pts.join(" ");
}

function hexPolygon(cx: number, cy: number, r: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

export function SwarmAgents() {
  const events = useInvestigationStore((s) => s.events);
  const agentTimings = useInvestigationStore((s) => s.agentTimings);
  const reasoning = useInvestigationStore((s) => s.state?.reasoningHistory ?? []);
  const toolHistory = useInvestigationStore((s) => s.state?.toolHistory ?? []);

  const states: Record<AgentName, AgentState> = {
    sensing: "pending",
    hydrodynamic: "pending",
    regulatory: "pending",
    mitigation: "pending",
  };
  for (const ev of events) {
    if (ev.type === "agent.started") states[ev.payload.agent] = "active";
    else if (ev.type === "agent.completed") states[ev.payload.agent] = "completed";
  }

  const activeCount = Object.values(states).filter((s) => s === "active").length;
  const completedCount = Object.values(states).filter((s) => s === "completed").length;
  const activeAgent = AGENT_ORDER.find((a) => states[a] === "active") ?? null;

  return (
    <Panel
      title="Specialist Swarm"
      subtitle={`${completedCount}/4 agents · ${AGENT_ORDER.length}-stage pipeline`}
      badge={
        activeCount > 0 ? (
          <span className="chip chip-severity-low animate-pulseDot">
            <span className="status-dot status-dot-live" />
            LIVE
          </span>
        ) : completedCount === 4 ? (
          <span className="chip chip-severity-low">
            <CheckCircleIcon className="w-3 h-3" />
            DONE
          </span>
        ) : (
          <span className="chip">IDLE</span>
        )
      }
      className="h-full"
      noPadding
    >
      <div className="p-3 flex flex-col gap-2 h-full">
        {/* Pipeline canvas — hex flow diagram */}
        <div className="relative shrink-0">
          <HexPipeline activeAgent={activeAgent} states={states} />
        </div>

        {/* Per-agent detail strip */}
        <div className="flex-1 min-h-0 grid grid-cols-4 gap-2">
          {AGENT_ORDER.map((agent) => (
            <AgentCell
              key={agent}
              agent={agent}
              state={states[agent]}
              timing={agentTimings[agent]}
              latestReasoning={latestReasoningFor(agent, reasoning)}
              latestTool={latestToolFor(agent, toolHistory)}
              isActive={states[agent] === "active"}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ============================================================
// Hexagonal pipeline canvas
// ============================================================

interface HexPipelineProps {
  activeAgent: AgentName | null;
  states: Record<AgentName, AgentState>;
}

function HexPipeline({ activeAgent, states }: HexPipelineProps) {
  const W = 520;
  const H = 110;
  const hexR = 26;
  const hexGap = 88; // horizontal distance between hex centers
  const startX = 38;
  const cy = H / 2;

  const hexPositions = AGENT_ORDER.map((agent, i) => ({
    agent,
    cx: startX + i * hexGap,
    cy,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-[110px]"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Connecting flow lines between hexes */}
      {hexPositions.slice(0, -1).map((p, i) => {
        const next = hexPositions[i + 1];
        const x1 = p.cx + hexR * Math.cos(0);
        const y1 = p.cy;
        const x2 = next.cx + hexR * Math.cos(Math.PI);
        const y2 = next.cy;
        const fromCompleted = states[p.agent] === "completed";
        const isActiveEdge = states[p.agent] === "active";
        return (
          <g key={`edge-${p.agent}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isActiveEdge ? AGENT_HEX[p.agent] : fromCompleted ? "#263042" : "#1B2433"}
              strokeWidth={isActiveEdge ? 2 : 1.5}
              strokeDasharray={isActiveEdge ? "6 3" : "none"}
              opacity={isActiveEdge ? 1 : fromCompleted ? 0.85 : 0.5}
            />
            {isActiveEdge && (
              <motion.circle
                r={3}
                fill={AGENT_HEX[p.agent]}
                animate={{
                  cx: [x1, x2],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </g>
        );
      })}

      {/* Hex nodes */}
      {hexPositions.map(({ agent, cx, cy }) => {
        const state = states[agent];
        const color = AGENT_HEX[agent];
        const meta = AGENT_META[agent];
        const Icon = agentIcons[agent];
        const isActive = state === "active";
        const isCompleted = state === "completed";
        const pts = hexPolygon(cx, cy, hexR);
        const pointsAttr = pts.map((p) => `${p.x},${p.y}`).join(" ");

        return (
          <g key={agent} transform={`translate(${cx}, ${cy})`}>
            {/* Outer glow ring when active */}
            {isActive && (
              <motion.polygon
                points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                initial={{ opacity: 0.4, scale: 0.9 }}
                animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.9, 1.1, 0.9] }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
            {/* Hex body */}
            <polygon
              points={pointsAttr}
              fill={
                isCompleted
                  ? `${color}26`
                  : isActive
                    ? `${color}40`
                    : "#0F1623"
              }
              stroke={
                isActive
                  ? color
                  : isCompleted
                    ? `${color}99`
                    : "#263042"
              }
              strokeWidth={isActive ? 2 : 1.5}
            />
            {/* Hex inner hex for depth */}
            <polygon
              points={hexPolygon(0, 0, hexR - 6)
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill="none"
              stroke={isActive ? color : "#1B2433"}
              strokeWidth={0.5}
              opacity={0.6}
            />
            {/* Icon (foreignObject for sharp rendering) */}
            <foreignObject x={-12} y={-12} width={24} height={24}>
              <div
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-sm",
                  isActive && "animate-pulseDot"
                )}
                style={{
                  background: `${color}1A`,
                  color,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </foreignObject>
            {/* Short label below hex */}
            <text
              y={hexR + 12}
              textAnchor="middle"
              fontSize="9"
              fontFamily="JetBrains Mono"
              fill={isActive ? color : isCompleted ? "#E6ECF5" : "#5E6B82"}
              fontWeight={isActive ? 600 : 400}
              style={{ letterSpacing: "0.06em" }}
            >
              {meta.shortLabel}
            </text>
            {/* State dot above */}
            <circle
              cx={0}
              cy={-hexR - 6}
              r={2.5}
              fill={
                isActive ? color : isCompleted ? "#22D3B8" : "#3A465E"
              }
            >
              {isActive && (
                <animate
                  attributeName="opacity"
                  values="0.5;1;0.5"
                  dur="1.4s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </g>
        );
      })}

      {/* Source label on left, sink label on right */}
      <text x={startX - 30} y={H / 2} fontSize="8" fill="#5E6B82" fontFamily="JetBrains Mono" textAnchor="end">
        INTAKE
      </text>
      <text
        x={startX + (AGENT_ORDER.length - 1) * hexGap + 30}
        y={H / 2}
        fontSize="8"
        fill="#5E6B82"
        fontFamily="JetBrains Mono"
      >
        ACTION
      </text>
    </svg>
  );
}

// ============================================================
// Agent detail cell
// ============================================================

interface AgentCellProps {
  agent: AgentName;
  state: AgentState;
  timing?: { agent: AgentName; iteration: number; durationMs?: number };
  latestReasoning?: ReasoningStep;
  latestTool?: ToolCallRecord;
  isActive: boolean;
}

function AgentCell({
  agent,
  state,
  timing,
  latestReasoning,
  latestTool,
  isActive,
}: AgentCellProps) {
  const meta = AGENT_META[agent];
  const Icon = agentIcons[agent];
  const color = AGENT_HEX[agent];

  const confidence = latestReasoning?.confidenceAfter;

  return (
    <motion.div
      animate={{ scale: isActive ? 1.02 : 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative panel p-2 flex flex-col gap-1.5 min-h-0 overflow-hidden",
        isActive && "border",
        !isActive && "border-line-subtle"
      )}
      style={{
        borderColor: isActive ? color : undefined,
        boxShadow: isActive ? `0 0 12px ${color}33` : undefined,
      }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}

      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <div
            className="w-5 h-5 rounded-sm flex items-center justify-center shrink-0"
            style={{ background: `${color}1A`, color }}
          >
            <Icon className="w-3 h-3" />
          </div>
          <span
            className="text-[10px] mono uppercase tracking-wider truncate"
            style={{ color: isActive || state === "completed" ? color : "#5E6B82" }}
          >
            {meta.shortLabel}
          </span>
        </div>
        <StateMark state={state} color={color} />
      </div>

      <div className="text-[10px] mono text-ink-tertiary leading-tight truncate">
        {meta.description}
      </div>

      {/* Confidence bar (when reasoning exists) */}
      {typeof confidence === "number" && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[9px] mono">
            <span className="text-ink-tertiary">CONF</span>
            <span className="text-ink-primary font-semibold">
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <div className="h-1 bg-bg-base rounded-sm overflow-hidden border border-line-subtle">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidence * 100}%` }}
              transition={{ duration: 0.4 }}
              className="h-full"
              style={{ background: color }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[9px] mono text-ink-tertiary mt-auto">
        <span className="flex items-center gap-0.5">
          <CpuChipIcon className="w-2.5 h-2.5" />
          {timing?.iteration ?? "—"}
        </span>
        {timing?.durationMs ? (
          <span className="flex items-center gap-0.5">
            <BoltIcon className="w-2.5 h-2.5" />
            {formatDuration(timing.durationMs)}
          </span>
        ) : latestTool ? (
          <span className="flex items-center gap-0.5 truncate ml-1">
            <ArrowPathIcon className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{toolLabel(latestTool.tool)}</span>
          </span>
        ) : (
          <span>—</span>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Helpers
// ============================================================

function StateMark({ state, color }: { state: AgentState; color: string }) {
  if (state === "active") {
    return (
      <span
        className="chip text-[9px] animate-pulseDot"
        style={{ background: `${color}1A`, borderColor: `${color}55`, color }}
      >
        RUN
      </span>
    );
  }
  if (state === "completed") {
    return (
      <span className="chip text-[9px] chip-severity-low">
        <CheckCircleIcon className="w-2.5 h-2.5" />
        OK
      </span>
    );
  }
  return <span className="chip text-[9px]">WAIT</span>;
}

function latestReasoningFor(
  agent: AgentName,
  reasoning: ReasoningStep[]
): ReasoningStep | undefined {
  // Walk backward to find latest step from this agent
  for (let i = reasoning.length - 1; i >= 0; i--) {
    if (reasoning[i].agent === agent) return reasoning[i];
  }
  return undefined;
}

function latestToolFor(
  agent: AgentName,
  tools: ToolCallRecord[]
): ToolCallRecord | undefined {
  for (let i = tools.length - 1; i >= 0; i--) {
    if (tools[i].agent === agent) return tools[i];
  }
  return undefined;
}

// avoid unused-warning
void ArrowRightIcon;
void hexPath;
