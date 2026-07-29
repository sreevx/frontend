"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BeakerIcon,
  XMarkIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { useUIStore } from "@/stores/uiStore";
import { useSimulationStore } from "@/stores/simulationStore";
import { useInvestigationStore } from "@/stores/investigationStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { StatusChip } from "@/components/ui/StatusChip";
import { SEVERITY_META } from "@/lib/agentMeta";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import type { ScenarioSummary } from "../../types";

interface PickerProps {
  onLaunched?: (scenarioId: string, investigationId: string) => void;
}

export function ScenarioPickerModal({ onLaunched }: PickerProps) {
  const open = useUIStore((s) => s.showScenarioPicker);
  const setOpen = useUIStore((s) => s.setShowScenarioPicker);
  const scenarios = useSimulationStore((s) => s.scenarios);
  const setScenarios = useSimulationStore((s) => s.setScenarios);
  const selectedScenarioId = useSimulationStore((s) => s.selectedScenarioId);
  const selectScenario = useSimulationStore((s) => s.selectScenario);
  const setLaunching = useSimulationStore((s) => s.setLaunching);
  const isLaunching = useSimulationStore((s) => s.isLaunching);
  const hydrate = useInvestigationStore((s) => s.hydrate);
  const reset = useInvestigationStore((s) => s.reset);
  const pushToast = useUIStore((s) => s.pushToast);

  const setConnStatus = useConnectionStore((s) => s.setStatus);
  const resetConn = useConnectionStore((s) => s.reset);

  // Load scenarios on first open (in live mode)
  useEffect(() => {
    if (open && scenarios.length === 0) {
      api.listScenarios().then(setScenarios).catch(() => {
        // Live fetch failed; fall back to seeded scenarios from mock-data
        // The scenarios store will be populated by the dashboard's hydrator.
        // Just ensure the picker shows something:
        setScenarios([
          {
            scenarioId: "scenario-industrial-solvent-01",
            name: "Industrial Solvent Discharge",
            description: "Upstream factory discharge event with rising turbidity.",
            expectedSeverity: "high",
          },
          {
            scenarioId: "scenario-false-positive-01",
            name: "Agricultural Runoff (False Positive)",
            description: "Naturally elevated turbidity following rainfall.",
            expectedSeverity: "low",
          },
          {
            scenarioId: "scenario-multi-source-01",
            name: "Ambiguous Multi-Source Event",
            description: "Two simultaneous anomalies forcing multiple iterations.",
            expectedSeverity: "critical",
          },
        ]);
      });
    }
  }, [open, scenarios.length, setScenarios]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const handleLaunch = async (scenario: ScenarioSummary) => {
    selectScenario(scenario.scenarioId);
    setLaunching(true);
    try {
      const resp = await api.startInvestigation({
        scenarioId: scenario.scenarioId,
      });
      pushToast({
        title: "Investigation launched",
        body: `ID ${resp.investigationId.slice(0, 12)}… — swarm running.`,
        tone: "info",
      });
      // Reset prior state
      resetConn();
      setConnStatus("connecting");
      reset();
      // Fetch the initial state via REST
      const state = await api.getInvestigationState(resp.investigationId);
      hydrate(state);
      setConnStatus("live");
      onLaunched?.(scenario.scenarioId, resp.investigationId);
      setOpen(false);
    } catch (err) {
      pushToast({
        title: "Launch failed",
        body: err instanceof Error ? err.message : "Unable to start investigation.",
        tone: "error",
      });
    } finally {
      setLaunching(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="picker-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-bg-base/85 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="panel max-w-2xl w-full flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle">
            <div className="flex items-center gap-2">
              <BeakerIcon className="w-5 h-5 text-agent-sensing" />
              <div>
                <div className="text-2xs uppercase tracking-[0.18em] text-ink-tertiary">
                  Launch New Mission
                </div>
                <h2 className="text-base font-semibold text-ink-primary">
                  Select Scenario
                </h2>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-tertiary hover:text-ink-primary"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {scenarios.length === 0 ? (
              <div className="text-sm text-ink-tertiary text-center py-6">
                Loading scenarios…
              </div>
            ) : (
              scenarios.map((s) => {
                const sev = SEVERITY_META[s.expectedSeverity];
                const isSelected = s.scenarioId === selectedScenarioId;
                return (
                  <button
                    key={s.scenarioId}
                    onClick={() => handleLaunch(s)}
                    disabled={isLaunching}
                    className={cn(
                      "panel w-full px-3 py-3 text-left flex items-start gap-3",
                      "transition-colors",
                      isSelected
                        ? "border-agent-sensing/50 bg-[rgba(56,189,248,0.06)]"
                        : "hover:border-line-strong hover:bg-bg-overlay"
                    )}
                  >
                    <div className="w-9 h-9 rounded border border-line-default bg-bg-overlay flex items-center justify-center shrink-0">
                      <BeakerIcon
                        className={cn(
                          "w-4 h-4",
                          s.expectedSeverity === "critical"
                            ? "text-sev-critical"
                            : s.expectedSeverity === "high"
                              ? "text-sev-high"
                              : s.expectedSeverity === "moderate"
                                ? "text-sev-moderate"
                                : "text-sev-low"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink-primary truncate">
                          {s.name}
                        </span>
                        <span className={sev.chipClass}>{sev.label}</span>
                      </div>
                      <div className="text-2xs text-ink-secondary mt-0.5 leading-snug">
                        {s.description}
                      </div>
                      <div className="text-2xs mono text-ink-tertiary mt-1">
                        {s.scenarioId}
                      </div>
                    </div>
                    <PlayIcon className="w-4 h-4 text-ink-tertiary self-center shrink-0" />
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-line-subtle px-4 py-3 bg-bg-base/40 text-2xs text-ink-tertiary">
            Selecting a scenario seeds telemetry and starts the swarm. The
            LangGraph workflow runs once per investigation with checkpointing.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
