# API_CONTRACT.md
## AquaSentinel REST API — v1

**This contract is LOCKED.** Structures defined here will not change after Phase 1 approval. New fields may only be added as optional; nothing here will be removed or renamed without a versioned break.

Base URL (local dev): `http://localhost:4000/api`

All bodies are JSON. All timestamps are ISO 8601 UTC strings. All types referenced below live in `shared/types.ts`.

---

## 1. Start Investigation

Kicks off a new LangGraph workflow run seeded from a scenario.

```
POST /api/investigations
```

**Request body** — `StartInvestigationRequest`
```json
{
  "scenarioId": "scenario-industrial-solvent-01"
}
```

**Response — 202 Accepted** — `StartInvestigationResponse`
```json
{
  "investigationId": "inv_8f3a1c",
  "status": "running",
  "createdAt": "2026-07-29T06:12:00.000Z"
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 400 | `INVALID_SCENARIO` | `scenarioId` not found in mock-data |
| 500 | `WORKFLOW_START_FAILED` | Graph invocation threw before first checkpoint |

**Frontend component:** "New Investigation" launcher / scenario picker.

---

## 2. Get Current Workflow State

Poll the full shared state of a running or completed investigation.

```
GET /api/investigations/:investigationId
```

**Response — 200 OK** — `GetWorkflowStateResponse`
```json
{
  "state": {
    "investigationId": "inv_8f3a1c",
    "scenarioId": "scenario-industrial-solvent-01",
    "status": "awaiting_approval",
    "telemetry": [ /* SensorReading[] */ ],
    "watershedNetwork": { "basinName": "Cedar Fork Basin", "nodes": [] },
    "weather": [ /* WeatherSnapshot[] */ ],
    "factories": [ /* Factory[] */ ],
    "evidence": [ /* EvidenceItem[] */ ],
    "violations": [ /* RegulatoryViolation[] */ ],
    "affectedLocations": [ /* AffectedLocation[] */ ],
    "confidence": 0.87,
    "reasoningHistory": [ /* ReasoningStep[] */ ],
    "toolHistory": [ /* ToolCallRecord[] */ ],
    "workflowIteration": 2,
    "maxIterations": 5,
    "approvalStatus": "pending",
    "approvalNotes": null,
    "recommendation": { "summary": "..." },
    "createdAt": "2026-07-29T06:12:00.000Z",
    "updatedAt": "2026-07-29T06:13:42.000Z"
  }
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 404 | `INVESTIGATION_NOT_FOUND` | Unknown `investigationId` |

**Frontend component:** Mission Control main dashboard (state panel, confidence gauge, evidence feed).

---

## 3. Scenario Simulation (drive telemetry ticks)

Pushes the next batch of simulated telemetry into a running investigation, re-invoking the graph on the same thread.

```
POST /api/simulation/tick
```

**Request body** — `SimulateScenarioRequest`
```json
{
  "scenarioId": "scenario-industrial-solvent-01",
  "investigationId": "inv_8f3a1c"
}
```

**Response — 200 OK** — `SimulateScenarioResponse`
```json
{
  "investigationId": "inv_8f3a1c",
  "ticksProcessed": 1,
  "status": "running"
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 404 | `INVESTIGATION_NOT_FOUND` | Unknown `investigationId` |
| 409 | `WORKFLOW_NOT_RUNNING` | Investigation already completed/failed |

**Frontend component:** Scenario control panel ("Advance Simulation" button / auto-tick timer).

---

## 4. List Available Scenarios

```
GET /api/scenarios
```

**Response — 200 OK** — `ListScenariosResponse`
```json
{
  "scenarios": [
    {
      "scenarioId": "scenario-industrial-solvent-01",
      "name": "Industrial Solvent Discharge",
      "description": "Upstream factory discharge event with rising turbidity and solvent signature.",
      "expectedSeverity": "high"
    },
    {
      "scenarioId": "scenario-false-positive-01",
      "name": "Agricultural Runoff (False Positive)",
      "description": "Naturally elevated turbidity from rainfall; no regulatory violation.",
      "expectedSeverity": "low"
    }
  ]
}
```

**Frontend component:** Scenario picker dropdown on the launcher screen.

---

## 5. Human Approval

Resumes a paused graph (`interrupt()`) with a human decision.

```
POST /api/investigations/:investigationId/approve
```

**Request body** — `ApprovalRequest`
```json
{
  "decision": "approve",
  "notes": "Confirmed with field team, proceeding with containment order."
}
```

**Response — 200 OK** — `ApprovalResponse`
```json
{
  "investigationId": "inv_8f3a1c",
  "approvalStatus": "approved",
  "status": "completed"
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 404 | `INVESTIGATION_NOT_FOUND` | Unknown `investigationId` |
| 409 | `NO_APPROVAL_PENDING` | `approvalStatus` was not `"pending"` |
| 400 | `INVALID_DECISION` | `decision` not `"approve"` or `"reject"` |

**Frontend component:** Approval modal triggered by the `approval.requested` SSE event.

---

## 6. Generate Report

```
GET /api/investigations/:investigationId/report
```

**Response — 200 OK** — `GenerateReportResponse`
```json
{
  "report": {
    "reportId": "rpt_1a2b3c",
    "investigationId": "inv_8f3a1c",
    "generatedAt": "2026-07-29T06:20:11.000Z",
    "title": "Incident Report — Cedar Fork Basin Solvent Contamination",
    "executiveSummary": "Sensing and Hydrodynamic agents localized a solvent contamination event to Node CF-14, traced with 91% confidence to Factory FAC-07.",
    "timeline": [ /* ReasoningStep[] */ ],
    "evidenceSummary": [ /* EvidenceItem[] */ ],
    "violations": [ /* RegulatoryViolation[] */ ],
    "affectedLocations": [ /* AffectedLocation[] */ ],
    "recommendation": { "summary": "..." },
    "approvalRecord": {
      "status": "approved",
      "decidedAt": "2026-07-29T06:19:50.000Z",
      "notes": "Confirmed with field team, proceeding with containment order."
    }
  }
}
```

**Errors**
| Status | Code | When |
|---|---|---|
| 404 | `INVESTIGATION_NOT_FOUND` | Unknown `investigationId` |
| 409 | `REPORT_NOT_READY` | Workflow not yet `completed` or `escalated` |

**Frontend component:** Incident Report viewer / export screen.

---

## 7. Live Event Stream

```
GET /api/events/:investigationId
```
`Content-Type: text/event-stream`

Streams every `SSEEvent` defined in `shared/types.ts` for the given investigation, in order, from the moment the client connects. Full event catalogue with payload shapes is in `EVENTS.md`.

**Frontend component:** All live/animated parts of Mission Control — agent timeline, tool call ticker, confidence gauge, approval modal trigger.

---

## 8. Status Code Summary

| Code | Meaning |
|---|---|
| 200 | Success (read or state-changing action completed synchronously) |
| 202 | Accepted (workflow started asynchronously) |
| 400 | Bad request / validation failure |
| 404 | Resource not found |
| 409 | Conflict with current workflow state |
| 500 | Unhandled server/graph error |

All error bodies follow `ApiErrorResponse`:
```json
{
  "error": {
    "code": "INVESTIGATION_NOT_FOUND",
    "message": "No investigation exists with id inv_xxxx",
    "details": { "investigationId": "inv_xxxx" }
  }
}
```
