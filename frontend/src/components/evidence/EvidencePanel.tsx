"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/Panel";
import { StatusChip } from "@/components/ui/StatusChip";
import { Sparkline } from "@/components/ui/infographics";
import { cn } from "@/lib/cn";
import {
  useInvestigationStore,
  selectTelemetry,
  selectEvidence,
  selectReasoningSteps,
  selectRecommendation,
  selectViolations,
  selectWeather,
} from "@/stores/investigationStore";
import { AGENT_META, toolLabel, SEVERITY_META } from "@/lib/agentMeta";
import {
  CloudIcon,
  ChartBarIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ScaleIcon,
  MapIcon,
} from "@heroicons/react/24/outline";
import {
  formatConcentration,
  formatPercent,
  formatTime,
} from "@/lib/format";
import type { AgentName } from "@/types";

const TABS = [
  { id: "reasoning", label: "Reasoning", Icon: SparklesIcon },
  { id: "evidence", label: "Evidence", Icon: ScaleIcon },
  { id: "sensors", label: "Sensors", Icon: BeakerIcon },
  { id: "context", label: "Context", Icon: CloudIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

const AGENT_HEX: Record<AgentName, string> = {
  sensing: "#38BDF8",
  hydrodynamic: "#5B8DEF",
  regulatory: "#A78BFA",
  mitigation: "#34D399",
};

export function EvidencePanel() {
  const [tab, setTab] = useState<TabId>("reasoning");
  const confidence = useInvestigationStore((s) => s.state?.confidence ?? 0);
  const recommendation = useInvestigationStore(selectRecommendation);
  const reasoning = useInvestigationStore(selectReasoningSteps);
  const evidence = useInvestigationStore(selectEvidence);
  const sensors = useInvestigationStore(selectTelemetry);
  const violations = useInvestigationStore(selectViolations);
  const weather = useInvestigationStore(selectWeather);

  return (
    <Panel
      title="Evidence"
      subtitle="Why the swarm concluded"
      badge={
        <StatusChip
          label={formatPercent(confidence, 0)}
          tone={confidence >= 0.85 ? "success" : "warning"}
        />
      }
      className="h-full"
      noPadding
    >
      <div className="flex flex-col h-full">
        {/* Hero: hypothesis banner */}
        <div className="px-3 py-2 border-b border-line-subtle bg-bg-base/40">
          {recommendation ? (
            <div className="text-xs text-ink-primary leading-snug">
              {recommendation.primaryHypothesis}
            </div>
          ) : (
            <div className="text-xs text-ink-tertiary italic">
              Reasoning in progress…
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-line-subtle px-1">
          {TABS.map((t) => {
            const Icon = t.Icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-2.5 py-1.5 text-2xs uppercase tracking-wider mono transition-colors relative flex items-center gap-1",
                  tab === t.id
                    ? "text-ink-primary"
                    : "text-ink-tertiary hover:text-ink-secondary"
                )}
              >
                <Icon className="w-3 h-3" />
                {t.label}
                {tab === t.id && (
                  <motion.div
                    layoutId="evidence-tab"
                    className="absolute bottom-0 inset-x-1 h-0.5 bg-agent-sensing"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            {tab === "reasoning" && (
              <motion.div
                key="reasoning"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 space-y-2"
              >
                <ReasoningChain steps={reasoning} />
              </motion.div>
            )}
            {tab === "evidence" && (
              <motion.div
                key="evidence"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 space-y-2"
              >
                <EvidenceList evidence={evidence} violations={violations} />
              </motion.div>
            )}
            {tab === "sensors" && (
              <motion.div
                key="sensors"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 space-y-1.5"
              >
                <SensorAnomalyList sensors={sensors} />
              </motion.div>
            )}
            {tab === "context" && (
              <motion.div
                key="context"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 space-y-2"
              >
                <EnvironmentalContext weather={weather} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Confidence composition bar */}
        <div className="border-t border-line-subtle px-3 py-1.5 bg-bg-base/40">
          <div className="flex items-center h-1.5 rounded-sm overflow-hidden bg-bg-overlay gap-px">
            {evidence.map((e, i) => (
              <motion.div
                key={e.evidenceId}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.abs(e.confidenceContribution) * 100}%`,
                }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className="h-full"
                style={{
                  background:
                    e.confidenceContribution > 0
                      ? AGENT_HEX[e.sourceAgent]
                      : "#E5484D",
                  opacity: 0.5 + Math.abs(e.confidenceContribution) * 0.5,
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] mono text-ink-tertiary">
            <span className="flex items-center gap-1">
              <ChartBarIcon className="w-2.5 h-2.5" />
              {evidence.length} items
            </span>
            <span>Σ {formatPercent(confidence, 0)}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ReasoningChain({
  steps,
}: {
  steps: ReturnType<typeof selectReasoningSteps>;
}) {
  if (steps.length === 0) {
    return (
      <div className="text-xs text-ink-tertiary italic text-center py-6">
        Waiting for agent steps…
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => (
        <ReasoningStep key={s.stepId} step={s} index={i} />
      ))}
    </div>
  );
}

function ReasoningStep({
  step,
  index,
}: {
  step: ReturnType<typeof selectReasoningSteps>[number];
  index: number;
}) {
  const meta = AGENT_META[step.agent];
  const colorHex = AGENT_HEX[step.agent];
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative pl-3.5"
    >
      <div
        className="absolute left-0 top-1.5 w-2 h-2 rounded-full"
        style={{ background: colorHex, boxShadow: `0 0 6px ${colorHex}99` }}
      />
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] mono uppercase tracking-wider px-1 rounded-sm"
            style={{ background: `${colorHex}1A`, color: colorHex }}
          >
            {meta.shortLabel}
          </span>
          <span className="text-[10px] mono text-ink-tertiary">
            iter {step.iteration}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {typeof step.confidenceAfter === "number" && (
            <span className="text-[10px] mono text-agent-sensing font-semibold">
              {formatPercent(step.confidenceAfter, 0)}
            </span>
          )}
          <span className="text-[10px] mono text-ink-tertiary">
            {formatTime(step.timestamp)}
          </span>
        </div>
      </div>
      <div className="text-[11px] text-ink-primary leading-snug">
        {step.conclusion}
      </div>
      {step.toolUsed && step.observation && (
        <div className="text-[10px] mono text-ink-secondary bg-bg-base/60 rounded-sm px-1.5 py-0.5 mt-0.5 border border-line-subtle">
          <span className="text-ink-tertiary">{toolLabel(step.toolUsed)}:</span>{" "}
          {step.observation.slice(0, 80)}
        </div>
      )}
    </motion.div>
  );
}

function EvidenceList({
  evidence,
  violations,
}: {
  evidence: ReturnType<typeof selectEvidence>;
  violations: ReturnType<typeof selectViolations>;
}) {
  if (evidence.length === 0 && violations.length === 0) {
    return (
      <div className="text-xs text-ink-tertiary italic text-center py-6">
        Collecting…
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {violations.map((v) => {
        const meta = SEVERITY_META["high"];
        return (
          <div
            key={v.violationId}
            className="panel px-2.5 py-1.5 border-l-2 border-sev-critical flex items-center gap-2"
          >
            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-sev-critical shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="mono text-xs text-ink-primary font-semibold">
                  {v.factoryId}
                </span>
                <span className="text-[10px] mono text-ink-tertiary">
                  {v.contaminant.replace("_", " ")}
                </span>
              </div>
              <div className="text-[10px] mono text-ink-secondary">
                {v.measuredValueMgL.toFixed(2)} mg/L · limit{" "}
                {v.legalLimitMgL.toFixed(2)}
              </div>
            </div>
            <span className={meta.chipClass}>
              {v.exceedanceFactor.toFixed(1)}x
            </span>
          </div>
        );
      })}

      {evidence.map((e) => {
        const meta = AGENT_META[e.sourceAgent];
        const colorHex = AGENT_HEX[e.sourceAgent];
        const positive = e.confidenceContribution > 0;
        return (
          <motion.div
            key={e.evidenceId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="panel px-2.5 py-1.5"
            style={{ borderLeft: `2px solid ${colorHex}` }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] mono uppercase tracking-wider px-1 rounded-sm"
                  style={{ background: `${colorHex}1A`, color: colorHex }}
                >
                  {meta.shortLabel}
                </span>
                {e.sourceTool && (
                  <span className="text-[10px] mono text-ink-tertiary">
                    {toolLabel(e.sourceTool)}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mono font-semibold",
                  positive ? "text-sev-low" : "text-sev-critical"
                )}
              >
                {positive ? "+" : ""}
                {formatPercent(e.confidenceContribution, 0)}
              </span>
            </div>
            <div className="text-[11px] text-ink-primary leading-snug line-clamp-2">
              {e.description}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function SensorAnomalyList({
  sensors,
}: {
  sensors: ReturnType<typeof selectTelemetry>;
}) {
  const sorted = [...sensors].sort((a, b) => b.anomalyScore - a.anomalyScore);
  if (sorted.length === 0) {
    return (
      <div className="text-xs text-ink-tertiary italic text-center py-6">
        No telemetry.
      </div>
    );
  }
  const values = sorted.map((s) => s.anomalyScore);
  return (
    <div className="space-y-1">
      <Sparkline data={values} color="#F97A47" height={28} />
      {sorted.slice(0, 8).map((s) => {
        const c =
          s.anomalyScore > 0.7
            ? "#E5484D"
            : s.anomalyScore > 0.4
              ? "#F97A47"
              : "#22D3B8";
        return (
          <div
            key={s.sensorId}
            className="flex items-center gap-2 py-1 px-1.5 rounded-sm hover:bg-bg-overlay/50"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: c }}
            />
            <span className="text-[11px] text-ink-primary truncate flex-1 min-w-0">
              {s.stationName}
            </span>
            <span className="text-[10px] mono text-ink-tertiary shrink-0">
              {s.sensorId}
            </span>
            <div className="w-12 h-1 bg-bg-base rounded-sm overflow-hidden border border-line-subtle shrink-0">
              <div
                className="h-full"
                style={{ width: `${s.anomalyScore * 100}%`, background: c }}
              />
            </div>
            <span className="text-[10px] mono text-ink-secondary w-9 text-right shrink-0">
              {formatPercent(s.anomalyScore, 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EnvironmentalContext({
  weather,
}: {
  weather: ReturnType<typeof selectWeather>;
}) {
  void useInvestigationStore;
  return (
    <div className="space-y-1.5">
      {weather.map((w, i) => (
        <div
          key={i}
          className="panel px-2.5 py-1.5 border-l-2 border-agent-sensing/50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] mono text-ink-tertiary">
              {formatTime(w.timestamp)}
            </span>
            <span className="text-[10px] mono uppercase text-ink-secondary">
              {w.recentRainfallTrend}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px] mono">
            <Metric label="precip" value={`${w.precipitationMm.toFixed(1)}mm`} />
            <Metric label="wind" value={`${w.windSpeedKmh.toFixed(1)}`} />
            <Metric label="dir" value={`${w.windDirectionDeg}°`} />
            <Metric label="temp" value={`${w.temperatureC.toFixed(1)}°`} />
          </div>
        </div>
      ))}

      <div className="panel px-2.5 py-1.5 border-l-2 border-agent-regulatory/50">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] mono text-ink-secondary flex items-center gap-1">
            <MapIcon className="w-2.5 h-2.5" />
            sat_20260729_0600
          </span>
          <span className="chip">CF-14 · 18.5 km²</span>
        </div>
        <div className="text-[10px] mono text-ink-tertiary">
          visible plume · 340m · conf 0.74
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-tertiary">{label}</div>
      <div className="text-ink-primary">{value}</div>
    </div>
  );
}

// avoid unused warning
void useInvestigationStore;