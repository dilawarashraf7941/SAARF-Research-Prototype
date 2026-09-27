# SAARF Backend API Contract (v0.1 — Simulation Mode)

Base URL (dev): `http://localhost:8000`
All bodies are JSON. CORS is open for `http://localhost:3000`.

There is a single shared, in-memory, server-side session representing "the"
demonstration task. It resets on server restart. This is intentional for a
local MSc demo — no auth, no database, no multi-tenant handling.

## Enums

```
TaskStatus       = "Idle" | "Executing" | "Paused - Failure Detected" | "Recovering" | "Replanning" | "Escalated" | "Completed"
PlanStatus       = "Active" | "Replanning" | "Invalid" | "Completed"
EnvironmentStatus= "Stable" | "Degraded" | "Changed"
Severity         = "Low" | "Medium" | "High"
LogLevel         = "INFO" | "PLAN" | "ACTION" | "TOOL" | "ERROR" | "DETECTOR" | "STATE" | "POLICY" | "RECOVERY" | "SUCCESS" | "VERIFY" | "ESCALATION"
RecoveryOutcome  = "Success" | "Failed" | "Escalated"
```

## Core objects

```ts
interface FailureRecord {
  failureType: string; label: string; category: string;
  severity: Severity; step: number; occurredAtLog: number; resolved: boolean;
}

interface RecoveryRecord {
  action: string; actionLabel: string; failureType: string; step: number;
  attemptNumber: number; outcome: RecoveryOutcome; occurredAtLog: number;
}

interface ResourceUsage { tokensUsed: number; estimatedCostUsd: number; label: "Simulation"; }

interface LogEntry { index: number; timestamp: string; level: LogLevel; message: string; }

interface RecoveryDecision {
  failureType: string; failureLabel: string; category: string; severity: Severity;
  stateAnalysis: string[];        // bullet list for the "State Analysis" panel
  recoveryHistorySummary: string; // one sentence
  selectedAction: string;         // action id, e.g. "retry"
  selectedActionLabel: string;    // e.g. "Retry"
  rejectedActions: { action: string; reason: string }[];
  reasoning: string;              // full paragraph explanation
  attemptNumber: number;          // 0-indexed attempt count for this failure type
}

interface AgentState {
  taskId: string; taskGoal: string;
  currentStep: number; totalSteps: number; stepLabel: string;
  taskStatus: TaskStatus; planStatus: PlanStatus; environmentStatus: EnvironmentStatus;
  contextIntegrity: number;   // 0-100
  goalAlignment: number;      // 0-1
  currentTool: string | null;
  failureType: string | null; failureSeverity: Severity | null;
  failureHistory: FailureRecord[]; recoveryHistory: RecoveryRecord[];
  retryCount: number;
  completedActions: string[]; pendingActions: string[];
  resourceUsage: ResourceUsage;
  activeDecision: RecoveryDecision | null;
  lastRecoveryOutcome: "Success" | "Failed" | "Escalated" | null;
}

interface SessionSnapshot { state: AgentState; logs: LogEntry[]; }
```

## Endpoints

### Session / task execution
- `GET /api/health` → `{status:"ok", mode:"simulation"}`
- `POST /api/session/reset` → `SessionSnapshot` — resets the demo task to step 1, `taskStatus:"Executing"`.
- `GET /api/session` → `SessionSnapshot` — current state + full log history. **Call this on app load** to hydrate the store.
- `POST /api/execute/step` → `SessionSnapshot` — advances one step. 409 if `taskStatus !== "Executing"` (e.g. paused on a failure, or already completed). Use this in a loop (client-side `setInterval`, ~1.2s) to animate "Run Agent" auto-play; stop the interval on a non-2xx response or when `taskStatus` becomes `"Completed"`/`"Paused - Failure Detected"`.

### State inspection
- `GET /api/state` → `AgentState`
- `GET /api/logs?since=<index>` → `LogEntry[]` — logs with `index >= since`. `SessionSnapshot.logs` already contains everything from 0, so for most pages just use the snapshot from the last mutating call; use `/api/logs?since=N` only if you want incremental polling.

### Failure injection
- `GET /api/failure/types` → `{id, label, category, directionLabel, description, defaultSeverity}[]` — the 8 failure types, static reference data. Use this to render the Inject Failure page's option cards — do not hardcode the list in the frontend.
- `POST /api/failure/inject` body `{failureType: string}` → `SessionSnapshot`. 409 if task isn't `"Executing"`. This immediately classifies the failure, computes the recovery decision, and pauses the task — the returned `state.activeDecision` is populated.

### Recovery
- `GET /api/recovery/decision` → `RecoveryDecision | null` — same object as `state.activeDecision`, provided as a convenience.
- `GET /api/recovery/actions` → array of the 9 canonical actions, each annotated with `compatibility`:
  `"selected" | "rejected" | "possible" | "not_applicable" | "idle"` (`"idle"` = no active failure right now).
  ```ts
  { id, name, description, applicableCategories: string[], expectedEffect, compatibility }
  ```
  Use this to drive the Recovery Policy Action Grid (Section 16) — it already tells you what to visually mark as selected/rejected/greyed-out.
- `POST /api/recovery/execute` body `{action?: string, simulateOutcome?: "Success" | "Failed"}` → `SessionSnapshot`. If `action` is omitted, executes the policy's `selectedAction`. Passing a different `action` lets the user manually override the policy from the Action Grid ("what if I forced X instead") — a legitimate exploratory feature of the prototype. 409 if there's no active decision.

  **`simulateOutcome` (demonstration control):** by default, whether a recovery attempt succeeds is fully deterministic — `retry` and `strategy_switch` always succeed on their first attempt for a given failure incident, and every other action always resolves. This means, left alone, a fresh failure injection *always* recovers on the first try, so **the escalation ladder cannot be observed by interacting normally** — only the scripted Run Demo / Committee Demo force a failure to show it. To let a presenter walk the ladder live (Section 7 of the spec: Retry → Alternative Tool → Strategy Switch → Human Escalation), pass `simulateOutcome: "Failed"` on a call to force that specific attempt to fail regardless of the default rule; the policy then re-evaluates using the updated recovery history and returns the next rung in `state.activeDecision`, exactly as the automatic path does. This never changes *which* action the policy selects — only whether that attempt is recorded as succeeding — and it never overrides `human_escalation`, which always resolves to `"Escalated"`. Surface it in the UI as an explicit, clearly labelled "force this attempt to fail (demonstration)" control — never on by default.
  - On success: `taskStatus` returns to `"Executing"`, `activeDecision` becomes `null`.
  - On failure (only possible for `retry` / `strategy_switch` on a 2nd+ attempt): `taskStatus` stays `"Paused - Failure Detected"` and `activeDecision` is replaced with a **new** decision (the policy re-evaluated using the updated `recoveryHistory`) — render this as the ladder escalating.
  - On `human_escalation`: `taskStatus` becomes `"Escalated"`. No further `/execute/step` calls will succeed until `/api/session/reset`.

### Scripted demo scenarios (Sections 13–15)
- `POST /api/scenario/run` body `{scenarioId: "api_timeout" | "planning_failure" | "repeated_failure"}` →
  `{scenarioId, frames: Frame[]}`
- `GET /api/scenario/committee-demo` → `{frames: Frame[]}` — the full 13-step guided walkthrough (Section 22), covering all three scenarios back to back plus an intro and a summary frame.

  ```ts
  interface Frame {
    caption: string;          // narration text to display
    highlight: string;        // which workflow node to visually highlight — see Workflow node ids below
    stage: string;            // short machine tag, e.g. "failure_detected", "policy_decision", "recovery_success"
    state: AgentState | null; // full state snapshot AT THIS POINT in the scripted run (null for pure narration frames with no state change, e.g. intro/summary)
    logsAdded: LogEntry[];    // the log lines produced by this step — reveal these one at a time for the log animation
    sectionTitle?: string;    // committee-demo only: groups frames under a scenario heading
    summaryPoints?: string[]; // present only on the final committee-demo frame
  }
  ```

  **Important:** these scenario/committee-demo runs execute on an *isolated* session on the backend — they do **not** touch the shared session used by `/api/state`, `/api/execute/step`, etc. Render scenario/committee playback as its own self-contained view (e.g. a full-screen guided overlay or a dedicated "Run Demo" panel) driven purely by the `frames` array on a client-side timer (Next/Prev/Play/Pause + a progress indicator), and don't write scenario frame data into the same global store that Dashboard/Agent State pages read from the live session.

  The full workflow diagram (Section 5) has 13 nodes, but scripted playback only ever sets `highlight` to one of these 6 values — map each to the corresponding diagram node(s):
  - `agent_execution` → "AGENT EXECUTION"
  - `failure_detection` → "FAILURE DETECTION"
  - `adaptive_recovery_policy` → highlight **both** "STATE ASSESSMENT" and "ADAPTIVE RECOVERY POLICY" (the backend narrates these together)
  - `recovery_action` → "RECOVERY ACTION"
  - `continue_replan_escalate` → "CONTINUE / REPLAN / ESCALATE"
  - `final_result` → "FINAL RESULT" (only on the committee-demo's closing frame)
  Nodes never targeted by playback (USER TASK, TASK PLANNING, OBSERVATION, STATE UPDATE, VERIFICATION, VERIFY) still render normally in the static diagram — they just never light up during a scripted run.

### Experiments (Section 20)
- `GET /api/experiments/approaches` → `{id, name, description}[]` for the three approaches: `fixed_retry`, `generic_self_correction`, `saarf`.
- `POST /api/experiments/simulate` body `{approach, failureSequence: string[]}` → a **mechanism trace** (not a performance statistic):
  ```ts
  { approach, steps: { failureType, failureLabel, category, actionsAttempted: string[], resolved: boolean, outcome: string }[], overallResolved: boolean, totalActionsAttempted: number }
  ```
  Run all three approaches on the same `failureSequence` (offer the user a small multi-select of failure types, e.g. default `["planning_failure"]`) and show the traces side by side. Label this output clearly as **"Demo Simulation"**.
- `GET /api/experiments/metrics` → always returns
  `{taskSuccessRate, recoveryRate, recoveryCost}`, each the literal string `"Experimental data not available"`. Render these as their own headline metric cards, visually distinct from the mechanism trace above — **do not** compute or infer numeric values for these three fields from the trace or anywhere else. This is a hard research-integrity requirement from the thesis author.

## Error handling
All domain errors are `409 Conflict` with `{"detail": "<human-readable message>"}` (invalid state transitions) or `400 Bad Request` (invalid/unknown ids). Surface `detail` to the user in a small toast/inline message rather than failing silently.
