# EVENTS.md
## AquaSentinel Server-Sent Events Catalogue

Endpoint: `GET /api/events/:investigationId`
Content-Type: `text/event-stream`

Wire format (standard SSE framing):
```
event: <SSEEventType>
data: <JSON matching the corresponding interface in shared/types.ts>

```

All events extend `BaseSSEEvent { type, investigationId, timestamp }`. Full type unions live in `shared/types.ts` as `SSEEvent`.

---

## 1. `workflow.started`
Emitted once, immediately after `POST /api/investigations` seeds initial state.

```json
{
  "type": "workflow.started",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:00.100Z",
  "payload": { "scenarioId": "scenario-industrial-solvent-01" }
}
```
**Frontend consumer:** Dashboard header — transitions status badge to "Running", starts the agent timeline.

---

## 2. `agent.started`
Emitted when a specialist agent node begins execution.

```json
{
  "type": "agent.started",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:00.500Z",
  "payload": { "agent": "sensing", "iteration": 1 }
}
```
**Frontend consumer:** Agent swarm visualization — highlights the active agent node.

---

## 3. `tool.called`
Emitted the moment an agent invokes a tool (start of the "Tool" step in ReAct).

```json
{
  "type": "tool.called",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:01.000Z",
  "payload": {
    "agent": "sensing",
    "tool": "sensor_reader",
    "input": { "stationIds": ["CF-14", "CF-15"] }
  }
}
```
**Frontend consumer:** Tool call ticker / activity log.

---

## 4. `tool.completed`
Emitted when a tool call resolves (end of "Observation" step).

```json
{
  "type": "tool.completed",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:01.340Z",
  "payload": {
    "agent": "sensing",
    "tool": "sensor_reader",
    "output": { "readingsReturned": 2, "anomalyDetected": true },
    "durationMs": 340
  }
}
```
**Frontend consumer:** Tool call ticker (marks call complete), triggers evidence feed refresh.

---

## 5. `reasoning.updated`
Emitted after an agent's Gemini reasoning call produces a new conclusion.

```json
{
  "type": "reasoning.updated",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:02.100Z",
  "payload": {
    "step": {
      "stepId": "step_004",
      "agent": "sensing",
      "iteration": 1,
      "thought": "Turbidity and conductivity both spiked at CF-14 within the same 10-minute window.",
      "toolUsed": "sensor_reader",
      "observation": "2 anomalous readings at CF-14, CF-15",
      "conclusion": "Likely point-source contamination near CF-14.",
      "confidenceAfter": 0.62,
      "timestamp": "2026-07-29T06:12:02.100Z"
    }
  }
}
```
**Frontend consumer:** Reasoning trace panel (chain-of-thought viewer).

---

## 6. `confidence.updated`
Emitted whenever `state.confidence` changes.

```json
{
  "type": "confidence.updated",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:02.150Z",
  "payload": { "previousConfidence": 0.41, "newConfidence": 0.62, "agent": "sensing" }
}
```
**Frontend consumer:** Confidence gauge widget (animated needle/progress ring).

---

## 7. `state.updated`
Emitted after every reducer merge, listing which top-level fields changed (lightweight diff signal — full state is fetched via REST when needed).

```json
{
  "type": "state.updated",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:02.160Z",
  "payload": { "changedFields": ["evidence", "confidence", "reasoningHistory"] }
}
```
**Frontend consumer:** Triggers targeted re-fetch of `GET /api/investigations/:id` for changed panels only.

---

## 8. `agent.completed`
Emitted when an agent node finishes and control passes to the conditional edge.

```json
{
  "type": "agent.completed",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:02.200Z",
  "payload": { "agent": "sensing", "iteration": 1, "durationMs": 1700 }
}
```
**Frontend consumer:** Agent swarm visualization — marks node complete, shows duration badge.

---

## 9. `approval.requested`
Emitted when the graph calls `interrupt()` ahead of a critical mitigation action.

```json
{
  "type": "approval.requested",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:13:40.000Z",
  "payload": {
    "recommendation": {
      "summary": "Issue emergency containment order to Factory FAC-07 and notify downstream municipalities.",
      "primaryHypothesis": "Industrial solvent discharge from FAC-07",
      "suspectedFactoryId": "FAC-07",
      "contaminant": "industrial_solvent",
      "overallSeverity": "high",
      "actions": [
        {
          "actionId": "act_01",
          "title": "Issue emergency containment order",
          "description": "Halt discharge at FAC-07 pending inspection.",
          "urgency": "critical",
          "estimatedEnvironmentalImpact": "Prevents further spread to 3 downstream municipalities within 6 hours.",
          "requiresHumanApproval": true
        }
      ],
      "requiresApproval": true
    }
  }
}
```
**Frontend consumer:** Approval modal — this is the primary trigger for the human-in-the-loop UI.

---

## 10. `workflow.completed`
Emitted once the graph reaches a terminal state (approved-and-resolved, or no-approval-needed).

```json
{
  "type": "workflow.completed",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:20:00.000Z",
  "payload": {
    "status": "completed",
    "recommendation": { "summary": "..." }
  }
}
```
**Frontend consumer:** Dashboard header status badge, enables "Generate Report" button, closes SSE connection.

---

## 11. `simulation.completed`
Emitted after a scenario engine tick batch finishes processing (distinct from workflow completion — a scenario can have multiple ticks per investigation).

```json
{
  "type": "simulation.completed",
  "investigationId": "inv_8f3a1c",
  "timestamp": "2026-07-29T06:12:03.000Z",
  "payload": { "scenarioId": "scenario-industrial-solvent-01", "ticksProcessed": 1 }
}
```
**Frontend consumer:** Scenario control panel — re-enables the "Advance Simulation" button.

---

## Event Ordering Guarantee

Within a single investigation, events are emitted in strict causal order as produced by the graph (the EventBus is a single-threaded in-memory emitter — no reordering). Cross-investigation ordering is not guaranteed and does not matter, since each SSE connection is scoped to one `investigationId`.
