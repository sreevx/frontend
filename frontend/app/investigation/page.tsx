"use client";

import { Panel } from "@/components/ui/Panel";
import { Donut } from "@/components/ui/infographics";
import { EvidencePanel } from "@/components/evidence/EvidencePanel";
import { SwarmAgents } from "@/components/swarm/SwarmAgents";
import { WatershedMap } from "@/components/map/WatershedMap";
import {
  useInvestigationStore,
  selectConfidence,
  selectRecommendation,
} from "@/stores/investigationStore";
import { SEVERITY_META } from "@/lib/agentMeta";

export default function InvestigationPage() {
  const confidence = useInvestigationStore(selectConfidence);
  const recommendation = useInvestigationStore(selectRecommendation);
  const severity = recommendation?.overallSeverity ?? "low";
  const sevColor =
    severity === "critical"
      ? "#E5484D"
      : severity === "high"
        ? "#F97A47"
        : severity === "moderate"
          ? "#F5B547"
          : "#22D3B8";

  return (
    <div className="h-full w-full overflow-hidden p-2 flex flex-col gap-2">
      {/* Real map — Cedar Fork Basin */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <WatershedMap />
      </div>

      {/* Compact status strip — donut + chips */}
      <Panel title="AI Investigation" className="shrink-0" noPadding>
        <div className="px-3 py-2 flex items-center gap-4">
          <Donut
            value={confidence}
            size={48}
            strokeWidth={5}
            color="#38BDF8"
            label={`${Math.round(confidence * 100)}%`}
            sublabel=""
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Stat label="CONF" value={`${Math.round(confidence * 100)}%`} color="#38BDF8" />
            <Stat
              label="RISK"
              value={SEVERITY_META[severity].label}
              color={sevColor}
            />
            <Stat
              label="HYP"
              value={recommendation ? "SET" : "—"}
              color={recommendation ? "#22D3B8" : "#5E6B82"}
            />
            <Stat
              label="APPR"
              value={
                recommendation?.requiresApproval
                  ? "REQ"
                  : recommendation
                    ? "AUTO"
                    : "—"
              }
              color={recommendation?.requiresApproval ? "#E5484D" : "#22D3B8"}
            />
          </div>
        </div>
      </Panel>

      {/* 4-agent swarm with hex pipeline + Evidence */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          gridTemplateRows: "minmax(0, 1fr)",
          height: "minmax(280px, 38%)",
        }}
      >
        <div className="min-h-0 min-w-0 overflow-hidden">
          <SwarmAgents />
        </div>
        <div className="min-h-0 min-w-0 overflow-hidden">
          <EvidencePanel />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 border border-line-subtle rounded-sm bg-bg-base/40">
      <span
        className="text-[10px] mono uppercase tracking-wider"
        style={{ color }}
      >
        {label}
      </span>
      <span className="text-xs mono font-semibold text-ink-primary">
        {value}
      </span>
    </div>
  );
}
