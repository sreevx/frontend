"use client";

import { useEffect, useRef } from "react";
import {
  useInvestigationStore,
} from "@/stores/investigationStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSimulationStore } from "@/stores/simulationStore";
import { useUIStore } from "@/stores/uiStore";
import { createSSEClient, type SSEClient } from "@/lib/sseClient";
import type { SSEEvent, WorkflowState } from "../../types";

import seedState from "../../mock-data/mock-state.json";
import seedEvents from "../../mock-data/mock-events.json";
import seedSimulation from "../../mock-data/mock-simulation.json";

const SEED_INVESTIGATION_ID: string = (seedState as WorkflowState).investigationId;

/**
 * MissionProvider — bootstraps the SSE stream and keeps it alive across
 * navigations. Mounts once at the root layout, above all routes.
 *
 * Hydrates the investigation state, seeds scenarios, opens the SSE
 * (mock replay or live EventSource depending on env), and routes incoming
 * events into the store. Also auto-opens the approval modal when the
 * backend requests human authorization.
 */
export function MissionProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useInvestigationStore((s) => s.hydrate);
  const applyEvent = useInvestigationStore((s) => s.applyEvent);
  const recordEvent = useConnectionStore((s) => s.recordEvent);
  const setConnStatus = useConnectionStore((s) => s.setStatus);
  const resetConn = useConnectionStore((s) => s.reset);
  const setScenarios = useSimulationStore((s) => s.setScenarios);
  const pushToast = useUIStore((s) => s.pushToast);
  const openApprovalModal = useUIStore((s) => s.openApprovalModal);

  const sseRef = useRef<SSEClient | null>(null);
  const approvalTriggeredRef = useRef(false);

  useEffect(() => {
    // Seed scenarios
    setScenarios(
      seedSimulation.scenarios.map((s) => ({
        scenarioId: s.scenarioId,
        name: s.name,
        description: s.description,
        expectedSeverity: s.expectedSeverity as
          | "low"
          | "moderate"
          | "high"
          | "critical",
      }))
    );

    // Hydrate state
    hydrate(seedState as WorkflowState);

    // Reset approval trigger when a new investigation begins
    approvalTriggeredRef.current = false;

    // Mock SSE replay
    const events = seedEvents as unknown as SSEEvent[];
    const client = createSSEClient({
      onStatusChange: (mode) => {
        if (mode === "mock") setConnStatus("mock");
        else if (mode === "live") setConnStatus("live");
        else setConnStatus("disconnected");
      },
      onEvent: (ev) => {
        applyEvent(ev);
        recordEvent(ev.timestamp);

        if (ev.type === "approval.requested" && !approvalTriggeredRef.current) {
          approvalTriggeredRef.current = true;
          openApprovalModal();
          pushToast({
            title: "Approval requested",
            body: "Critical mitigation action awaiting human authorization.",
            tone: "warning",
          });
        }

        if (ev.type === "workflow.completed") {
          pushToast({
            title: "Workflow completed",
            body: "Incident report is ready.",
            tone: "success",
          });
        }
      },
      onError: () => setConnStatus("error"),
    });

    client.setReplayingEvents(events);
    client.connect(SEED_INVESTIGATION_ID);
    setConnStatus("mock");

    sseRef.current = client;
    return () => {
      client.disconnect();
      resetConn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
