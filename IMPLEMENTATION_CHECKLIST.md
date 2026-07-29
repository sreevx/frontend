# IMPLEMENTATION_CHECKLIST.md

Every item below maps to at least one judging criterion. If a task doesn't map, it doesn't belong in the build.

Legend: **SAA** = Specialist Agent Architecture · **RTE** = Dynamic ReAct Tool Execution · **LSS** = LangGraph Shared State · **HITL** = Human-in-the-loop · **SG** = Safety Guardrails · **LO** = Live Observability

---

## Phase 2 — Project Setup
- [ ] `package.json` with pinned versions: express, typescript, @langchain/langgraph, @langchain/google-genai (or equivalent), ts-node-dev — *(foundation for all)*
- [ ] `tsconfig.json` strict mode enabled, no implicit any — *(foundation for all)*
- [ ] `.env.example` with `GEMINI_API_KEY`, `PORT`, `MAX_ITERATIONS`, `TOOL_CALL_BUDGET` — **SG**

## Phase 3 — Folder Structure
- [ ] Directory tree matches `PROJECT_ARCHITECTURE.md` §10 exactly — *(foundation)*

## Phase 4 — Shared State
- [ ] `state/channels.ts`: every `WorkflowState` field has an explicit reducer function — **LSS**
- [ ] `state/initialState.ts`: builds initial state from a scenario ID + mock data — **LSS**
- [ ] Confirm state shape byte-matches `shared/types.ts` `WorkflowState` and `mock-state.json` — **LSS**

## Phase 5 — LangGraph Workflow
- [ ] Single `StateGraph` instance, 4 agent nodes + conditional routing node — **SAA**, **LSS**
- [ ] Conditional edge implementing confidence-loop (low confidence → back to Sensing) — **SG**
- [ ] `workflowIteration` cap enforced in the conditional edge, routes to escalation node at max — **SG**
- [ ] Checkpointer (`MemorySaver`) wired to `thread_id = investigationId` — **HITL**
- [ ] `interrupt()` called from Mitigation node when `requiresApproval === true` — **HITL**
- [ ] Resume path via `Command({ resume })` verified to correctly continue from checkpoint — **HITL**

## Phase 6 — Specialist Agents
- [ ] Sensing Agent: processes telemetry, validates readings, generates initial hypothesis — **SAA**, **RTE**
- [ ] Hydrodynamic Reasoning Agent: predicts downstream spread, updates confidence — **SAA**, **RTE**
- [ ] Regulatory Compliance Agent: checks thresholds, identifies likely violators — **SAA**, **RTE**
- [ ] Mitigation Planning Agent: recommends action, decides `requiresApproval` — **SAA**, **RTE**, **HITL**
- [ ] Every agent follows Think → Tool → Observation → Reasoning → Decision explicitly (not collapsed into one LLM call) — **RTE**
- [ ] Each agent returns a **state delta**, never the full state object — **LSS**

## Phase 7 — Tool Layer
- [ ] SensorReader — **RTE**
- [ ] WeatherTool — **RTE**
- [ ] SatelliteAnalysis (mock) — **RTE**
- [ ] FactoryDatabase — **RTE**
- [ ] ChemicalDatabase — **RTE**
- [ ] HydrodynamicCalculator — **RTE**
- [ ] IncidentReportGenerator — **RTE**
- [ ] Per-agent tool-call budget enforced inside the ReAct loop helper — **SG**

## Phase 8 — REST APIs
- [ ] `POST /api/investigations` — **SAA** (kicks off swarm)
- [ ] `GET /api/investigations/:id` — **LO**
- [ ] `GET /api/scenarios` — *(demo usability)*
- [ ] `POST /api/simulation/tick` — *(continuous telemetry — Hard Part)*
- [ ] `POST /api/investigations/:id/approve` — **HITL**
- [ ] `GET /api/investigations/:id/report` — **SAA** (Incident Report Generator tool output)
- [ ] All responses validated against `API_CONTRACT.md` shapes — *(contract integrity)*

## Phase 9 — Server-Sent Events
- [ ] Central `EventBus` (EventEmitter wrapper), graph code has zero HTTP knowledge — **LO**
- [ ] `GET /api/events/:id` streams all 11 event types in `EVENTS.md` — **LO**
- [ ] Every agent/tool/state transition emits its corresponding event — **LO**

## Phase 10 — Scenario Engine
- [ ] Loads scenario from `mock-simulation.json`, seeds initial state — *(Hard Part: continuous updates)*
- [ ] `tick` endpoint re-invokes graph on same `thread_id` with new telemetry — *(Hard Part)*
- [ ] All 3 seeded scenarios (`industrial-solvent`, `false-positive`, `multi-source`) run end-to-end without manual intervention — **SAA**, **SG**

## Phase 11 — Integration
- [ ] Frontend swaps mock-data reads for live REST calls with zero contract changes — *(contract integrity)*
- [ ] Frontend swaps mock event replay for live `EventSource` — **LO**
- [ ] Full run observed live in Mission Control: launch → swarm reasoning → approval modal → report — **SAA**, **RTE**, **LSS**, **HITL**, **LO**

## Phase 12 — Testing
- [ ] Happy path: high-confidence single-source scenario resolves without hitting iteration cap — **SG**
- [ ] Loop-guard path: force low confidence, verify iteration cap triggers escalation, not infinite loop — **SG**
- [ ] HITL reject path: reject approval, verify graph re-routes to Mitigation Agent for re-planning — **HITL**
- [ ] State-drift check: run scenario twice concurrently with different `thread_id`s, verify no cross-contamination of state — **LSS**
- [ ] SSE ordering check: verify events arrive in causal order matching `EVENTS.md` — **LO**

---

## Final Judging-Criteria Coverage Audit

| Criterion | Verified by |
|---|---|
| Specialist Agent Architecture | Phase 6 checklist, Phase 11 integration run |
| Dynamic ReAct Tool Execution | Phase 6 + 7 checklist |
| LangGraph Shared State | Phase 4 + 12 (state-drift check) |
| Human-in-the-loop | Phase 5 + 8 + 12 (HITL reject path) |
| Safety Guardrails | Phase 5 + 7 + 12 (loop-guard path) |
| Live Observability | Phase 9 + 12 (SSE ordering check) |

If any row above cannot be checked off, the build is not demo-ready regardless of how polished the UI looks.
