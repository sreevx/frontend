"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useUIStore } from "@/stores/uiStore";
import { useInvestigationStore } from "@/stores/investigationStore";
import { api } from "@/lib/api";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import {
  AGENT_META,
  CONTAMINANT_META,
  SEVERITY_META,
} from "@/lib/agentMeta";
import {
  formatTime,
  formatPercent,
  formatDateTime,
  formatConcentration,
} from "@/lib/format";
import {
  type IncidentReport,
  type ReasoningStep,
} from "../../types";

export function ReportViewer() {
  const open = useUIStore((s) => s.reportViewerOpen);
  const close = useUIStore((s) => s.closeReportViewer);
  const investigationId = useInvestigationStore((s) => s.state?.investigationId);
  const state = useInvestigationStore((s) => s.state);

  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && investigationId && !report) {
      setLoading(true);
      setError(null);
      api
        .getReport(investigationId)
        .then((r) => setReport(r))
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Failed to load report")
        )
        .finally(() => setLoading(false));
    }
  }, [open, investigationId, report]);

  // Reset report on close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Fall back to building a report from current state if no backend report available
  const display: IncidentReport | null = report ?? syntheticReport(state);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="report-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-40 bg-bg-base/85 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="panel max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle">
              <div className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-5 h-5 text-agent-mitigation" />
                <div>
                  <div className="text-2xs uppercase tracking-[0.18em] text-ink-tertiary">
                    Generated Report
                  </div>
                  <h2 className="text-base font-semibold text-ink-primary">
                    Incident Report
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<ArrowDownTrayIcon className="w-3.5 h-3.5" />}
                  onClick={() => display && downloadReport(display)}
                >
                  Export
                </Button>
                <button
                  onClick={close}
                  className="text-ink-tertiary hover:text-ink-primary"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center text-ink-tertiary">Generating report…</div>
              ) : error ? (
                <div className="p-12 text-center text-sev-critical text-sm">
                  {error}
                </div>
              ) : display ? (
                <ReportBody report={display} />
              ) : (
                <div className="p-12 text-center text-ink-tertiary text-sm">
                  No data available. Complete an investigation to generate a report.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReportBody({ report }: { report: IncidentReport }) {
  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold text-ink-primary">
            {report.title}
          </h3>
          {report.recommendation && (
            <StatusChip
              label={SEVERITY_META[report.recommendation.overallSeverity].label}
              tone={
                report.recommendation.overallSeverity === "critical"
                  ? "danger"
                  : "warning"
              }
            />
          )}
        </div>
        <div className="text-2xs mono text-ink-tertiary">
          ID {report.reportId} · generated {formatDateTime(report.generatedAt)}
        </div>
      </div>

      {/* Executive summary */}
      <section>
        <SectionHeading>Executive Summary</SectionHeading>
        <p className="text-sm text-ink-primary leading-relaxed">
          {report.executiveSummary}
        </p>
      </section>

      {/* Approval record */}
      <section>
        <SectionHeading>Approval Record</SectionHeading>
        <div className="panel px-3 py-2 border-l-2 border-sev-low flex items-center justify-between">
          <div>
            <div className="text-xs text-ink-secondary">{report.approvalRecord.notes ?? "—"}</div>
            <div className="text-2xs mono text-ink-tertiary mt-1">
              {report.approvalRecord.decidedAt
                ? formatTime(report.approvalRecord.decidedAt)
                : "—"}
            </div>
          </div>
          <StatusChip
            label={report.approvalRecord.status.toUpperCase().replace("_", " ")}
            tone={
              report.approvalRecord.status === "approved"
                ? "success"
                : report.approvalRecord.status === "rejected"
                  ? "danger"
                  : "warning"
            }
          />
        </div>
      </section>

      {/* Timeline */}
      <section>
        <SectionHeading>Reasoning Timeline</SectionHeading>
        <ol className="space-y-2">
          {report.timeline.map((step: ReasoningStep, i) => (
            <TimelineRow key={step.stepId} step={step} index={i} />
          ))}
        </ol>
      </section>

      {/* Violations */}
      {report.violations.length > 0 && (
        <section>
          <SectionHeading>Regulatory Violations</SectionHeading>
          <div className="space-y-1.5">
            {report.violations.map((v) => (
              <div
                key={v.violationId}
                className="panel px-3 py-2 border-l-2 border-sev-critical"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-sm text-ink-primary font-semibold">
                    {v.factoryId}
                  </span>
                  <span className="chip chip-severity-high">
                    {v.exceedanceFactor.toFixed(1)}x
                  </span>
                </div>
                <div className="text-2xs mono text-ink-secondary">
                  {v.contaminant.replace("_", " ")}: {v.measuredValueMgL.toFixed(2)} mg/L vs{" "}
                  {v.legalLimitMgL.toFixed(2)} mg/L limit (confidence{" "}
                  {formatPercent(v.confidence, 0)})
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Affected areas */}
      <section>
        <SectionHeading>Affected Locations</SectionHeading>
        <div className="space-y-1">
          {report.affectedLocations.map((a) => (
            <div
              key={a.nodeId}
              className="panel px-3 py-2 flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-ink-primary">{a.name}</div>
                <div className="text-2xs mono text-ink-tertiary">
                  {a.nodeId} · ETA {formatTime(a.estimatedArrivalTime)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="mono text-2xs text-sev-high">
                  {formatConcentration(a.predictedConcentrationMgL)}
                </span>
                <StatusChip
                  label={a.severity.toUpperCase()}
                  tone={
                    a.severity === "critical"
                      ? "danger"
                      : a.severity === "high"
                        ? "warning"
                        : "success"
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommendation */}
      <section>
        <SectionHeading>Mitigation Plan</SectionHeading>
        <div className="panel px-3 py-2 mb-2">
          <div className="text-sm text-ink-primary leading-snug">
            {report.recommendation.summary}
          </div>
          <div className="text-2xs mono text-ink-tertiary mt-1">
            contaminant: {CONTAMINANT_META[report.recommendation.contaminant].label}
          </div>
        </div>
        <div className="space-y-1">
          {report.recommendation.actions.map((act) => (
            <div
              key={act.actionId}
              className="panel px-3 py-2 border-l-2 border-sev-moderate"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-primary">
                  {act.title}
                </span>
                <StatusChip
                  label={act.urgency.toUpperCase()}
                  tone={act.urgency === "critical" ? "danger" : "warning"}
                />
              </div>
              <div className="text-2xs text-ink-secondary mt-1">
                {act.description}
              </div>
              <div className="text-2xs mono text-ink-tertiary mt-0.5">
                {act.estimatedEnvironmentalImpact}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-2xs uppercase tracking-[0.18em] text-ink-tertiary mb-2 flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-agent-sensing" />
      {children}
    </h4>
  );
}

function TimelineRow({
  step,
  index,
}: {
  step: ReasoningStep;
  index: number;
}) {
  const meta = AGENT_META[step.agent];
  const colorHex =
    step.agent === "sensing"
      ? "#38BDF8"
      : step.agent === "hydrodynamic"
        ? "#5B8DEF"
        : step.agent === "regulatory"
          ? "#A78BFA"
          : "#34D399";
  return (
    <li className="relative pl-6">
      <div
        className="absolute left-0 top-2 w-3 h-3 rounded-full border-2 border-bg-base"
        style={{ background: colorHex, boxShadow: `0 0 6px ${colorHex}` }}
      />
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-2xs mono uppercase tracking-wider px-1.5 rounded"
          style={{ background: `${colorHex}1A`, color: colorHex }}
        >
          {meta.shortLabel}
        </span>
        <span className="text-2xs mono text-ink-tertiary">
          step {index + 1}
        </span>
        <span className="text-2xs mono text-ink-tertiary ml-auto">
          {formatTime(step.timestamp)}
        </span>
      </div>
      <div className="text-xs text-ink-primary leading-snug">
        {step.thought}
      </div>
      <div className="text-xs text-ink-secondary mt-0.5 italic">
        → {step.conclusion}
      </div>
      <div className="text-2xs mono text-ink-tertiary mt-1">
        confidence → {formatPercent(step.confidenceAfter, 0)}
      </div>
    </li>
  );
}

// ============================================================
// Synthetic report fallback (when backend is mocked)
// ============================================================

function syntheticReport(
  state: ReturnType<typeof useInvestigationStore.getState>["state"]
): IncidentReport | null {
  if (!state || !state.recommendation) return null;
  return {
    reportId: `rpt_${state.investigationId.slice(4, 10)}_synth`,
    investigationId: state.investigationId,
    generatedAt: new Date().toISOString(),
    title: `Incident Report — ${
      state.watershedNetwork?.basinName ?? "Unknown Basin"
    } Contamination Investigation`,
    executiveSummary:
      "The AquaSentinel swarm completed its multi-agent investigation. " +
      state.recommendation.summary,
    timeline: state.reasoningHistory,
    evidenceSummary: state.evidence,
    violations: state.violations,
    affectedLocations: state.affectedLocations,
    recommendation: state.recommendation,
    approvalRecord: {
      status: state.approvalStatus,
      decidedAt: state.updatedAt,
      notes: state.approvalNotes,
    },
  };
}

function downloadReport(report: IncidentReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.reportId}.json`;
  a.click();
  URL.revokeObjectURL(url);
  void ArrowTopRightOnSquareIcon;
}