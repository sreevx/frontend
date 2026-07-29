import type { Coordinates, WatershedNode } from "../types";

export interface ProjectionBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface Projection {
  toViewport: (lng: number, lat: number) => { x: number; y: number };
  bbox: ProjectionBox;
}

/**
 * Equirectangular projection, padded.
 * Note: Y is inverted (screen Y grows downward, latitude grows northward).
 *
 * The basin is small (~10km) so equirectangular distortion is negligible.
 */
export function makeProjection(
  points: Coordinates[],
  viewport: { width: number; height: number },
  padding = 32
): Projection {
  if (points.length === 0) {
    return {
      bbox: { minLng: 0, maxLng: 1, minLat: 0, maxLat: 1 },
      toViewport: () => ({ x: viewport.width / 2, y: viewport.height / 2 }),
    };
  }

  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }

  // Avoid div-by-zero for single-point cases
  const lngRange = Math.max(maxLng - minLng, 0.001);
  const latRange = Math.max(maxLat - minLat, 0.001);

  const usableW = viewport.width - padding * 2;
  const usableH = viewport.height - padding * 2;

  // Aspect-correct: scale uniformly so both axes fit
  const scale = Math.min(usableW / lngRange, usableH / latRange);
  const offsetX = (viewport.width - lngRange * scale) / 2;
  const offsetY = (viewport.height - latRange * scale) / 2;

  return {
    bbox: { minLng, maxLng, minLat, maxLat },
    toViewport: (lng, lat) => ({
      x: offsetX + (lng - minLng) * scale,
      // SVG Y inversion
      y: viewport.height - (offsetY + (lat - minLat) * scale),
    }),
  };
}

/**
 * Project a watershed node array to an SVG-ready graph:
 * positions + edges (based on connectedTo).
 */
export interface ProjectedGraph {
  projection: Projection;
  positions: Record<string, { x: number; y: number; node: WatershedNode }>;
  edges: Array<{
    from: string;
    to: string;
    d: string; // SVG path
    fromPoint: { x: number; y: number };
    toPoint: { x: number; y: number };
  }>;
}

export function projectWatershed(
  nodes: WatershedNode[],
  viewport: { width: number; height: number }
): ProjectedGraph {
  const projection = makeProjection(
    nodes.map((n) => n.location),
    viewport,
    48
  );

  const positions: ProjectedGraph["positions"] = {};
  for (const n of nodes) {
    const { x, y } = projection.toViewport(n.location.lng, n.location.lat);
    positions[n.nodeId] = { x, y, node: n };
  }

  const edges: ProjectedGraph["edges"] = [];
  for (const n of nodes) {
    const fromPt = positions[n.nodeId];
    if (!fromPt) continue;
    for (const toId of n.connectedTo) {
      const toPt = positions[toId];
      if (!toPt) continue;
      // Curved path (control point offset perpendicular to line)
      const mx = (fromPt.x + toPt.x) / 2;
      const my = (fromPt.y + toPt.y) / 2;
      const dx = toPt.x - fromPt.x;
      const dy = toPt.y - fromPt.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      // perpendicular offset for slight curve
      const offset = Math.min(20, len * 0.1);
      const nx = -dy / (len || 1);
      const ny = dx / (len || 1);
      const cx = mx + nx * offset;
      const cy = my + ny * offset;
      const d = `M ${fromPt.x} ${fromPt.y} Q ${cx} ${cy} ${toPt.x} ${toPt.y}`;
      edges.push({
        from: n.nodeId,
        to: toId,
        d,
        fromPoint: { x: fromPt.x, y: fromPt.y },
        toPoint: { x: toPt.x, y: toPt.y },
      });
    }
  }

  return { projection, positions, edges };
}