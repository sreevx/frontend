"use client";

import {
  BeakerIcon,
  ChartBarIcon,
  CpuChipIcon,
  RadioIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useInvestigationStore, selectConfidence, selectStatus, selectRecommendation } from "@/stores/investigationStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { useUIStore } from "@/stores/uiStore";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import { WORKFLOW_STATUS_META, SEVERITY_META } from "@/lib/agentMeta";
import { formatPercent } from "@/lib/format";

export function Header() {
  const state = useInvestigationStore((s) => s.state);
  const confidence = useInvestigationStore(selectConfidence);
  const status = useInvestigationStore(selectStatus);
  const recommendation = useInvestigationStore(selectRecommendation);
  const connectionStatus = useConnectionStore((s) => s.status);
  const eventsReceived = useConnectionStore((s) => s.eventsReceived);
  const openReport = useUIStore((s) => s.openReportViewer);
  const openScenarioPicker = useUIStore((s) => s.setShowScenarioPicker);

  const statusMeta = WORKFLOW_STATUS_META[status];
  const severity = recommendation?.overallSeverity ?? "low";
  const sevMeta = SEVERITY_META[severity];
  const sevColor =
    severity === "critical"
      ? "#E5484D"
      : severity === "high"
        ? "#F97A47"
        : severity === "moderate"
          ? "#F5B547"
          : "#22D3B8";

  return (
    <header className="border-b border-line-subtle bg-bg-surface/80 backdrop-blur-sm relative shrink-0">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-agent-sensing/40 to-transparent" />

      <div className="px-3 py-2 flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-agent-sensing/20 to-agent-hydrodynamic/20 border border-line-default flex items-center justify-center">
            <BeakerIcon className="w-3.5 h-3.5 text-agent-sensing" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] text-ink-tertiary uppercase tracking-[0.18em]">
              AquaSentinel
            </span>
            <span className="text-sm font-semibold text-ink-primary">
              Mission Control
            </span>
          </div>
        </div>

        <Divider />

        {/* Mission ID */}
        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          <CpuChipIcon className="w-3.5 h-3.5 text-ink-tertiary" />
          <span className="mono text-xs text-ink-primary truncate max-w-[140px]">
            {state?.investigationId ?? "—"}
          </span>
        </div>

        <Divider />

        {/* Status chip */}
        <StatusChip
          label={statusMeta.label}
          tone={
            statusMeta.tone === "live"
              ? "live"
              : statusMeta.tone === "error"
                ? "danger"
                : statusMeta.tone === "approval"
                  ? "approval"
                  : "idle"
          }
          pulse={statusMeta.tone === "live"}
        />

        {/* Severity */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm border"
          style={{
            background: `${sevColor}1A`,
            borderColor: `${sevColor}55`,
          }}
        >
          <ExclamationTriangleIcon
            className="w-3 h-3"
            style={{ color: sevColor }}
          />
          <span
            className="text-2xs mono uppercase tracking-wider font-semibold"
            style={{ color: sevColor }}
          >
            {sevMeta.label}
          </span>
        </div>

        {/* Confidence (inline, just the number + bar) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ChartBarIcon className="w-3.5 h-3.5 text-agent-sensing" />
          <span className="text-2xs mono text-ink-tertiary uppercase tracking-wider">CONF</span>
          <span className="mono text-xs font-semibold text-ink-primary">
            {formatPercent(confidence, 0)}
          </span>
          <div className="w-12 h-1 bg-bg-base rounded-sm overflow-hidden border border-line-subtle">
            <div
              className="h-full bg-agent-sensing transition-all"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Iteration */}
        {state && (
          <div className="flex items-center gap-1.5 shrink-0 hidden xl:flex">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-ink-tertiary" />
            <span className="text-2xs mono text-ink-tertiary uppercase tracking-wider">ITER</span>
            <span className="mono text-xs font-semibold text-ink-primary">
              {state.workflowIteration}
            </span>
            <span className="mono text-xs text-ink-tertiary">
              /{state.maxIterations}
            </span>
          </div>
        )}

        {/* Stream */}
        <div className="flex items-center gap-1.5 shrink-0 hidden lg:flex">
          <RadioIcon className="w-3.5 h-3.5 text-ink-tertiary" />
          <span
            className={
              connectionStatus === "live" || connectionStatus === "mock"
                ? "status-dot status-dot-live"
                : connectionStatus === "error"
                  ? "status-dot status-dot-error"
                  : "status-dot status-dot-idle"
            }
          />
          <span className="text-2xs mono text-ink-secondary uppercase tracking-wider">
            {connectionStatus === "live"
              ? "LIVE"
              : connectionStatus === "mock"
                ? "REPLAY"
                : connectionStatus === "connecting"
                  ? "…"
                  : "OFF"}
          </span>
          <span className="text-2xs mono text-ink-tertiary">
            {eventsReceived > 0 ? `·${eventsReceived}` : ""}
          </span>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openScenarioPicker(true)}
            iconLeft={<PlayIcon className="w-3 h-3" />}
          >
            New
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={openReport}
            disabled={status !== "completed"}
            iconLeft={<DocumentMagnifyingGlassIcon className="w-3 h-3" />}
          >
            Report
          </Button>
        </div>
      </div>
    </header>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-line-subtle shrink-0" />;
}