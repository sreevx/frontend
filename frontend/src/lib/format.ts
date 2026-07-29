/**
 * Time / number / string formatters tuned for mission-control density.
 */

export function formatTime(iso: string): string {
  // 06:12:00 UTC
  const d = new Date(iso);
  return d.toISOString().slice(11, 19) + " UTC";
}

export function formatTimeShort(iso: string): string {
  // 06:12
  const d = new Date(iso);
  return d.toISOString().slice(11, 16);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

export function formatDateTime(iso: string): string {
  // 2026-07-29 06:12 UTC
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

export function relativeFromNow(iso: string): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const absMs = Math.abs(diffMs);
  const future = diffMs >= 0;

  const h = Math.floor(absMs / 3_600_000);
  const m = Math.floor((absMs % 3_600_000) / 60_000);

  if (absMs < 60_000) return future ? "in <1m" : "just now";
  if (h === 0) return future ? `in ${m}m` : `${m}m ago`;
  if (h < 24) return future ? `in ${h}h ${m}m` : `${h}h ${m}m ago`;
  const days = Math.floor(h / 24);
  return future ? `in ${days}d` : `${days}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export function formatPercent(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatNumber(v: number, digits = 1): string {
  return v.toFixed(digits);
}

export function formatConcentration(mgL: number): string {
  if (mgL < 1) return `${mgL.toFixed(2)} mg/L`;
  return `${mgL.toFixed(1)} mg/L`;
}

export function formatFlow(m3s: number): string {
  return `${m3s.toFixed(1)} m³/s`;
}

export function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

export function pluralize(n: number, singular: string, plural?: string): string {
  if (n === 1) return `${n} ${singular}`;
  return `${n} ${plural ?? singular + "s"}`;
}