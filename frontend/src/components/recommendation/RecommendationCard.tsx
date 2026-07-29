"use client";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { Donut, Sparkline, SeverityBar } from "@/components/ui/infographics";
import {
  useInvestigationStore,
  selectRecommendation,
  selectAffectedLocations,
  selectViolations,
} from "@/stores/investigationStore";
import { useUIStore } from "@/stores/uiStore";
import {
  CONTAMINANT_META,
  SEVERITY_META,
} from "@/lib/agentMeta";
import {
  ExclamationCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export function RecommendationCard() {
  const recommendation = useInvestigationStore(selectRecommendation);
  const affected = useInvestigationStore(selectAffectedLocations);
  const violations = useInvestigationStore(selectViolations);
  const approvalStatus = useInvestigationStore((s) => s.state?.approvalStatus);
  const openApproval = useUIStore((s) => s.openApprovalModal);

  if (!recommendation) {
    return (
      <Panel title="Recommendation" className="h-full" noPadding>
        <div className="h-full flex items-center justify-center text-ink-tertiary text-sm">
          Pending mitigation analysis…
        </div>
      </Panel>
    );
  }

  const sev = recommendation.overallSeverity;
  const meta = SEVERITY_META[sev];
  const sevColor =
    sev === "critical"
      ? "#E5484D"
      : sev === "high"
        ? "#F97A47"
        : sev === "moderate"
          ? "#F5B547"
          : "#22D3B8";
  const contaminantMeta = CONTAMINANT_META[recommendation.contaminant];

  // Build affected-sites mini chart (concentration per node)
  const siteValues = affected.map((a) => a.predictedConcentrationMgL);
  const maxConc = Math.max(1, ...siteValues);

  return (
    <Panel
      title="Recommendation"
      badge={
        <StatusChip
          label={meta.label}
          tone={
            sev === "critical" ? "danger" : sev === "high" ? "warning" : sev === "moderate" ? "warning" : "success"
          }
        />
      }
      className="h-full"
      noPadding
    >
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Hero: donut + hypothesis */}
        <div className="grid grid-cols-[auto_1fr] gap-3 p-3 border-b border-line-subtle items-center">
          <Donut
            value={sev === "critical" ? 1 : sev === "high" ? 0.75 : sev === "moderate" ? 0.5 : 0.25}
            size={72}
            strokeWidth={7}
            color={sevColor}
            label={`${affected.length}`}
            sublabel="SITES"
          />
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-2xs mono px-1.5 py-0.5 rounded-sm"
                style={{ background: `${contaminantMeta.tint}`, color: "#E6ECF5" }}
              >
                {contaminantMeta.label}
              </span>
              {recommendation.suspectedFactoryId && (
                <span className="text-2xs mono text-sev-high">
                  {recommendation.suspectedFactoryId}
                </span>
              )}
            </div>
            <div className="text-sm text-ink-primary leading-snug line-clamp-2">
              {recommendation.primaryHypothesis}
            </div>
            <SeverityBar severity={sev} className="mt-1" />
          </div>
        </div>

        {/* Affected sites sparkline */}
        <div className="px-3 py-2 border-b border-line-subtle">
          <div className="text-[10px] uppercase tracking-[0.14em] mono text-ink-tertiary mb-1">
            Downstream Concentration
          </div>
          <Sparkline
            data={siteValues.length > 0 ? siteValues : [0, 0]}
            color={sevColor}
            height={28}
          />
          <div className="flex justify-between text-[10px] mono text-ink-tertiary mt-0.5">
            <span>{affected[0]?.name ?? "—"}</span>
            <span>peak {maxConc.toFixed(1)} mg/L</span>
          </div>
        </div>

        {/* Action pills (icon-only, no per-action text) */}
        {recommendation.actions.length > 0 && (
          <div className="px-3 py-2 border-b border-line-subtle">
            <div className="text-[10px] uppercase tracking-[0.14em] mono text-ink-tertiary mb-1.5">
              Actions ({recommendation.actions.length})
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {recommendation.actions.map((act) => {
                const c =
                  act.urgency === "critical"
                    ? "#E5484D"
                    : act.urgency === "high"
                      ? "#F97A47"
                      : act.urgency === "moderate"
                        ? "#F5B547"
                        : "#22D3B8";
                return (
                  <div
                    key={act.actionId}
                    className="border-l-2 pl-2 py-0.5"
                    style={{ borderColor: c }}
                  >
                    <div className="text-[11px] text-ink-primary leading-snug line-clamp-2">
                      {act.title}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] mono text-ink-tertiary truncate">
                      <ClockIcon className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{act.estimatedEnvironmentalImpact}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats micro-grid */}
        <div className="grid grid-cols-3 gap-1.5 p-3">
          <MicroStat label="Actions" value={String(recommendation.actions.length)} />
          <MicroStat label="Sites" value={String(affected.length)} />
          <MicroStat label="Violations" value={String(violations.length)} />
        </div>

        {/* Approval footer */}
        <div className="mt-auto px-3 py-2 bg-bg-base/40 border-t border-line-subtle flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-wider mono text-ink-tertiary">
            {approvalStatus === "pending"
              ? "Awaiting authorization"
              : approvalStatus === "approved"
                ? "Authorized"
                : approvalStatus === "rejected"
                  ? "Rejected"
                  : "Auto"}
          </div>
          {approvalStatus === "pending" ? (
            <Button
              variant="danger"
              size="sm"
              onClick={openApproval}
              iconLeft={<ExclamationCircleIcon className="w-3 h-3" />}
            >
              Approve
            </Button>
          ) : (
            <span
              className={
                approvalStatus === "approved"
                  ? "chip chip-severity-low"
                  : approvalStatus === "rejected"
                    ? "chip chip-severity-critical"
                    : "chip"
              }
            >
              {approvalStatus === "approved"
                ? "PASS"
                : approvalStatus === "rejected"
                  ? "DENY"
                  : "AUTO"}
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}

function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line-subtle rounded-sm bg-bg-base/40 px-2 py-1 text-center">
      <div className="text-base mono font-semibold text-ink-primary leading-none">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider mono text-ink-tertiary mt-1">
        {label}
      </div>
    </div>
  );
}