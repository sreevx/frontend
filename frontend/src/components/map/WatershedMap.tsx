"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  useInvestigationStore,
  selectAffectedLocations,
  selectFactories,
  selectTelemetry,
  selectWatershedNodes,
} from "@/stores/investigationStore";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { SEVERITY_META } from "@/lib/agentMeta";
import { cn } from "@/lib/cn";
import {
  ArrowPathIcon,
  EyeIcon,
  MapPinIcon,
  SignalIcon,
} from "@heroicons/react/20/solid";

const VIEW = { w: 1000, h: 640 };

// Geographic bounds (Cedar Fork Basin)
const BOUNDS = {
  minLat: 37.388,
  maxLat: 37.452,
  minLng: -122.180,
  maxLng: -122.108,
};

// Hand-tuned named places for cartographic context
const NAMED_PLACES: Array<{
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
  size?: "lg" | "md" | "sm";
}> = [
  { label: "San Francisco Bay", lat: 37.402, lng: -122.108, size: "md" },
  { label: "Cedar Fork Basin", lat: 37.435, lng: -122.165, size: "md" },
  { label: "Palo Alto", lat: 37.444, lng: -122.143, size: "sm" },
  { label: "Menlo Park", lat: 37.454, lng: -122.182, size: "sm" },
  { label: "Redwood City", lat: 37.485, lng: -122.236, size: "sm" },
  { label: "Industrial Corridor", lat: 37.418, lng: -122.139, size: "sm" },
];

// Hand-tuned contour polyline (closed shape) outlining the watershed
const CONTOUR_RING: Array<[number, number]> = [
  [37.452, -122.176],
  [37.448, -122.158],
  [37.444, -122.142],
  [37.436, -122.128],
  [37.428, -122.118],
  [37.412, -122.115],
  [37.398, -122.122],
  [37.390, -122.135],
  [37.392, -122.155],
  [37.402, -122.172],
  [37.422, -122.180],
  [37.442, -122.180],
];

// Roads (hand-drawn polylines in lat/lng) — major roads only
const ROADS: Array<{ id: string; label?: string; pts: Array<[number, number]>; cls: "hwy" | "primary" | "secondary" }> = [
  {
    id: "US-101",
    label: "US 101",
    cls: "hwy",
    pts: [
      [37.453, -122.176],
      [37.435, -122.150],
      [37.420, -122.130],
      [37.405, -122.118],
      [37.395, -122.110],
    ],
  },
  {
    id: "EL-CAM",
    label: "El Camino Real",
    cls: "primary",
    pts: [
      [37.452, -122.166],
      [37.430, -122.150],
      [37.418, -122.140],
      [37.404, -122.130],
      [37.395, -122.122],
    ],
  },
  {
    id: "PAGE-MILL",
    label: "Page Mill Rd",
    cls: "secondary",
    pts: [
      [37.422, -122.180],
      [37.420, -122.155],
      [37.419, -122.130],
      [37.418, -122.118],
    ],
  },
  {
    id: "SANDHILL",
    label: "Sand Hill Rd",
    cls: "secondary",
    pts: [
      [37.448, -122.180],
      [37.435, -122.158],
      [37.420, -122.140],
    ],
  },
];

// Pre-built contour polylines (closed rings) for the basin terrain shading.
// Hand-tuned in screen-space proportions for the projection to look natural.
const TERRAIN_RIBS: Array<Array<[number, number]>> = [
  // Inner-most ring (highest elevation)
  [
    [37.445, -122.166],
    [37.443, -122.155],
    [37.439, -122.146],
    [37.434, -122.140],
    [37.427, -122.135],
    [37.420, -122.132],
    [37.412, -122.135],
    [37.407, -122.142],
    [37.405, -122.152],
    [37.408, -122.162],
    [37.416, -122.170],
    [37.428, -122.172],
    [37.439, -122.172],
    [37.445, -122.166],
  ],
  // Middle ring
  [
    [37.450, -122.171],
    [37.448, -122.155],
    [37.443, -122.142],
    [37.435, -122.132],
    [37.424, -122.125],
    [37.412, -122.124],
    [37.402, -122.130],
    [37.395, -122.140],
    [37.394, -122.155],
    [37.400, -122.168],
    [37.414, -122.178],
    [37.430, -122.180],
    [37.448, -122.180],
    [37.450, -122.171],
  ],
];

export function WatershedMap() {
  const nodes = useInvestigationStore(selectWatershedNodes);
  const sensors = useInvestigationStore(selectTelemetry);
  const factories = useInvestigationStore(selectFactories);
  const affected = useInvestigationStore(selectAffectedLocations);
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId);
  const setSelectedNode = useInvestigationStore((s) => s.setSelectedNode);
  const selectedFactoryId = useInvestigationStore((s) => s.selectedFactoryId);
  const setSelectedFactory = useInvestigationStore((s) => s.setSelectedFactory);
  const [showPlume, setShowPlume] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showFactories, setShowFactories] = useState(true);

  // Project lat/lng → screen space (simple linear, good enough for basin-scale map)
  const project = useMemo(() => {
    return (lat: number, lng: number): { x: number; y: number } => {
      const x =
        ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * VIEW.w;
      const y =
        ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEW.h;
      return { x, y };
    };
  }, []);

  // Plume paths
  const plumePaths = useMemo(() => {
    if (!showPlume) return [];
    const topSensor = sensors.reduce<typeof sensors[number] | null>(
      (acc, s) => (acc === null || s.anomalyScore > acc.anomalyScore ? s : acc),
      null
    );
    if (!topSensor) return [];
    const sourceNodeId = nodes.reduce<string | null>((best, n) => {
      if (best === null) return n.nodeId;
      const bNode = nodes.find((x) => x.nodeId === best);
      if (!bNode) return n.nodeId;
      const d1 = dist(n.location, topSensor.location);
      const d2 = dist(bNode.location, topSensor.location);
      return d1 < d2 ? n.nodeId : best;
    }, null);
    if (!sourceNodeId) return [];
    return affected
      .map((a) => {
        const from = project(nodes.find((n) => n.nodeId === sourceNodeId)!.location.lat, nodes.find((n) => n.nodeId === sourceNodeId)!.location.lng);
        const to = project(a.location.lat, a.location.lng);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        // Curve with one control point
        const cx = (from.x + to.x) / 2;
        const cy = (from.y + to.y) / 2 - Math.sqrt(dx * dx + dy * dy) * 0.18;
        return {
          fromNode: sourceNodeId,
          toNode: a.nodeId,
          path: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [showPlume, sensors, affected, nodes, project]);

  // Edge map for downstream tracing
  const edgeMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const n of nodes) {
      for (const t of n.connectedTo) {
        if (!map.has(n.nodeId)) map.set(n.nodeId, []);
        map.get(n.nodeId)!.push(t);
      }
    }
    return map;
  }, [nodes]);

  // River segments as curved lines connecting nodes
  const riverPaths = useMemo(() => {
    const paths: { id: string; d: string; contaminated: boolean }[] = [];
    for (const [from, targets] of edgeMap.entries()) {
      const fromNode = nodes.find((n) => n.nodeId === from);
      if (!fromNode) continue;
      for (const to of targets) {
        const toNode = nodes.find((n) => n.nodeId === to);
        if (!toNode) continue;
        const a = project(fromNode.location.lat, fromNode.location.lng);
        const b = project(toNode.location.lat, toNode.location.lng);
        const isContaminated =
          affected.some((af) => af.nodeId === to) ||
          plumePaths.some(
            (p) => p.fromNode === from && p.toNode === to
          );
        // Slight bezier curve based on perpendicular offset
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ox = -dy / len;
        const oy = dx / len;
        const off = Math.min(20, len * 0.12);
        paths.push({
          id: `${from}-${to}`,
          d: `M ${a.x} ${a.y} Q ${mx + ox * off} ${my + oy * off} ${b.x} ${b.y}`,
          contaminated: isContaminated,
        });
      }
    }
    return paths;
  }, [edgeMap, nodes, affected, plumePaths, project]);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.nodeId === selectedNodeId)
    : null;
  const selectedFactory = selectedFactoryId
    ? factories.find((f) => f.factoryId === selectedFactoryId)
    : null;

  return (
    <Panel
      title="Cedar Fork Basin"
      subtitle="Real-time watershed map"
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
            variant={showPlume ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowPlume((v) => !v)}
            title="Toggle plume"
          >
            <EyeIcon className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={showSensors ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowSensors((v) => !v)}
            title="Toggle sensors"
          >
            <SignalIcon className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={showFactories ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowFactories((v) => !v)}
            title="Toggle facilities"
          >
            <MapPinIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      }
      className="h-full"
      noPadding
    >
      <div className="relative h-full bg-bg-base overflow-hidden">
        <svg
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Topographic shading */}
            <radialGradient id="basin-fill" cx="45%" cy="48%" r="62%">
              <stop offset="0%" stopColor="#1B2A1B" stopOpacity="0.6" />
              <stop offset="55%" stopColor="#15241B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0B1018" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="urban-fill" cx="78%" cy="78%" r="32%">
              <stop offset="0%" stopColor="#3A465E" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#3A465E" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="water-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1E6E94" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="plume-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F97A47" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#E5484D" stopOpacity="0.7" />
            </linearGradient>
            {/* Grid pattern (lat/lng faint grid) */}
            <pattern
              id="latlng-grid"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1B2433" strokeWidth="0.4" opacity="0.35" />
            </pattern>
            {/* Tree stippling pattern (parks / open space) */}
            <pattern
              id="parks"
              x="0"
              y="0"
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="7" cy="7" r="0.7" fill="#22D3B8" opacity="0.15" />
              <circle cx="2" cy="11" r="0.5" fill="#22D3B8" opacity="0.10" />
              <circle cx="11" cy="3" r="0.6" fill="#22D3B8" opacity="0.12" />
            </pattern>
            {/* Drop shadow filter for labels */}
            <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
              <feOffset dx="0" dy="1" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.7" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Base canvas — dark navy */}
          <rect width={VIEW.w} height={VIEW.h} fill="#0B1018" />

          {/* Faint coordinate grid */}
          <rect width={VIEW.w} height={VIEW.h} fill="url(#latlng-grid)" />

          {/* Topographic terrain fill */}
          <polygon
            points={CONTOUR_RING.map(([lat, lng]) => {
              const p = project(lat, lng);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="url(#basin-fill)"
          />

          {/* Contour rings (elevation lines) */}
          {TERRAIN_RIBS.map((ring, i) => (
            <polygon
              key={`ring-${i}`}
              points={ring
                .map(([lat, lng]) => {
                  const p = project(lat, lng);
                  return `${p.x},${p.y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#22D3B8"
              strokeWidth={0.6}
              strokeDasharray="3 4"
              opacity={0.25 - i * 0.08}
            />
          ))}

          {/* Stippled parks/openspace inside basin */}
          <polygon
            points={CONTOUR_RING.map(([lat, lng]) => {
              const p = project(lat, lng);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="url(#parks)"
          />

          {/* Urban area shadow */}
          <rect width={VIEW.w} height={VIEW.h} fill="url(#urban-fill)" />

          {/* Roads layer */}
          {ROADS.map((r) => {
            const d = r.pts
              .map(([lat, lng]) => project(lat, lng))
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
              .join(" ");
            const stroke =
              r.cls === "hwy" ? 3 : r.cls === "primary" ? 2.2 : 1.6;
            const color =
              r.cls === "hwy" ? "#F5B547" : r.cls === "primary" ? "#9AA7BD" : "#5E6B82";
            const opacity = r.cls === "hwy" ? 0.7 : r.cls === "primary" ? 0.55 : 0.4;
            return (
              <g key={r.id}>
                {/* Road casing */}
                <path
                  d={d}
                  fill="none"
                  stroke="#06090F"
                  strokeWidth={stroke + 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={opacity}
                />
                {/* Highway casing centerline */}
                {r.cls === "hwy" && (
                  <path
                    d={d}
                    fill="none"
                    stroke="#0B1018"
                    strokeWidth={0.6}
                    strokeDasharray="6 8"
                    opacity={0.7}
                  />
                )}
                {/* Label near midpoint */}
                {r.label && r.pts.length >= 2 && (
                  <text
                    {...(() => {
                      const mid = project(r.pts[Math.floor(r.pts.length / 2)][0], r.pts[Math.floor(r.pts.length / 2)][1]);
                      return { x: mid.x + 4, y: mid.y - 4 };
                    })()}
                    fontSize="8"
                    fontFamily="JetBrains Mono"
                    fill={color}
                    opacity={0.85}
                    style={{ letterSpacing: "0.08em" }}
                    filter="url(#text-shadow)"
                  >
                    {r.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Place name labels (cities) */}
          {NAMED_PLACES.map((p) => {
            const pos = project(p.lat, p.lng);
            return (
              <g key={p.label} transform={`translate(${pos.x}, ${pos.y})`}>
                {p.size === "md" && (
                  <circle r="2" fill="#5E6B82" opacity="0.6" />
                )}
                <text
                  x={p.size === "md" ? 6 : 0}
                  y={p.size === "md" ? 3 : -4}
                  fontSize={p.size === "md" ? 11 : 9}
                  fontFamily="Inter, system-ui"
                  fontWeight={p.size === "md" ? 600 : 400}
                  fill={p.size === "md" ? "#9AA7BD" : "#5E6B82"}
                  style={{ letterSpacing: "0.05em" }}
                  filter="url(#text-shadow)"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          {/* River segments */}
          {riverPaths.map((r) => (
            <g key={r.id}>
              {/* River bank (light halo) */}
              <path
                d={r.d}
                fill="none"
                stroke="#1E6E94"
                strokeWidth={r.contaminated ? 7 : 5}
                strokeLinecap="round"
                opacity={r.contaminated ? 0.5 : 0.35}
              />
              <path
                d={r.d}
                fill="none"
                stroke="url(#water-grad)"
                strokeWidth={r.contaminated ? 3 : 2}
                strokeLinecap="round"
                opacity={0.95}
              />
            </g>
          ))}

          {/* Plume paths */}
          {plumePaths.map((p, idx) => {
            const target = affected.find((a) => a.nodeId === p.toNode);
            const sev = target?.severity ?? "low";
            const color = SEVERITY_META[sev].dotClass.replace("bg-", "");
            return (
              <g key={`${p.fromNode}-${p.toNode}-${idx}`}>
                <path
                  d={p.path}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.18}
                  strokeWidth={16}
                  strokeLinecap="round"
                />
                <path
                  d={p.path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.2}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-20"
                    dur="1.4s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            );
          })}

          {/* Watershed nodes (with icons for type) */}
          {nodes.map((n) => {
            const pos = project(n.location.lat, n.location.lng);
            const isSelected = n.nodeId === selectedNodeId;
            const isAffected = affected.some((a) => a.nodeId === n.nodeId);
            const sensor = sensors.find((s) => {
              const matched = nodes.reduce<string | null>((best, nn) => {
                if (best === null) return nn.nodeId;
                const bNode = nodes.find((x) => x.nodeId === best);
                if (!bNode) return nn.nodeId;
                return dist(nn.location, s.location) <
                  dist(bNode.location, s.location)
                  ? nn.nodeId
                  : best;
              }, null);
              return matched === n.nodeId;
            });
            const hasAnomaly = sensor && sensor.anomalyScore > 0.4;

            return (
              <g
                key={n.nodeId}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedNode(isSelected ? null : n.nodeId)
                }
              >
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
                {isSelected && (
                  <circle
                    r={26}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                )}
                {/* Outer marker — hexagonal fill */}
                <polygon
                  points={(() => {
                    const pts: string[] = [];
                    for (let i = 0; i < 6; i++) {
                      const a = (Math.PI / 3) * i - Math.PI / 2;
                      pts.push(`${12 * Math.cos(a)},${12 * Math.sin(a)}`);
                    }
                    return pts.join(" ");
                  })()}
                  fill={hasAnomaly ? "#F97A47" : "#0B1018"}
                  stroke={hasAnomaly ? "#F0686D" : "#38BDF8"}
                  strokeWidth={1.5}
                />
                <circle r={3} fill={hasAnomaly ? "#0B1018" : "#38BDF8"} />
                {/* Label */}
                <g transform="translate(0, 24)">
                  <rect
                    x={-(n.nodeId.length * 4 + 12) / 2}
                    y={-7}
                    width={n.nodeId.length * 4 + 12}
                    height={14}
                    rx={2}
                    fill="#0B1018"
                    stroke="#1B2433"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="8"
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
              const matched = nodes.reduce<string | null>((best, n) => {
                if (best === null) return n.nodeId;
                const bNode = nodes.find((x) => x.nodeId === best);
                if (!bNode) return n.nodeId;
                return dist(n.location, s.location) <
                  dist(bNode.location, s.location)
                  ? n.nodeId
                  : best;
              }, null);
              const base = matched
                ? nodes.find((n) => n.nodeId === matched)
                : null;
              if (!base) return null;
              const pos = project(base.location.lat, base.location.lng);
              const c = sensorColor(s);
              return (
                <g key={s.sensorId} transform={`translate(${pos.x + 16}, ${pos.y - 16})`}>
                  {s.anomalyScore > 0.7 && (
                    <motion.circle
                      r={9}
                      fill="none"
                      stroke={c}
                      strokeWidth={1}
                      initial={{ opacity: 0.8, scale: 0.8 }}
                      animate={{ opacity: 0, scale: 2 }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                  )}
                  <circle r={s.anomalyScore > 0.7 ? 5 : 3.5} fill={c} fillOpacity={0.9} stroke="#06090F" strokeWidth={1} />
                  <text x={6} y={2} fontSize="7" fontFamily="JetBrains Mono" fill="#9AA7BD">
                    {s.sensorId}
                  </text>
                </g>
              );
            })}

          {/* Factories */}
          {showFactories &&
            factories.map((f) => {
              const pos = project(f.location.lat, f.location.lng);
              const isSelected = f.factoryId === selectedFactoryId;
              const isViolator =
                f.factoryId ===
                useInvestigationStore.getState().state?.recommendation
                  ?.suspectedFactoryId;
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
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  )}
                  {/* Factory as an L-shaped footprint */}
                  <g>
                    <rect
                      x={-9}
                      y={-7}
                      width={10}
                      height={10}
                      fill={isViolator ? "#E5484D" : "#161E2C"}
                      stroke={isViolator ? "#F0686D" : "#3A465E"}
                      strokeWidth={1.5}
                    />
                    <rect
                      x={1}
                      y={-3}
                      width={8}
                      height={6}
                      fill={isViolator ? "#E5484D" : "#161E2C"}
                      stroke={isViolator ? "#F0686D" : "#3A465E"}
                      strokeWidth={1.5}
                    />
                    {isViolator && (
                      <g transform="translate(0, -16)">
                        <circle r="3" fill="#E5484D">
                          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
                        </circle>
                        <text
                          y={-6}
                          textAnchor="middle"
                          fontSize="8"
                          fill="#F0686D"
                          fontFamily="JetBrains Mono"
                          fontWeight="600"
                        >
                          ⚠
                        </text>
                      </g>
                    )}
                  </g>
                  <text
                    y={18}
                    textAnchor="middle"
                    fontSize="7"
                    fill={isViolator ? "#F0686D" : "#9AA7BD"}
                    fontFamily="JetBrains Mono"
                  >
                    {f.factoryId}
                  </text>
                </g>
              );
            })}

          {/* Compass rose */}
          <g transform={`translate(${VIEW.w - 60}, 50)`}>
            <circle r="22" fill="#0B1018" stroke="#263042" strokeWidth="1" />
            <circle r="14" fill="none" stroke="#1B2433" strokeWidth="0.5" />
            <line x1="0" y1="-18" x2="0" y2="18" stroke="#5E6B82" strokeWidth="0.5" />
            <line x1="-18" y1="0" x2="18" y2="0" stroke="#5E6B82" strokeWidth="0.5" />
            <polygon points="0,-18 -3,-10 3,-10" fill="#F97A47" />
            <polygon points="0,18 -3,10 3,10" fill="#5E6B82" />
            <text textAnchor="middle" y="-22" fontSize="9" fill="#E6ECF5" fontFamily="JetBrains Mono" fontWeight="600">N</text>
            <text textAnchor="middle" y="28" fontSize="8" fill="#5E6B82" fontFamily="JetBrains Mono">S</text>
            <text x="-26" y="3" fontSize="8" fill="#5E6B82" fontFamily="JetBrains Mono">W</text>
            <text x="20" y="3" fontSize="8" fill="#5E6B82" fontFamily="JetBrains Mono">E</text>
          </g>

          {/* Scale bar */}
          <g transform={`translate(20, ${VIEW.h - 30})`}>
            <rect width="80" height="4" fill="#0B1018" stroke="#9AA7BD" strokeWidth="0.5" />
            <rect width="40" height="4" fill="#9AA7BD" />
            <text y="-4" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono">0</text>
            <text x="40" y="-4" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono" textAnchor="middle">1</text>
            <text x="80" y="-4" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono" textAnchor="end">2 km</text>
          </g>

          {/* Lat/Lng coordinate readout */}
          <g transform={`translate(${VIEW.w - 200}, ${VIEW.h - 30})`}>
            <rect x={-8} y={-12} width="200" height="20" rx="2" fill="#0B1018" stroke="#1B2433" />
            <text x="0" y="2" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono">
              {`37.420°N  122.140°W`}
            </text>
          </g>

          {/* Map title overlay */}
          <g transform={`translate(20, 30)`}>
            <rect x={-6} y={-14} width="180" height="22" rx="2" fill="#0B1018" stroke="#1B2433" />
            <text x="2" y="2" fontSize="11" fill="#E6ECF5" fontFamily="Inter, system-ui" fontWeight="600">
              Cedar Fork Basin
            </text>
          </g>

          {/* Legend */}
          <g transform={`translate(20, ${VIEW.h - 90})`}>
            <rect x={-8} y={-12} width="220" height="48" rx="2" fill="#0B1018" stroke="#1B2433" />
            <text x="0" y="-2" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono" fontWeight="600">
              LEGEND
            </text>
            <g transform="translate(0, 6)">
              <polygon points="0,0 6,3 0,6 -6,3" fill="#0B1018" stroke="#38BDF8" strokeWidth="1" />
              <text x="10" y="3" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono">Watershed node</text>
            </g>
            <g transform="translate(110, 6)">
              <rect x={-4} y={-2} width="8" height="6" fill="#161E2C" stroke="#3A465E" strokeWidth="1" />
              <text x="10" y="3" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono">Facility</text>
            </g>
            <g transform="translate(0, 18)">
              <circle r="3" fill="#F97A47" stroke="#06090F" strokeWidth="0.5" />
              <text x="10" y="3" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono">Anomalous sensor</text>
            </g>
            <g transform="translate(110, 18)">
              <line x1={-5} y1="0" x2="5" y2="0" stroke="#F97A47" strokeWidth="2" strokeDasharray="3 2" />
              <text x="10" y="3" fontSize="8" fill="#9AA7BD" fontFamily="JetBrains Mono">Plume path</text>
            </g>
          </g>
        </svg>

        {/* Selected detail floating card */}
        {(selectedNode || selectedFactory) && (
          <div className="absolute top-2 right-2 w-64 panel p-2.5 space-y-1.5 bg-bg-surface/95 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="text-2xs mono uppercase tracking-wider text-ink-tertiary">
                {selectedNode ? "Node" : "Facility"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedFactory(null);
                }}
              >
                ✕
              </Button>
            </div>
            {selectedNode && (
              <>
                <div className="text-sm font-medium text-ink-primary">
                  {selectedNode.name}
                </div>
                <div className="text-2xs mono text-ink-tertiary">
                  {selectedNode.nodeId} · {selectedNode.type.replace("_", " ")}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-2xs mono">
                  <div>
                    <div className="text-ink-tertiary">Flow</div>
                    <div className="text-ink-primary">{selectedNode.flowRateM3s.toFixed(1)} m³/s</div>
                  </div>
                  <div>
                    <div className="text-ink-tertiary">Lat / Lng</div>
                    <div className="text-ink-primary">
                      {selectedNode.location.lat.toFixed(3)}, {selectedNode.location.lng.toFixed(3)}
                    </div>
                  </div>
                </div>
              </>
            )}
            {selectedFactory && (
              <>
                <div className="text-sm font-medium text-ink-primary">
                  {selectedFactory.name}
                </div>
                <div className="text-2xs mono text-ink-tertiary">
                  {selectedFactory.factoryId} · {selectedFactory.industryType.replace("_", " ")}
                </div>
                <div className="text-2xs mono text-ink-secondary">
                  Last inspection {selectedFactory.lastInspectionDate}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}

function sensorColor(s: { anomalyScore: number }): string {
  if (s.anomalyScore > 0.7) return "#F97A47";
  if (s.anomalyScore > 0.4) return "#F5B547";
  if (s.anomalyScore > 0.2) return "#5BE3CB";
  return "#22D3B8";
}

// avoid unused-warning
void ArrowPathIcon;
void cn;
