# SAARF — State-Aware Adaptive Recovery Framework

## State-Aware Adaptive Recovery Policy for Reliable Long-Horizon Agentic AI Systems

**Research Prototype** for an MSc thesis.

> This is an academic research prototype, not a production product, and not a
> fake-results dashboard. It demonstrates a research mechanism interactively;
> it does not report real experimental performance numbers. See
> [Research Integrity](#research-integrity) below.

## Overview

SAARF demonstrates a central research idea: **failure recovery in long-horizon
agentic AI systems should be a state-dependent, history-aware decision — not
a fixed retry rule.**

The prototype runs a deterministic simulation of a 15-step long-horizon
research/report-writing task. At any point the user can inject one of eight
failure types (API timeout, invalid tool output, planning failure,
environment change, context degradation, memory inconsistency, goal drift,
repeated failure). The system then:

1. **Classifies** the failure deterministically into a failure category.
2. **Inspects current agent state** (plan validity, environment status,
   context integrity, goal alignment, prior recovery history).
3. **Selects a recovery action** via the Adaptive Recovery Policy — reasoning
   explicitly about which actions were considered and *rejected*, and why.
4. **Executes** the selected recovery action and **verifies** the outcome.
5. **Continues, replans, or escalates to a human operator**, depending on how
   recovery played out and what the recovery history says about this
   failure recurring.

The whole loop, every log line, and every recovery decision are produced by
explicit, inspectable, deterministic logic (`backend/app/engine.py`) — no
LLM calls are made in this version. The system is architected so a real
LLM/LangGraph-driven planner and executor can be connected later without
changing the state model, the classification scheme, or the policy
interface (see [Connecting a real LLM later](#connecting-a-real-llm-later)).

## Key Research Concept

Long-horizon agentic systems fail in many different ways, and most existing
agent frameworks respond with one undifferentiated strategy (typically a
blind retry) regardless of failure type, severity, or history. SAARF's
contribution is to make the recovery decision itself state-aware and
history-aware. See the in-app **Research Info** page for the full research
problem, gap, aim, objectives, and questions.

## Failure Taxonomy

The deterministic demonstration supports eight injectable failure types and
maps each one to an explicit classification and recovery direction:

| Failure type | Classification | Recovery direction |
| --- | --- | --- |
| API Timeout | Temporary Tool Failure | Controlled Retry |
| Invalid Tool Output | Tool Output Failure | Revalidation / Alternative Tool |
| Planning Failure | Planning Failure | Replanning |
| Environment Change | Environmental Failure | State Refresh + Replanning |
| Context Degradation | Context Failure | Context Reconstruction |
| Memory Inconsistency | Memory Failure | Memory Validation |
| Goal Drift | Goal Alignment Failure | Goal Realignment / Replanning |
| Repeated Failure | Persistent Failure | Strategy Switch / Escalation |

## Adaptive Recovery Actions

The policy selects among nine canonical actions using the current state,
failure classification, and prior recovery history: **Retry, Revalidate,
Replan, Rollback, Alternative Tool, Context Reconstruction, Subtask
Decomposition, Strategy Switch,** and **Human Escalation**. The interface
shows the selected action and why other candidates were rejected; repeated
failures demonstrate the escalation ladder without changing the policy logic.

## Architecture

```
User Task
   │
   ▼
Task Planning Module
   │
   ▼
Multi-Agent Execution Module ◄──── External Tools & Knowledge Sources
   │
   ▼
Monitoring & Evaluation ◄────────── Episodic Memory
   │
   ▼
State-Aware Adaptive Recovery Policy
   │
   ▼
Recovery Action
   │
   ▼
Verification
   │
   ▼
Final Output
```

This is the **proposed** architecture for this thesis; it is not a
previously published system. See the in-app **Architecture** page for the
full diagram.

## Project Structure

```
SAARF-Research-Prototype/
├── backend/                 FastAPI deterministic simulation engine
│   └── app/
│       ├── main.py          FastAPI app + routers
│       ├── engine.py        Core state machine, classification, adaptive policy
│       ├── reference_data.py Task steps, 8 failure types, 9 recovery actions
│       ├── scenarios.py     Scripted "Run Demo" / Committee Demo walkthroughs
│       ├── experiments.py   Fixed Retry / Generic Self-Correction / SAARF comparison
│       ├── models.py        Pydantic schema (also documented in API_CONTRACT.md)
│       └── routers/         REST endpoints
├── frontend/                Next.js + TypeScript + Tailwind + Framer Motion UI
├── API_CONTRACT.md          Full REST API reference (endpoints, schemas, enums)
└── README.md                This file
```

## Technology Stack

**Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, lucide-react, Zustand.
**Backend:** Python, FastAPI, Pydantic. In-memory deterministic simulation — no database, no external API keys required.

## Local Development

### Prerequisites and installation

Prerequisites: Python 3.11+, Node.js 18+.

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Backend

From the repository root on Windows:

```bash
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

The backend is available at `http://localhost:8000`; its health endpoint is
`http://localhost:8000/api/health`, and its interactive API documentation is
at `http://localhost:8000/docs`.

### Frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy the example files when local overrides are needed. The committed example
files contain only local placeholder values; real deployment values belong in
the hosting provider's environment settings and must not be committed.

| Application | Variable | Purpose | Local default/example |
| --- | --- | --- | --- |
| Frontend | `NEXT_PUBLIC_API_BASE` | FastAPI origin embedded into the browser bundle at build time | `http://localhost:8000` |
| Backend | `SAARF_CORS_ORIGINS` | Comma-separated frontend origins permitted by CORS | `http://localhost:3000,http://127.0.0.1:3000` |

For Vercel, set `NEXT_PUBLIC_API_BASE` to the real hosted FastAPI origin before
the frontend build. For the backend host, set `SAARF_CORS_ORIGINS` to the real
Vercel frontend origin (and any other explicitly trusted frontend origins).
Do not use a wildcard and do not invent a deployment URL before one exists.

## How to run the simulation

The app starts a fresh 15-step demonstration task automatically. Use
**Run Agent** to step through it (manually or via Auto-Run), or **New Task**
in the header at any time to reset to step 1. All step counts, token usage,
and cost figures are clearly labelled **Simulation** — they are produced by
a deterministic formula, not a real LLM run.

## How to use failure injection

Go to **Inject Failure**, pick one of the eight failure types, and the task
pauses immediately. The **Recovery Policy** page then shows exactly which
recovery action was selected, which alternatives were considered and
rejected (and why), and lets you either execute the policy's chosen action
or manually override it from the Recovery Action Grid to explore "what if"
behaviour.

## How to run the Committee Demo

Click **Committee Demo** in the header. This opens a guided, auto-playing
walkthrough (~3-5 minutes) covering three scenarios in sequence: a
transient failure resolved by a controlled retry, a planning failure where
retry is explicitly rejected in favour of replanning, and a repeated
failure that escalates through the recovery ladder to human escalation.
Use Prev/Next/Pause to control pacing during a live presentation. This
replay runs on an isolated backend session and does not affect your live
task state.

## Current Status

- The deterministic research simulation, all nine frontend routes, failure
  injection, adaptive recovery workflow, Committee Demo, and mechanism
  comparison are implemented.
- The frontend is structured as a standard Next.js application for Vercel;
  the FastAPI backend is prepared for a separate Python hosting service.
- No cloud deployment URL is committed. Deployment origins are supplied via
  environment variables.
- Real empirical evaluation remains future work. **Experimental data not
  available.**

## Connecting a real LLM later

The prototype is deliberately split so the simulation engine
(`backend/app/engine.py`) can be replaced by a real LLM/LangGraph-driven
implementation without changing:
- the `AgentState` schema (state representation),
- the failure classification vocabulary (`reference_data.py`),
- the recovery action vocabulary and the `RecoveryDecision` shape, or
- the REST API surface (`API_CONTRACT.md`).

A future "LLM Mode" would swap the deterministic `Session` class for one
backed by an LLM Planner, LLM Worker(s), a real failure detector, a state
manager, the same recovery policy interface, real tools, episodic memory,
and a verifier — while the frontend and API contract stay the same. The
header's "LLM Mode — Coming Soon" badge marks this integration point; no
API keys are required to run the current version.

## Research integrity

This prototype **does not** report real experimental results. Specifically:

- Dashboard/simulation numbers (tokens, cost) are labelled **Simulation**.
- The Experiments page's mechanism comparison (Fixed Retry vs. Generic
  Self-Correction vs. SAARF) is labelled **Demo Simulation** — it shows how
  each approach *behaves* on the same injected failure, not a performance
  benchmark.
- The Experiments page's headline metrics (Task Success Rate, Recovery
  Rate, Recovery Cost) always read **"Experimental data not available"**
  until real experiments are conducted — they are never computed from the
  demo trace or fabricated.
- No citations, benchmark names, accuracy claims, or statistical
  significance claims are invented anywhere in the app.

The **Research Info** page's problem/gap/aim/objectives/questions text was
drafted to match the stated thesis title as a starting point — review and
refine it against your actual thesis proposal before presenting.
