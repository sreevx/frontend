# AquaSentinel
### Autonomous Watershed Contamination Localization Swarm

## Vision

Rivers and watersheds get contaminated faster than regulatory agencies can respond. By the time a lab confirms a violation, a plume may already have reached a municipal intake or coastal ecosystem. AquaSentinel is a fully autonomous, software-simulated multi-agent system that continuously watches watershed telemetry, reasons about anomalies the way a team of specialists would, localizes the contamination source, predicts where it's going, checks it against regulatory thresholds, and drafts a mitigation plan — pausing only to ask a human to approve the critical, high-stakes actions.

It's software-only: no hardware, no real sensors. Every input is a realistic, seeded simulation, which lets the swarm's reasoning — not sensor procurement — be the thing that's judged.

## Architecture

Full detail in [`PROJECT_ARCHITECTURE.md`](./PROJECT_ARCHITECTURE.md). Summary:

- **4 specialist agents** (Sensing, Hydrodynamic Reasoning, Regulatory Compliance, Mitigation Planning) run as nodes in a **single LangGraph `StateGraph`**.
- Agents communicate only through **shared, reducer-managed state** — no direct agent-to-agent calls, which is what prevents state drift across repeated reasoning cycles.
- Each agent runs a **Think → Tool → Observation → Reasoning → Decision** ReAct loop, calling out to 7 mock tools (sensor reader, weather, satellite analysis, factory database, chemical database, hydrodynamic calculator, incident report generator).
- Low confidence routes back through additional reasoning iterations, capped by a hard iteration ceiling, a per-agent tool-call budget, and a wall-clock timeout — after which the system escalates to a human rather than looping forever.
- Before any critical mitigation action, the graph calls `interrupt()` and waits for human approval via a REST endpoint, then resumes from its LangGraph checkpoint.
- Every step of this is broadcast live over **Server-Sent Events** to power a real-time "Mission Control" dashboard.

## Tech Stack

- Node.js + Express + TypeScript
- LangGraph (`@langchain/langgraph`) — single StateGraph, reducer-based channels, checkpointer, `interrupt()`-based HITL
- Gemini API — reasoning backbone for each agent's Think/Reasoning steps
- Server-Sent Events — live observability, no WebSockets
- Mock JSON datasets — sensors, weather, factories, watershed topology, satellite analysis

## Folder Structure

```
aquasentinel/
├── PROJECT_ARCHITECTURE.md
├── API_CONTRACT.md
├── EVENTS.md
├── DEVELOPMENT_ROADMAP.md
├── IMPLEMENTATION_CHECKLIST.md
├── README.md
├── shared/types.ts
├── mock-data/            # 9 seed datasets — frontend can build against these alone
└── backend/src/
    ├── graph/             # LangGraph StateGraph, nodes, conditional edges
    ├── agents/            # ReAct loop helper shared by all 4 agents
    ├── tools/              # 7 mock tools
    ├── state/              # reducer channel definitions
    ├── events/             # central EventBus
    ├── routes/             # REST + SSE endpoints
    └── scenarios/          # scenario engine (tick-based telemetry injection)
```

(Full annotated tree in `PROJECT_ARCHITECTURE.md` §10.)

## SDG Alignment

- **SDG 6 — Clean Water and Sanitation:** direct contamination detection, source localization, and regulatory-violation identification for freshwater systems.
- **SDG 14 — Life Below Water:** hydrodynamic modeling explicitly tracks contamination flow to estuary/coastal-outlet nodes, surfacing downstream marine ecosystem risk, not just upstream drinking-water risk.

## Hackathon Feature Mapping

| Judging Criterion | Implementation |
|---|---|
| Specialist Agent Architecture | 4 distinct LangGraph nodes with non-overlapping responsibilities |
| Dynamic ReAct Tool Execution | Think/Tool/Observation/Reasoning/Decision loop, 7 mock tools |
| LangGraph Shared State | Typed, reducer-managed state channels — zero raw mutation |
| Human-in-the-loop | `interrupt()` / resume gate before any critical mitigation action |
| Safety Guardrails | Iteration ceiling + per-agent tool budget + wall-clock timeout → auto-escalation |
| Live Observability | Central EventBus → 11-event SSE taxonomy → real-time dashboard |

## Setup Instructions

> Backend implementation begins in Phase 2. This section will be filled in with exact install/run commands once `backend/package.json` exists. Placeholder for now:

```bash
cd backend
npm install
cp .env.example .env   # add GEMINI_API_KEY
npm run dev             # starts Express on :4000
```

Frontend developers can start immediately without any of the above — everything needed to build the UI lives in `API_CONTRACT.md`, `EVENTS.md`, `shared/types.ts`, and `mock-data/`.
