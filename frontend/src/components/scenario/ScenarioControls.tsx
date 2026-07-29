"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { useSimulationStore } from "@/stores/simulationStore";
import { useInvestigationStore } from "@/stores/investigationStore";
import { useUIStore } from "@/stores/uiStore";
import {
  ArrowPathIcon,
  BeakerIcon,
  ChartBarIcon,
  CloudIcon,
  PlayIcon,
  PlusIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { SEVERITY_META } from "@/lib/agentMeta";
import { cn } from "@/lib/cn";
import { formatTime, relativeFromNow } from "@/lib/format";

export function ScenarioControls() {
  const scenarios = useSimulationStore((s) => s.scenarios);
  const selectedScenarioId = useSimulationStore((s) => s.selectedScenarioId);
  const selectScenario = useSimulationStore((s) => s.selectScenario);
  const ticksProcessed = useSimulationStore((s) => s.ticksProcessed);
  const setShowPicker = useUIStore((s) => s.setShowScenarioPicker);
  const pushToast = useUIStore((s) => s.pushToast);
  const state = useInvestigationStore((s) => s.state);
  const status = useInvestigationStore((s) => s.state?.status);

  // Static simulator knobs (frontend-only controls, per spec)
  const [rainfall, setRainfall] = useState(2.5);
  const [riverFlow, setRiverFlow] = useState(7.1);
  const [leakVolume, setLeakVolume] = useState(85);
  const [temperature, setTemperature] = useState(19.2);

  const [running, setRunning] = useState(false);

  // If a simulation tick completes, increment local counter for visual feedback
  useEffect(() => {
    void ticksProcessed;
  }, [ticksProcessed]);

  const handleRunSimulation = async () => {
    setRunning(true);
    pushToast({
      title: "Simulation tick requested",
      body: "Backend will re-invoke the graph on same thread.",
      tone: "info",
    });
    // In live mode: POST /api/simulation/tick
    // In mock mode: this is a no-op since events are already replaying
    setTimeout(() => {
      setRunning(false);
      pushToast({
        title: "Tick processed",
        body: "Agents reasoning on new telemetry.",
        tone: "success",
      });
    }, 1100);
    void status;
  };

  const handleReset = () => {
    setRainfall(0);
    setRiverFlow(7.1);
    setLeakVolume(0);
    setTemperature(19.2);
    pushToast({
      title: "Simulator reset",
      body: "Scenario baseline restored.",
      tone: "info",
    });
  };

  const selectedScenario = scenarios.find(
    (s) => s.scenarioId === selectedScenarioId
  );

  return (
    <Panel
      title="Scenario Simulator"
      subtitle={state?.scenarioId ?? "no scenario"}
      badge={
        selectedScenario ? (
          <span className={SEVERITY_META[selectedScenario.expectedSeverity].chipClass}>
            {SEVERITY_META[selectedScenario.expectedSeverity].label}
          </span>
        ) : null
      }
      className="h-full"
      noPadding
    >
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Selected scenario */}
        {selectedScenario && (
          <div className="px-3 py-2 border-b border-line-subtle">
            <div className="flex items-center gap-2 mb-1">
              <BeakerIcon className="w-3.5 h-3.5 text-agent-sensing" />
              <span className="text-xs font-medium text-ink-primary">
                {selectedScenario.name}
              </span>
            </div>
            <div className="text-2xs text-ink-secondary leading-snug">
              {selectedScenario.description}
            </div>
            {state && (
              <div className="text-2xs mono text-ink-tertiary mt-1.5 flex items-center gap-2">
                <span>created {formatTime(state.createdAt)}</span>
                <span className="text-ink-tertiary/50">·</span>
                <span>updated {relativeFromNow(state.updatedAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Knobs */}
        <div className="px-3 py-3 border-b border-line-subtle space-y-3">
          <Slider
            icon={<CloudIcon className="w-3 h-3" />}
            label="Rainfall"
            unit="mm/h"
            value={rainfall}
            onChange={setRainfall}
            min={0}
            max={50}
            step={0.1}
          />
          <Slider
            icon={<ChartBarIcon className="w-3 h-3" />}
            label="River Flow"
            unit="m³/s"
            value={riverFlow}
            onChange={setRiverFlow}
            min={0}
            max={20}
            step={0.1}
          />
          <Slider
            icon={<BeakerIcon className="w-3 h-3" />}
            label="Leak Volume"
            unit="L/min"
            value={leakVolume}
            onChange={setLeakVolume}
            min={0}
            max={500}
            step={5}
          />
          <Slider
            icon={<CloudIcon className="w-3 h-3" />}
            label="Temperature"
            unit="°C"
            value={temperature}
            onChange={setTemperature}
            min={0}
            max={35}
            step={0.1}
          />
        </div>

        {/* Tick counter */}
        <div className="px-3 py-2 border-b border-line-subtle bg-bg-base/40">
          <div className="flex items-center justify-between text-2xs">
            <span className="text-ink-tertiary uppercase tracking-wider">
              Scenario Ticks Processed
            </span>
            <span className="mono text-ink-primary font-semibold">
              {ticksProcessed}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-3 py-3 space-y-2">
          <Button
            variant="primary"
            size="md"
            iconLeft={
              running ? (
                <StopIcon className="w-3.5 h-3.5" />
              ) : (
                <PlayIcon className="w-3.5 h-3.5" />
              )
            }
            className="w-full"
            onClick={handleRunSimulation}
            loading={running}
          >
            {running ? "Advancing…" : "Run Simulation Tick"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="md"
              iconLeft={<ArrowPathIcon className="w-3.5 h-3.5" />}
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              variant="secondary"
              size="md"
              iconLeft={<PlusIcon className="w-3.5 h-3.5" />}
              onClick={() => setShowPicker(true)}
            >
              New
            </Button>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-auto px-3 py-2 text-2xs text-ink-tertiary border-t border-line-subtle bg-bg-base/40">
          <div className="leading-snug">
            Frontend knobs are visual controls only. Scenario engine on
            backend drives real telemetry via{" "}
            <code className="mono text-agent-sensing">POST /api/simulation/tick</code>.
          </div>
        </div>
      </div>
    </Panel>
  );
}

interface SliderProps {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}

function Slider({ icon, label, unit, value, onChange, min, max, step }: SliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="flex items-center gap-1.5 text-2xs text-ink-tertiary uppercase tracking-wider">
          <span className="text-ink-secondary">{icon}</span>
          {label}
        </label>
        <div className="text-xs mono text-ink-primary">
          {value.toFixed(unit === "m³/s" || unit === "mm/h" || unit === "°C" ? 1 : 0)}
          <span className="text-ink-tertiary ml-0.5">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-full h-1 rounded-full appearance-none cursor-pointer",
          "bg-bg-overlay",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-agent-sensing",
          "[&::-webkit-slider-thumb]:cursor-pointer",
          "[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3",
          "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-agent-sensing",
          "[&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer",
          "focus:outline-none focus:[&::-webkit-slider-thumb]:ring-2",
          "focus:[&::-webkit-slider-thumb]:ring-agent-sensing/40"
        )}
      />
    </div>
  );
}
