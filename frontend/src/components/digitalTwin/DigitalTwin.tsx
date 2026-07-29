"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  useInvestigationStore,
  selectAffectedLocations,
  selectFactories,
  selectTelemetry,
  selectWatershedNodes,
} from "@/stores/investigationStore";
import { projectWatershed } from "@/lib/projection";
import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  BuildingOffice2Icon,
  EyeIcon,
  MapPinIcon,
  SignalIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/lib/cn";
import type {
  AffectedLocation,
  Factory,
  SensorReading,
  WatershedNode,
} from "../../types";
import { SEVERITY_META } from "@/lib/agentMeta";
import { formatConcentration, formatFlow, formatTimeShort } from "@/lib/format";

const VIEWPORT = { width: 800, height: 520 };

interface PlumePath {
  fromNode: string;
  toNode: string;
  path: string;
}

export function DigitalTwin() {
  const nodes = useInvestigationStore(selectWatershedNodes);
  const sensors = useInvestigationStore(selectTelemetry);
  const factories = useInvestigationStore(selectFactories);
  const affected = useInvestigationStore(selectAffectedLocations);
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId);
  const setSelectedNode = useInvestigationStore((s) => s.setSelectedNode);
  const selectedFactoryId = useInvestigationStore((s) => s.selectedFactoryId);
  const setSelectedFactory = useInvestigationStore((s) => s.setSelectedFactory);
  const [showFlow, setShowFlow] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showFactories, setShowFactories] = useState(true);
  const [showPlume, setShowPlume] = useState(true);

  const graph = useMemo(
    () => projectWatershed(nodes, VIEWPORT),
    [nodes]
  );

  // Build plume path from contaminated source node to affected downstream nodes
  const plumePaths = useMemo<PlumePath[]>(() => {
    if (!showPlume) return [];
    // Find the contaminated source: sensor with highest anomaly score
    const topSensor = sensors.reduce<SensorReading | null>(
      (acc, s) => (acc === null || s.anomalyScore > acc.anomalyScore ? s : acc),
      null
    );
    if (!topSensor) return [];

    // Match sensor to nearest node
    const sourceNodeId = nodes.reduce<string | null>((best, n) => {
      if (best === null) return n.nodeId;
      const bestNode = nodes.find((x) => x.nodeId === best);
      if (!bestNode) return n.nodeId;
      const bestDist = dist(bestNode.location, topSensor.location);
      const newDist = dist(n.location, topSensor.location);
      return newDist < bestDist ? n.nodeId : best;
    }, null);
    if (!sourceNodeId) return [];

    return affected
      .map((a) => {
        const from = graph.positions[sourceNodeId];
        const to = graph.positions[a.nodeId];
        if (!from || !to) return null;
        // Build path through connected nodes (simple: direct curve)
        return {
          fromNode: sourceNodeId,
          toNode: a.nodeId,
          path: `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 20} ${to.x} ${to.y}`,
        };
      })
      .filter((p): p is PlumePath => p !== null);
  }, [showPlume, sensors, affected, graph, nodes]);

  const selectedNode = selectedNodeId ? graph.positions[selectedNodeId]?.node : null;
  const selectedFactory = selectedFactoryId
    ? factories.find((f) => f.factoryId === selectedFactoryId)
    : null;

  return (
    <Panel
      title="Digital Twin — Cedar Fork Basin"
      subtitle="Watershed topology · live plume"
      badge={
        affected.length > 0 ? (
          <StatusChip label={`${affected.length} at risk`} tone="warning" pulse />
        ) : (
          <StatusChip label="Monitoring" tone="live" pulse />
        )
      }
      actions={
        <div className="flex items-center gap-1">
          <Button
            variant={showFlow ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFlow((v) => !v)}
            title="Toggle flow lines"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={showPlume ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowPlume((v) => !v)}
            title="Toggle plume"
          >
            <EyeIcon className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" title="Fit view">
            <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      }
      className="h-full"
      noPadding
    >
      <div className="grid grid-cols-[1fr_240px] h-full min-h-0">
        {/* SVG canvas */}
        <div className="relative bg-bg-base grid-bg overflow-hidden">
          <svg
            viewBox={`0 0 ${VIEWPORT.width} ${VIEWPORT.height}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="basin-glow" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="rgba(56,189,248,0.05)" />
                <stop offset="100%" stopColor="rgba(56,189,248,0)" />
              </radialGradient>
              <linearGradient id="river-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1B2433" />
                <stop offset="100%" stopColor="#0B1018" />
              </linearGradient>
              <pattern
                id="grid-dots"
                x="0"
                y="0"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="0" cy="0" r="0.5" fill="#1B2433" />
              </pattern>
            </defs>

            {/* Basin glow */}
            <rect width={VIEWPORT.width} height={VIEWPORT.height} fill="url(#basin-glow)" />
            <rect width={VIEWPORT.width} height={VIEWPORT.height} fill="url(#grid-dots)" opacity={0.5} />

            {/* Compass + scale */}
            <g transform={`translate(${VIEWPORT.width - 60}, 30)`}>
              <circle r="14" fill="#0B1018" stroke="#263042" strokeWidth="1" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fill="#9AA7BD"
                fontFamily="JetBrains Mono"
              >
                N
              </text>
              <text
                x="0"
                y="26"
                textAnchor="middle"
                fontSize="8"
                fill="#5E6B82"
                fontFamily="JetBrains Mono"
              >
                UPSTREAM ↑
              </text>
            </g>

            {/* Flow lines (rivers) */}
            {showFlow &&
              graph.edges.map((e) => {
                const isContaminated =
                  plumePaths.some((p) => p.fromNode === e.from && p.toNode === e.to) ||
                  plumePaths.some(
                    (p) =>
                      (p.fromNode === e.from && p.toNode === e.to) ||
                      isPathOnPlume(e.from, e.to, plumePaths, affected)
                  );
                return (
                  <g key={`${e.from}-${e.to}`}>
                    <path
                      d={e.d}
                      fill="none"
                      stroke={isContaminated ? "#F97A47" : "#263042"}
                      strokeWidth={isContaminated ? 2.5 : 1.5}
                      opacity={isContaminated ? 0.85 : 0.6}
                    />
                    {/* Flow direction chevron */}
                    <circle
                      cx={(e.fromPoint.x + e.toPoint.x) / 2}
                      cy={(e.fromPoint.y + e.toPoint.y) / 2}
                      r="2"
                      fill={isContaminated ? "#F97A47" : "#3A465E"}
                    />
                  </g>
                );
              })}

            {/* Plume paths with animated overlay */}
            {plumePaths.map((p, idx) => {
              const target = affected.find((a) => a.nodeId === p.toNode);
              const sev = target?.severity ?? "low";
              const color = SEVERITY_META[sev].dotClass.replace("bg-", "");
              return (
                <g key={`${p.fromNode}-${p.toNode}-${idx}`}>
                  {/* Wide glow underlay */}
                  <path
                    d={p.path}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.18}
                    strokeWidth={14}
                    strokeLinecap="round"
                  />
                  {/* Core path */}
                  <path
                    d={p.path}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-16"
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              );
            })}

            {/* Watershed nodes */}
            {nodes.map((n) => {
              const pos = graph.positions[n.nodeId];
              if (!pos) return null;
              const isSelected = n.nodeId === selectedNodeId;
              const isAffected = affected.some((a) => a.nodeId === n.nodeId);
              const sensor = sensors.find((s) => {
                const sNode = nodes.reduce<string | null>(
                  (best, nn) => {
                    if (best === null) return nn.nodeId;
                    const bNode = nodes.find((x) => x.nodeId === best);
                    if (!bNode) return nn.nodeId;
                    const d1 = dist(nn.location, s.location);
                    const d2 = dist(bNode.location, s.location);
                    return d1 < d2 ? nn.nodeId : best;
                  },
                  null
                );
                return sNode === n.nodeId;
              });
              const hasAnomaly = sensor && sensor.anomalyScore > 0.4;

              return (
                <g
                  key={n.nodeId}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedNode(isSelected ? null : n.nodeId)}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      r={26}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  )}
                  {/* Affected ring */}
                  {isAffected && (
                    <motion.circle
                      r={22}
                      fill="none"
                      stroke="#F97A47"
                      strokeWidth={1.5}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  {/* Node body */}
                  <NodeShape type={n.type} selected={isSelected} anomaly={hasAnomaly ?? false} />
                  {/* Label */}
                  <g transform="translate(0, 28)">
                    <rect
                      x={-(n.name.length * 3 + 16) / 2}
                      y={-7}
                      width={n.name.length * 3 + 16}
                      height={14}
                      rx={2}
                      fill="#0B1018"
                      stroke="#1B2433"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="9"
                      fill={isAffected ? "#F97A47" : "#E6ECF5"}
                      fontFamily="JetBrains Mono"
                    >
                      {n.nodeId}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Sensors */}
            {showSensors &&
              sensors.map((s) => {
                const nodeId = nodes.reduce<string | null>(
                  (best, n) => {
                    if (best === null) return n.nodeId;
                    const bNode = nodes.find((x) => x.nodeId === best);
                    if (!bNode) return n.nodeId;
                    const d1 = dist(n.location, s.location);
                    const d2 = dist(bNode.location, s.location);
                    return d1 < d2 ? n.nodeId : best;
                  },
                  null
                );
                const pos = nodeId ? graph.positions[nodeId] : null;
                if (!pos) return null;
                // Offset slightly so sensors don't sit on top of node
                const offset = jitterFromId(s.sensorId);
                return (
                  <g
                    key={s.sensorId}
                    transform={`translate(${pos.x + offset.x}, ${pos.y + offset.y})`}
                  >
                    <circle
                      r={s.anomalyScore > 0.7 ? 5 : 3.5}
                      fill={sensorColor(s)}
                      fillOpacity={0.85}
                      stroke="#06090F"
                      strokeWidth={1}
                    />
                    {s.anomalyScore > 0.7 && (
                      <motion.circle
                        r={8}
                        fill="none"
                        stroke={sensorColor(s)}
                        strokeWidth={1}
                        initial={{ opacity: 0.8, scale: 0.8 }}
                        animate={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      />
                    )}
                  </g>
                );
              })}

            {/* Factories */}
            {showFactories &&
              factories.map((f) => {
                const pos = projectionFactory(f, nodes, graph);
                if (!pos) return null;
                const isSelected = f.factoryId === selectedFactoryId;
                const isViolator =
                  f.factoryId ===
                  useInvestigationStore.getState().state?.recommendation?.suspectedFactoryId;
                return (
                  <g
                    key={f.factoryId}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedFactory(isSelected ? null : f.factoryId)
                    }
                  >
                    {isSelected && (
                      <rect
                        x={-14}
                        y={-14}
                        width={28}
                        height={28}
                        fill="none"
                        stroke="#A78BFA"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    )}
                    <rect
                      x={-8}
                      y={-8}
                      width={16}
                      height={16}
                      fill={isViolator ? "#E5484D" : "#161E2C"}
                      stroke={isViolator ? "#F0686D" : "#3A465E"}
                      strokeWidth={1.5}
                    />
                    <text
                      y={-13}
                      textAnchor="middle"
                      fontSize="8"
                      fill={isViolator ? "#F0686D" : "#9AA7BD"}
                      fontFamily="JetBrains Mono"
                    >
                      {f.factoryId}
                    </text>
                  </g>
                );
              })}
          </svg>

          {/* Map legend */}
          <div className="absolute bottom-2 left-2 panel px-2 py-1.5 text-2xs space-y-0.5 mono">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-agent-sensing" />
              <span className="text-ink-secondary">River segment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sev-high" />
              <span className="text-ink-secondary">Affected site</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-sev-critical" />
              <span className="text-ink-secondary">Suspected source</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-sev-high" />
              <span className="text-ink-secondary">Plume path</span>
            </div>
          </div>
        </div>

        {/* Side panel — selected entity detail */}
        <div className="border-l border-line-subtle bg-bg-surface overflow-y-auto">
          <div className="p-3 space-y-3">
            {selectedNode ? (
              <NodeDetail node={selectedNode} />
            ) : selectedFactory ? (
              <FactoryDetail factory={selectedFactory} />
            ) : (
              <div className="text-xs text-ink-tertiary space-y-2">
                <div className="text-2xs uppercase tracking-[0.14em] text-ink-tertiary">
                  Map Controls
                </div>
                <p>Click any watershed node or factory marker to view details.</p>
                <div className="space-y-1 pt-2 border-t border-line-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Flow lines</span>
                    <Toggle on={showFlow} onChange={setShowFlow} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Sensors</span>
                    <Toggle on={showSensors} onChange={setShowSensors} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Factories</span>
                    <Toggle on={showFactories} onChange={setShowFactories} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Plume</span>
                    <Toggle on={showPlume} onChange={setShowPlume} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ============================================================
// Helpers
// ============================================================

function dist(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function sensorColor(s: SensorReading): string {
  if (s.anomalyScore > 0.7) return "#F97A47";
  if (s.anomalyScore > 0.4) return "#F5B547";
  if (s.anomalyScore > 0.2) return "#5BE3CB";
  return "#22D3B8";
}

function jitterFromId(id: string) {
  // deterministic offset based on id so sensors don't overlap
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const angle = (hash & 0xff) / 255 * Math.PI * 2;
  const r = 10 + ((hash >> 8) & 0x0f);
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

function projectionFactory(
  f: Factory,
  nodes: WatershedNode[],
  graph: ReturnType<typeof projectWatershed>
): { x: number; y: number } | null {
  // Snap factory to nearest node + small offset
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const n of nodes) {
    const d = dist(f.location, n.location);
    if (d < bestDist) {
      bestDist = d;
      bestId = n.nodeId;
    }
  }
  const nodePos = bestId ? graph.positions[bestId] : null;
  if (!nodePos) return null;
  // Offset factory in screen space
  const offset = jitterFromId(f.factoryId);
  return { x: nodePos.x + offset.x * 1.5, y: nodePos.y + offset.y * 1.5 };
}

function isPathOnPlume(
  from: string,
  to: string,
  plumes: PlumePath[],
  affected: AffectedLocation[]
): boolean {
  // Any edge touching an affected node is part of the plume spread
  if (affected.some((a) => a.nodeId === to)) return true;
  return plumes.some((p) => (p.fromNode === from && p.toNode === to));
}

interface NodeShapeProps {
  type: WatershedNode["type"];
  selected: boolean;
  anomaly: boolean;
}

function NodeShape({ type, selected, anomaly }: NodeShapeProps) {
  const fill = anomaly ? "#F97A47" : "#1B2433";
  const stroke = selected ? "#38BDF8" : anomaly ? "#F0686D" : "#3A465E";

  switch (type) {
    case "reservoir":
      return (
        <rect x={-10} y={-10} width={20} height={20} fill={fill} stroke={stroke} strokeWidth={1.5} />
      );
    case "estuary":
    case "coastal_outlet":
      return (
        <polygon
          points="0,-10 10,8 -10,8"
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      );
    case "tributary":
      return (
        <circle r={9} fill={fill} stroke={stroke} strokeWidth={1.5} />
      );
    case "river_segment":
    default:
      return (
        <rect x={-8} y={-8} width={16} height={16} fill={fill} stroke={stroke} strokeWidth={1.5} rx={1} />
      );
  }
}

function NodeDetail({ node }: { node: WatershedNode }) {
  const sensors = useInvestigationStore(selectTelemetry);
  const affected = useInvestigationStore(selectAffectedLocations);
  const isAffected = affected.find((a) => a.nodeId === node.nodeId);
  const sensor = sensors.find((s) => {
    // crude nearest-sensor match
    const sNodes = useInvestigationStore.getState().state?.watershedNetwork?.nodes ?? [];
    const matchedId = sNodes.reduce<string | null>((best, n) => {
      if (best === null) return n.nodeId;
      const bNode = sNodes.find((x) => x.nodeId === best);
      if (!bNode) return n.nodeId;
      const d1 = dist(n.location, s.location);
      const d2 = dist(bNode.location, s.location);
      return d1 < d2 ? n.nodeId : best;
    }, null);
    return matchedId === node.nodeId;
  });

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPinIcon className="w-3.5 h-3.5 text-agent-sensing" />
          <span className="mono text-2xs text-ink-tertiary">{node.nodeId}</span>
        </div>
        <span className="chip">{node.type.replace("_", " ")}</span>
      </div>
      <div>
        <div className="text-sm font-medium text-ink-primary">{node.name}</div>
        <div className="text-2xs mono text-ink-tertiary mt-0.5">
          {node.location.lat.toFixed(4)}°, {node.location.lng.toFixed(4)}°
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-2xs uppercase tracking-wider text-ink-tertiary">
            Flow rate
          </div>
          <div className="mono text-ink-primary">{formatFlow(node.flowRateM3s)}</div>
        </div>
        <div>
          <div className="text-2xs uppercase tracking-wider text-ink-tertiary">
            Downstream
          </div>
          <div className="mono text-ink-primary">
            {node.connectedTo.length} nodes
          </div>
        </div>
      </div>
      {sensor && (
        <div className="border-t border-line-subtle pt-2 space-y-1.5">
          <div className="text-2xs uppercase tracking-wider text-ink-tertiary flex items-center gap-1">
            <SignalIcon className="w-3 h-3" />
            Linked Sensor
          </div>
          <div className="text-2xs mono text-ink-secondary truncate">
            {sensor.stationName}
          </div>
          <div className="grid grid-cols-2 gap-1 text-2xs mono">
            <div>
              <span className="text-ink-tertiary">pH </span>
              <span className={sensor.ph < 6.5 ? "text-sev-high" : "text-ink-primary"}>
                {sensor.ph.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-ink-tertiary">TURB </span>
              <span className={sensor.turbidityNTU > 30 ? "text-sev-high" : "text-ink-primary"}>
                {sensor.turbidityNTU.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-ink-tertiary">DO </span>
              <span className={sensor.dissolvedOxygenMgL < 5 ? "text-sev-high" : "text-ink-primary"}>
                {sensor.dissolvedOxygenMgL.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-ink-tertiary">COND </span>
              <span className={sensor.conductivityUsCm > 700 ? "text-sev-high" : "text-ink-primary"}>
                {sensor.conductivityUsCm}
              </span>
            </div>
          </div>
        </div>
      )}
      {isAffected && (
        <div className="border-t border-line-subtle pt-2 space-y-1">
          <div className="text-2xs uppercase tracking-wider text-ink-tertiary">
            Predicted Impact
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-secondary">ETA</span>
            <span className="mono text-ink-primary">
              {formatTimeShort(isAffected.estimatedArrivalTime)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-secondary">Concentration</span>
            <span className="mono text-sev-high">
              {formatConcentration(isAffected.predictedConcentrationMgL)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-secondary">Severity</span>
            <span
              className={cn(
                "mono uppercase font-semibold text-2xs",
                isAffected.severity === "critical" && "text-sev-critical",
                isAffected.severity === "high" && "text-sev-high",
                isAffected.severity === "moderate" && "text-sev-moderate",
                isAffected.severity === "low" && "text-sev-low"
              )}
            >
              {isAffected.severity}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FactoryDetail({ factory }: { factory: Factory }) {
  const violation = useInvestigationStore
    .getState()
    .state?.violations?.find((v) => v.factoryId === factory.factoryId);
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BuildingOffice2Icon className="w-3.5 h-3.5 text-agent-regulatory" />
          <span className="mono text-2xs text-ink-tertiary">
            {factory.factoryId}
          </span>
        </div>
        {violation && <span className="chip chip-severity-high">VIOLATION</span>}
      </div>
      <div>
        <div className="text-sm font-medium text-ink-primary">{factory.name}</div>
        <div className="text-2xs text-ink-tertiary mt-0.5">
          {factory.industryType.replace("_", " ")}
        </div>
      </div>
      <div className="text-2xs mono space-y-1">
        <div className="flex justify-between">
          <span className="text-ink-tertiary">Last inspection</span>
          <span className="text-ink-primary">{factory.lastInspectionDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-tertiary">Compliance flags</span>
          <span
            className={
              factory.complianceHistoryFlags > 0
                ? "text-sev-moderate"
                : "text-ink-primary"
            }
          >
            {factory.complianceHistoryFlags}
          </span>
        </div>
      </div>
      {violation && (
        <div className="border-t border-line-subtle pt-2">
          <div className="text-2xs uppercase tracking-wider text-ink-tertiary">
            Detected Violation
          </div>
          <div className="text-xs text-ink-primary mt-1">
            {violation.contaminant.replace("_", " ")}
          </div>
          <div className="text-2xs mono text-ink-secondary mt-0.5">
            <span className="text-sev-high font-semibold">
              {violation.measuredValueMgL.toFixed(2)} mg/L
            </span>{" "}
            vs limit{" "}
            <span className="text-ink-primary">
              {violation.legalLimitMgL.toFixed(2)} mg/L
            </span>
            {" — "}
            <span className="text-sev-critical">
              {violation.exceedanceFactor.toFixed(1)}x
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
}
function Toggle({ on, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex w-7 h-3.5 rounded-full transition-colors border",
        on
          ? "bg-agent-sensing/30 border-agent-sensing/50"
          : "bg-bg-overlay border-line-default"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full transition-transform",
          on ? "translate-x-3.5 bg-agent-sensing" : "bg-ink-tertiary"
        )}
      />
    </button>
  );
}