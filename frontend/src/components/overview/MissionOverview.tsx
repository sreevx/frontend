"use client";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { Donut, Sparkline, SeverityBar, MiniStack } from "@/components/ui/infographics";
import {
  useInvestigationStore,
  selectConfidence,
  selectRecommendation,
  selectAffectedLocations,
  selectTelemetry,
  selectViolations,
} from "@/stores/investigationStore";
import { useUIStore } from "@/stores/uiStore";
import { AGENT_META, CONTAMINANT_META, SEVERITY_META } from "@/lib/agentMeta";
import {
  ExclamationTriangleIcon,
  MapPinIcon,
  SignalIcon,
  UserGroupIcon,
  BeakerIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { formatPercent } from "@/lib/format";

export function MissionOverview() {
  const state = useInvestigationStore((s) => s.state);
  const confidence = useInvestigationStore(selectConfidence);
  const recommendation = useInvestigationStore(selectRecommendation);
  const affected = useInvestigationStore(selectAffectedLocations);
  const telemetry = useInvestigationStore(selectTelemetry);
  const violations = useInvestigationStore(selectViolations);
  const openApproval = useUIStore((s) => s.openApprovalModal);

  if (!state) {
    return (
      <Panel title="Mission" className="h-full" noPadding>
        <div className="h-full flex items-center justify-center text-ink-tertiary text-sm">
          No active mission.
        </div>
      </Panel>
    );
  }

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
  const contaminantMeta = recommendation
    ? CONTAMINANT_META[recommendation.contaminant]
    : null;

  const anomalyCount = telemetry.filter((t) => t.anomalyScore > 0.4).length;
  const total = telemetry.length || 1;
  const sensorSegments = [
    { value: anomalyCount, color: "#F97A47", label: "Anomaly" },
    { value: total - anomalyCount, color: "#1B2433", label: "Normal" },
  ];

  const confidenceTone =
    confidence >= 0.85 ? "low" : confidence >= 0.7 ? "moderate" : "high";

  return (
    <Panel
      title="Mission"
      subtitle={state.investigationId}
      badge={
        <StatusChip
          label={sevMeta.label}
          tone={
            severity === "critical"
              ? "danger"
              : severity === "high"
                ? "warning"
                : severity === "moderate"
                  ? "warning"
                  : "success"
          }
        />
      }
      actions={
        state.approvalStatus === "pending" ? (
          <Button
            variant="danger"
            size="sm"
            onClick={openApproval}
            iconLeft={<ExclamationTriangleIcon className="w-3 h-3" />}
          >
            Approve
          </Button>
        ) : null
      }
      className="h-full"
      noPadding
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* Hero row: big donut + headline numbers */}
        <div className="grid grid-cols-[auto_1fr] gap-4 p-3 border-b border-line-subtle items-center">
          <Donut
            value={confidence}
            size={92}
            strokeWidth={9}
            color={sevColor}
            label={formatPercent(confidence, 0)}
            sublabel="CONF"
          />
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.18em] mono text-ink-tertiary">
                Incident
              </span>
              {contaminantMeta && (
                <span
                  className="text-2xs mono px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: `${contaminantMeta.tint}`,
                    color: "#E6ECF5",
                  }}
                >
                  {contaminantMeta.label}
                </span>
              )}
            </div>
            <div className="text-base text-ink-primary leading-snug line-clamp-2">
              {recommendation?.summary ?? "Awaiting swarm reasoning…"}
            </div>
            <SeverityBar severity={severity} className="mt-1" />
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-2 p-3 border-b border-line-subtle">
          <KPI
            icon={<SignalIcon className="w-3.5 h-3.5" />}
            label="Anomaly"
            value={`${anomalyCount}/${telemetry.length}`}
            color="#F97A47"
          />
          <KPI
            icon={<MapPinIcon className="w-3.5 h-3.5" />}
            label="Sites"
            value={String(affected.length)}
            color="#F5B547"
          />
          <KPI
            icon={<UserGroupIcon className="w-3.5 h-3.5" />}
            label="ETA"
            value={
              affected[0]
                ? new Date(affected[0].estimatedArrivalTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"
            }
            color="#5B8DEF"
          />
          <KPI
            icon={<ExclamationTriangleIcon className="w-3.5 h-3.5" />}
            label="Violations"
            value={String(violations.length)}
            color="#E5484D"
          />
        </div>

        {/* Sensor breakdown + sparkline (visual layer) */}
        <div className="flex-1 min-h-0 p-3 space-y-3 overflow-y-auto">
          <Section label="Sensor Health">
            <MiniStack segments={sensorSegments} />
            <div className="flex justify-between text-[10px] mono text-ink-tertiary mt-1">
              <span>{anomalyCount} anomalous</span>
              <span>{total - anomalyCount} nominal</span>
            </div>
          </Section>

          <Section label="Agent Activity">
            <Sparkline
              data={Array.from({ length: 24 }, (_, i) =>
                Math.max(
                  0,
                  Math.min(
                    1,
                    0.5 +
                      Math.sin(i / 3) * 0.2 +
                      (Math.random() - 0.5) * 0.1 +
                      i / 60
                  )
                )
              )}
              color="#38BDF8"
              height={36}
            />
          </Section>

          {recommendation?.actions && (
            <Section label="Mitigation Plan">
              <div className="flex flex-wrap gap-1">
                {recommendation.actions.slice(0, 6).map((a) => {
                  const c =
                    a.urgency === "critical"
                      ? "#E5484D"
                      : a.urgency === "high"
                        ? "#F97A47"
                        : a.urgency === "moderate"
                          ? "#F5B547"
                          : "#22D3B8";
                  return (
                    <div
                      key={a.actionId}
                      className="flex items-center gap-1 px-2 py-1 rounded-sm border"
                      style={{
                        background: `${c}14`,
                        borderColor: `${c}55`,
                      }}
                      title={a.title}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: c }}
                      />
                      <span className="text-2xs mono uppercase tracking-wider text-ink-primary">
                        {a.title.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        {/* Footer micro-stats */}
        <div className="px-3 py-1.5 border-t border-line-subtle bg-bg-base/40 flex items-center justify-between text-[10px] mono text-ink-tertiary">
          <span className="flex items-center gap-1">
            <ArrowTrendingDownIcon className="w-3 h-3" />
            ITER {state.workflowIteration}/{state.maxIterations}
          </span>
          <span className="flex items-center gap-1">
            <BeakerIcon className="w-3 h-3" />
            {Object.keys(AGENT_META).length} AGENTS
          </span>
          <span>
            {state.approvalStatus.replace("_", " ").toUpperCase()}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function KPI({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="border border-line-subtle rounded-sm bg-bg-base/40 p-2">
      <div
        className="flex items-center gap-1 text-[10px] mono uppercase tracking-wider"
        style={{ color }}
      >
        {icon}
        {label}
      </div>
      <div className="text-base mono font-semibold text-ink-primary leading-tight mt-0.5">
        {value}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] mono text-ink-tertiary mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}