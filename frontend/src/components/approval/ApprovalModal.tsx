"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentCheckIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useUIStore } from "@/stores/uiStore";
import {
  useInvestigationStore,
  selectRecommendation,
  selectAffectedLocations,
} from "@/stores/investigationStore";
import { useSimulationStore } from "@/stores/simulationStore";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  CONTAMINANT_META,
  SEVERITY_META,
} from "@/lib/agentMeta";
import { formatTime, formatConcentration, relativeFromNow } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ApprovalDecision } from "../../types";

export function ApprovalModal() {
  const open = useUIStore((s) => s.approvalModalOpen);
  const close = useUIStore((s) => s.closeApprovalModal);
  const recommendation = useInvestigationStore(selectRecommendation);
  const affected = useInvestigationStore(selectAffectedLocations);
  const scenarioId = useInvestigationStore((s) => s.state?.scenarioId);
  const investigationId = useInvestigationStore((s) => s.state?.investigationId);
  const patchState = useInvestigationStore((s) => s.patchState);
  const setApprovalPending = useSimulationStore; // use approval status update
  void setApprovalPending;
  const pushToast = useUIStore((s) => s.pushToast);

  const [decision, setDecision] = useState<ApprovalDecision | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      decision: ApprovalDecision;
      notes: string;
      decidedAt: string;
      decidedBy: string;
    }>
  >([]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, close]);

  const handleDecision = async (d: ApprovalDecision) => {
    setDecision(d);
    setSubmitting(true);

    // Optimistically update local state. In live mode, the backend will
    // emit additional SSE events that continue the graph from checkpoint.
    const newHistory = [
      {
        id: `hist_${Date.now()}`,
        decision: d,
        notes,
        decidedAt: new Date().toISOString(),
        decidedBy: "OPS-OPS-1",
      },
      ...history,
    ];
    setHistory(newHistory);

    // Simulate network latency for live feel
    await new Promise((r) => setTimeout(r, 800));

    if (investigationId && recommendation) {
      if (d === "approve") {
        patchState({
          approvalStatus: "approved",
          approvalNotes: notes || null,
          status: "completed",
        });
      } else {
        patchState({
          approvalStatus: "rejected",
          approvalNotes: notes || null,
        });
      }
    }

    pushToast({
      title: d === "approve" ? "Approval granted" : "Plan rejected",
      body:
        d === "approve"
          ? "Mitigation plan authorized, containment order issued."
          : "Plan returned to Mitigation Planning for revision.",
      tone: d === "approve" ? "success" : "error",
    });

    setSubmitting(false);
    setTimeout(() => {
      close();
      setDecision(null);
      setNotes("");
    }, 1200);
    void scenarioId;
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-bg-base/85 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={close}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="panel max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border-2 border-approval/40 shadow-[0_0_0_1px_rgba(229,72,77,0.5),0_0_24px_rgba(229,72,77,0.3)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-approval/30 bg-[rgba(229,72,77,0.06)]">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-approval" />
              <div>
                <div className="text-2xs uppercase tracking-[0.18em] text-ink-tertiary">
                  Interrupt · Human-in-the-loop
                </div>
                <h2 className="text-base font-semibold text-ink-primary">
                  Approve Mitigation Plan
                </h2>
              </div>
            </div>
            <button
              onClick={close}
              className="text-ink-tertiary hover:text-ink-primary"
              aria-label="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {recommendation ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Recommendation summary */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-agent-mitigation shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-ink-tertiary uppercase tracking-wider mb-0.5">
                      Recommendation Summary
                    </div>
                    <div className="text-sm text-ink-primary leading-snug">
                      {recommendation.summary}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <StatusChip
                      label={SEVERITY_META[recommendation.overallSeverity].label}
                      tone={recommendation.overallSeverity === "critical" ? "danger" : "warning"}
                    />
                    <span className="text-2xs mono text-ink-tertiary">
                      {recommendation.contaminant.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="border-t border-line-subtle pt-3">
                  <div className="text-xs text-ink-tertiary uppercase tracking-wider mb-1.5">
                    Primary Hypothesis
                  </div>
                  <div className="text-sm text-ink-primary leading-snug">
                    {recommendation.primaryHypothesis}
                  </div>
                </div>

                {/* Suspected source */}
                {recommendation.suspectedFactoryId && (
                  <div className="border-t border-line-subtle pt-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-2xs text-ink-tertiary uppercase tracking-wider mb-1">
                        Suspected Source
                      </div>
                      <div className="mono text-sm text-sev-high font-semibold">
                        {recommendation.suspectedFactoryId}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xs text-ink-tertiary uppercase tracking-wider mb-1">
                        Contaminant
                      </div>
                      <div className="mono text-sm text-ink-primary">
                        {CONTAMINANT_META[recommendation.contaminant].label}
                      </div>
                    </div>
                  </div>
                )}

                {/* Affected areas */}
                {affected.length > 0 && (
                  <div className="border-t border-line-subtle pt-3">
                    <div className="text-2xs text-ink-tertiary uppercase tracking-wider mb-2 flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" />
                      Affected Areas
                    </div>
                    <div className="space-y-1">
                      {affected.map((a) => (
                        <div
                          key={a.nodeId}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="mono text-ink-tertiary text-2xs">
                              {a.nodeId}
                            </span>
                            <span className="text-ink-primary truncate">
                              {a.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mono text-2xs shrink-0">
                            <span className="text-sev-high">
                              {formatConcentration(a.predictedConcentrationMgL)}
                            </span>
                            <span className="text-ink-tertiary">
                              {relativeFromNow(a.estimatedArrivalTime)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action list */}
                <div className="border-t border-line-subtle pt-3">
                  <div className="text-2xs text-ink-tertiary uppercase tracking-wider mb-2">
                    Actions Requiring Authorization
                  </div>
                  <div className="space-y-1.5">
                    {recommendation.actions.map((act) => {
                      const urgency = act.urgency;
                      const uMeta = SEVERITY_META[urgency];
                      return (
                        <div
                          key={act.actionId}
                          className="panel px-3 py-2 border-l-2"
                          style={{
                            borderLeftColor:
                              urgency === "critical"
                                ? "#E5484D"
                                : urgency === "high"
                                  ? "#F97A47"
                                  : "#F5B547",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium text-ink-primary">
                              {act.title}
                            </div>
                            <span className={uMeta.chipClass}>
                              {uMeta.label}
                            </span>
                          </div>
                          <div className="text-2xs text-ink-secondary mt-0.5">
                            {act.description}
                          </div>
                          <div className="text-2xs mono text-ink-tertiary mt-1">
                            Estimated impact: {act.estimatedEnvironmentalImpact}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comments */}
                <div className="border-t border-line-subtle pt-3">
                  <label
                    htmlFor="approval-notes"
                    className="text-2xs text-ink-tertiary uppercase tracking-wider mb-1 block"
                  >
                    Authorization Comments (Optional)
                  </label>
                  <textarea
                    id="approval-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Confirmed with field team, proceeding with containment order."
                    className={cn(
                      "w-full bg-bg-base border border-line-default rounded px-2 py-1.5",
                      "text-xs text-ink-primary placeholder:text-ink-tertiary",
                      "focus:outline-none focus:border-agent-sensing/60"
                    )}
                  />
                </div>

                {/* History */}
                {history.length > 0 && (
                  <div className="border-t border-line-subtle pt-3">
                    <div className="text-2xs text-ink-tertiary uppercase tracking-wider mb-1.5">
                      Approval History
                    </div>
                    <div className="space-y-1.5">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="panel px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={cn(
                                "mono uppercase text-2xs px-1.5 rounded",
                                h.decision === "approve"
                                  ? "bg-[rgba(34,211,184,0.1)] text-sev-low"
                                  : "bg-[rgba(229,72,77,0.1)] text-sev-critical"
                              )}
                            >
                              {h.decision}
                            </span>
                            <span className="text-ink-secondary">
                              {h.decidedBy}
                            </span>
                            <span className="mono text-ink-tertiary ml-auto">
                              {formatTime(h.decidedAt)}
                            </span>
                          </div>
                          {h.notes && (
                            <div className="text-2xs text-ink-secondary mt-1 italic">
                              &ldquo;{h.notes}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-ink-tertiary text-sm">
              No recommendation pending approval.
            </div>
          )}

          {/* Actions footer */}
          <div className="border-t border-line-subtle px-4 py-3 bg-bg-base/40 flex items-center justify-between">
            <div className="text-2xs text-ink-tertiary">
              {submitting
                ? "Authorizing…"
                : decision === "approve"
                  ? "Approval granted — finalizing report."
                  : decision === "reject"
                    ? "Plan rejected — re-planning in progress."
                    : "Approval required to proceed."}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="md"
                onClick={() => handleDecision("reject")}
                disabled={submitting || !recommendation}
              >
                Reject & Re-plan
              </Button>
              <Button
                variant="success"
                size="md"
                iconLeft={<CheckIcon className="w-3.5 h-3.5" />}
                onClick={() => handleDecision("approve")}
                disabled={submitting || !recommendation}
              >
                {submitting ? "Authorizing…" : "Approve Plan"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
