# DEVELOPMENT_ROADMAP.md
## AquaSentinel — Hackathon Build Timeline

Assumes a compressed hackathon schedule. Times are elapsed-effort estimates, not calendar time — scale to your actual hackathon window.

---

## Phase Timeline

| Phase | Name | Est. Time | Owner |
|---|---|---|---|
| 1 | Architecture Review + Foundation Docs | 1.5 hr | Backend lead (this session) |
| 2 | Project Setup (Node/TS/Express/LangGraph scaffolding) | 0.5 hr | Backend |
| 3 | Folder Structure + config | 0.25 hr | Backend |
| 4 | Shared State (channels, reducers, initial state) | 1 hr | Backend |
| 5 | LangGraph Workflow (StateGraph, edges, checkpointer, interrupt) | 1.5 hr | Backend |
| 6 | Specialist Agents (4 nodes, Gemini prompts) | 2 hr | Backend |
| 7 | Tool Layer (7 mock tools) | 1.5 hr | Backend |
| 8 | REST APIs | 1 hr | Backend |
| 9 | Server-Sent Events (EventBus + route) | 1 hr | Backend |
| 10 | Scenario Engine (tick-based simulation) | 1 hr | Backend |
| 11 | Integration (backend ↔ real frontend, replacing mocks) | 1.5 hr | Both |
| 12 | Testing (happy path, loop-guard, HITL reject path) | 1 hr | Both |
| — | **Total backend-critical path** | **~13 hr** | |

Frontend development (independent track, unblocked after Phase 1):

| Frontend Task | Depends on | Est. Time |
|---|---|---|
| Mission Control shell + routing | `API_CONTRACT.md`, `shared/types.ts` | 1 hr |
| Scenario picker + launcher | `mock-simulation.json` | 0.5 hr |
| Agent swarm visualization | `mock-events.json`, `EVENTS.md` | 1.5 hr |
| Live reasoning/evidence panels | `mock-state.json` | 1.5 hr |
| Confidence gauge + tool ticker | `mock-events.json` | 1 hr |
| Approval modal | `EVENTS.md` (#9), `API_CONTRACT.md` (#5) | 0.75 hr |
| Incident report viewer | `mock-report.json` | 1 hr |
| SSE client wiring | `EVENTS.md` | 0.5 hr |
| Polish / demo narrative | — | 1 hr |
| **Total frontend-critical path** | | **~8.75 hr** |

---

## Integration Checkpoints

1. **After Phase 4 (Shared State):** confirm `WorkflowState` shape in `shared/types.ts` still matches `mock-state.json` exactly — freeze before Phase 5.
2. **After Phase 8 (REST APIs):** frontend swaps its mock-data fetches for live `GET /api/investigations/:id` — verify response shape matches `API_CONTRACT.md` byte-for-byte.
3. **After Phase 9 (SSE):** frontend swaps mock event replay for a live `EventSource` connection — verify event ordering and payloads match `EVENTS.md`.
4. **After Phase 10 (Scenario Engine):** run all 3 seeded scenarios end-to-end through the real graph and diff outputs against expectations (high/low/critical severity respectively).
5. **Before Phase 12 (Testing):** full backend + frontend integration smoke test — start investigation → observe live agent swarm → approve → view report, using each of the 3 scenarios.

---

## Definition of Done (per phase)

Every phase ends with the self-review checklist from the operating instructions:
- Does this satisfy the hackathon problem statement?
- Does this strengthen Autonomous Watershed Contamination Localization Swarm?
- Does this align with SDG 6 and SDG 14?
- Does this solve the "Hard Part"?
- Is this the simplest solution that demonstrates the concept well?

No phase proceeds without explicit approval, per the locked development style.
