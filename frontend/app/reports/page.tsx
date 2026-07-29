"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { Donut, Sparkline, SeverityBar, MiniStack } from "@/components/ui/infographics";
import {
  useInvestigationStore,
  selectConfidence,
  selectRecommendation,
  selectAffectedLocations,
  selectViolations,
  selectReasoningSteps,
  selectToolHistory,
} from "@/stores/investigationStore";
import { useUIStore } from "@/stores/uiStore";
import { api } from "@/lib/api";
import { AGENT_META, SEVERITY_META, CONTAMINANT_META } from "@/lib/agentMeta";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { formatTime, formatPercent, formatDateTime } from "@/lib/format";

const SEVERITY_HEX: Record<string, string> = {
  critical: "#E5484D",
  high: "#F97A47",
  moderate: "#F5B547",
  low: "#22D3B8",
};

const AGENT_HEX: Record<string, string> = {
  sensing: "#38BDF8",
  hydrodynamic: "#5B8DEF",
  regulatory: "#A78BFA",
  mitigation: "#34D399",
};

export default function ReportsPage() {
  const state = useInvestigationStore((s) => s.state);
  const confidence = useInvestigationStore(selectConfidence);
  const recommendation = useInvestigationStore(selectRecommendation);
  const affected = useInvestigationStore(selectAffectedLocations);
  const violations = useInvestigationStore(selectViolations);
  const reasoning = useInvestigationStore(selectReasoningSteps);
  const toolHistory = useInvestigationStore(selectToolHistory);
  const openReportViewer = useUIStore((s) => s.openReportViewer);
  const pushToast = useUIStore((s) => s.pushToast);
  const [downloading, setDownloading] = useState(false);

  if (!state) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center text-ink-tertiary">
          <DocumentTextIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <div className="text-sm">No active investigation to report on.</div>
        </div>
      </div>
    );
  }

  const severity = recommendation?.overallSeverity ?? "low";
  const sevColor = SEVERITY_HEX[severity];
  const contaminantMeta = recommendation
    ? CONTAMINANT_META[recommendation.contaminant]
    : null;

  // Confidence over time — derived from reasoning steps
  const confidenceCurve = (() => {
    const pts: number[] = [];
    let running = 0;
    for (const step of reasoning) {
      if (typeof step.confidenceAfter === "number") {
        running = step.confidenceAfter;
        pts.push(running);
      }
    }
    if (pts.length < 2) pts.push(0, confidence);
    return pts;
  })();

  // Severity distribution — single bucket for the active investigation
  const severitySegments = [
    { key: "critical", value: severity === "critical" ? 1 : 0, color: "#E5484D" },
    { key: "high", value: severity === "high" ? 1 : 0, color: "#F97A47" },
    { key: "moderate", value: severity === "moderate" ? 1 : 0, color: "#F5B547" },
    { key: "low", value: severity === "low" ? 1 : 0, color: "#22D3B8" },
  ];

  // Agent activity count
  const agentCounts = (["sensing", "hydrodynamic", "regulatory", "mitigation"] as const).map(
    (a) => ({
      key: AGENT_META[a].shortLabel,
      value: reasoning.filter((s) => s.agent === a).length,
      color: AGENT_HEX[a],
    })
  );

  // Sites concentration sparkline
  const siteValues = affected.map((a) => a.predictedConcentrationMgL);
  const peak = Math.max(1, ...siteValues);

  const previousMissions = [
    {
      investigationId: state.investigationId,
      scenario: state.scenarioId,
      severity,
      completedAt: state.updatedAt,
      status: state.status,
    },
  ];

  async function handleDownload() {
    if (!state) return;
    setDownloading(true);
    try {
      const report = await api.getReport(state.investigationId);
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident-report-${state.investigationId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast({
        title: "Report downloaded",
        body: `incident-report-${state.investigationId}.json`,
        tone: "success",
      });
    } catch {
      const synthetic = buildSyntheticReport(state);
      const blob = new Blob([JSON.stringify(synthetic, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident-report-${state.investigationId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast({
        title: "Report downloaded (offline)",
        body: "Generated locally — backend unreachable.",
        tone: "warning",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="h-full w-full overflow-auto p-2">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gridTemplateRows: "auto auto",
          gridTemplateAreas: `
            "kpi history"
            "chart history"
          `,
        }}
      >
        {/* KPI hero — donut + severity bar */}
        <Panel
          title="Mission Analytics"
          subtitle={state.investigationId}
          actions={
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={openReportViewer}
                iconLeft={<ArrowTopRightOnSquareIcon className="w-3 h-3" />}
              >
                Viewer
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                iconLeft={<ArrowDownTrayIcon className="w-3 h-3" />}
              >
                {downloading ? "…" : "Export"}
              </Button>
            </div>
          }
          style={{ gridArea: "kpi" }}
          className="min-w-0"
          noPadding
        >
          <div className="grid grid-cols-[auto_1fr] gap-4 p-3 items-center">
            <Donut
              value={confidence}
              size={88}
              strokeWidth={8}
              color="#38BDF8"
              label={`${Math.round(confidence * 100)}`}
              sublabel="CONF"
            />
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-2xs mono px-1.5 py-0.5 rounded-sm"
                  style={{ background: `${contaminantMeta?.tint ?? "#22D3B8"}`, color: "#E6ECF5" }}
                >
                  {contaminantMeta?.label ?? "—"}
                </span>
                <span className="text-2xs mono text-ink-secondary">
                  {recommendation?.suspectedFactoryId ?? "—"}
                </span>
              </div>
              <div className="text-sm text-ink-primary leading-snug line-clamp-2">
                {recommendation?.primaryHypothesis ?? "Awaiting swarm conclusion."}
              </div>
              <SeverityBar severity={severity} />
            </div>
          </div>

          {/* Micro KPI strip */}
          <div className="grid grid-cols-4 gap-px bg-line-subtle border-t border-line-subtle">
            <MicroStat label="SITES" value={affected.length} color="#5B8DEF" />
            <MicroStat
              label="VIOL"
              value={violations.length}
              color={violations.length > 0 ? "#E5484D" : "#22D3B8"}
            />
            <MicroStat
              label="ACTION"
              value={recommendation?.actions.length ?? 0}
              color="#34D399"
            />
            <MicroStat
              label="STEP"
              value={`${state.workflowIteration}/${state.maxIterations}`}
              color="#A78BFA"
            />
          </div>
        </Panel>

        {/* Charts row */}
        <Panel
          title="Trends"
          style={{ gridArea: "chart" }}
          className="min-w-0"
          noPadding
        >
          <div className="grid grid-cols-3 gap-px bg-line-subtle">
            <ChartCell label="Confidence" hint={`Σ ${formatPercent(confidence, 0)}`}>
              <Sparkline data={confidenceCurve} color="#38BDF8" height={36} />
            </ChartCell>
            <ChartCell label="Site concentration" hint={`peak ${peak.toFixed(1)} mg/L`}>
              <Sparkline
                data={siteValues.length > 0 ? siteValues : [0, 0]}
                color={sevColor}
                height={36}
              />
            </ChartCell>
            <ChartCell label="Agent activity" hint={`${reasoning.length} steps`}>
              <MiniStack segments={agentCounts} />
            </ChartCell>
          </div>
          <div className="border-t border-line-subtle px-3 py-1.5 flex items-center gap-3 text-[10px] mono text-ink-tertiary">
            <span className="uppercase tracking-wider">Severity mix</span>
            <MiniStack
              segments={severitySegments}
              className="flex-1 max-w-[120px]"
            />
            <span className="ml-auto">
              {toolHistory.length} tool calls · {formatDateTime(state.updatedAt)}
            </span>
          </div>
        </Panel>

        {/* Mission history */}
        <Panel
          title="History"
          style={{ gridArea: "history" }}
          className="min-w-0"
          noPadding
        >
          <div className="p-2 space-y-1.5">
            {previousMissions.map((m) => (
              <div
                key={m.investigationId}
                className="border border-line-subtle rounded p-2 bg-bg-raised/40 hover:border-line-default transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <DocumentTextIcon className="w-3 h-3 text-ink-tertiary" />
                  <span className="mono text-[11px] text-ink-primary truncate flex-1">
                    {m.investigationId}
                  </span>
                  <StatusChip
                    label={m.status.toUpperCase().slice(0, 4)}
                    tone={m.status === "completed" ? "live" : m.status === "awaiting_approval" ? "warning" : "idle"}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBar severity={m.severity} className="flex-1" />
                  <span className="text-[10px] mono text-ink-tertiary">
                    {formatTime(m.completedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line-subtle px-3 py-1.5 text-[10px] mono text-ink-tertiary italic">
            Mock mode · 1 active investigation
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MicroStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-bg-base/40 px-2 py-1.5 flex flex-col items-center justify-center">
      <div className="text-base mono font-semibold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider mono text-ink-tertiary mt-0.5">
        {label}
      </div>
    </div>
  );
}

function ChartCell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-base/40 p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider mono text-ink-tertiary">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] mono text-ink-secondary">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function buildSyntheticReport(
  state: NonNullable<ReturnType<typeof useInvestigationStore.getState>["state"]>
) {
  return {
    investigationId: state.investigationId,
    generatedAt: new Date().toISOString(),
    status: state.status,
    approval: state.approvalStatus,
    summary: state.recommendation?.summary ?? null,
    primaryHypothesis: state.recommendation?.primaryHypothesis ?? null,
    severity: state.recommendation?.overallSeverity ?? null,
    actions: state.recommendation?.actions ?? [],
    evidence: state.evidence.length,
    reasoningSteps: state.reasoningHistory.length,
    affectedLocations: state.affectedLocations,
    violations: state.violations,
    agents: Object.values(AGENT_META).map((m) => m.label),
  };
}
