"""
The SAARF deterministic simulation engine.

This is the research-critical component: it implements the state
representation (Section 9), failure classification (Section 10) and the
State-Aware Adaptive Recovery Policy (Section 11) as explicit, inspectable,
deterministic logic -- not a fixed "IF FAILURE THEN RETRY" rule, and not a
call to a real LLM (that integration point is intentionally isolated here so
it can be swapped in later; see README).

Everything here is pure/deterministic so that a given sequence of API calls
always produces the same trace. No randomness is used anywhere.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from .models import (
    AgentState, FailureRecord, RecoveryRecord, ResourceUsage, LogEntry,
    RecoveryDecision,
)
from .reference_data import (
    TASK_GOAL, TASK_STEPS, TOTAL_STEPS, FAILURE_TYPES, RECOVERY_ACTIONS,
)

# Actions considered "expensive but reliable" in this deterministic model:
# once the policy escalates to one of these, it resolves the incident.
_ALWAYS_RESOLVES = {
    "replan", "revalidate", "rollback", "alternative_tool",
    "context_reconstruction", "subtask_decomposition",
}
# Actions that only work the FIRST time they are tried for a given failure
# incident; a repeat of the same lightweight action fails, which is what
# drives the policy to escalate rather than loop forever.
_ONLY_WORKS_FIRST_TRY = {"retry", "strategy_switch"}

RETRY_CAP = 3  # safety cap: consecutive failed recoveries force escalation


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


class Session:
    """Holds the mutable state for one simulated task run."""

    def __init__(self, task_id: str = "task-001"):
        self.task_id = task_id
        self._attempts_by_type: dict[str, int] = {}
        self._logs: list[LogEntry] = []
        self.state = self._fresh_state()
        self.reset()

    # -- lifecycle ----------------------------------------------------

    def _fresh_state(self) -> AgentState:
        return AgentState(
            taskId=self.task_id,
            taskGoal=TASK_GOAL,
            currentStep=1,
            totalSteps=TOTAL_STEPS,
            stepLabel=TASK_STEPS[0]["label"],
            taskStatus="Idle",
            planStatus="Active",
            environmentStatus="Stable",
            contextIntegrity=100.0,
            goalAlignment=0.97,
            currentTool=None,
            failureType=None,
            failureSeverity=None,
            failureHistory=[],
            recoveryHistory=[],
            retryCount=0,
            completedActions=[],
            pendingActions=[s["label"] for s in TASK_STEPS[1:]],
            resourceUsage=ResourceUsage(tokensUsed=0, estimatedCostUsd=0.0),
            activeDecision=None,
            lastRecoveryOutcome=None,
        )

    def reset(self) -> None:
        self._attempts_by_type = {}
        self._logs = []
        self.state = self._fresh_state()
        self.state.taskStatus = "Executing"
        self.log("INFO", "Starting demonstration task.")
        self.log("PLAN", f"Planner created a {TOTAL_STEPS}-step execution plan.")
        self.log("ACTION", f"Executing Step {self.state.currentStep}: {self.state.stepLabel}.")
        self._maybe_log_tool(self.state.currentStep)

    def log(self, level: str, message: str) -> LogEntry:
        entry = LogEntry(index=len(self._logs), timestamp=_now(), level=level, message=message)
        self._logs.append(entry)
        return entry

    def logs_since(self, since: int = 0) -> list[LogEntry]:
        return self._logs[since:]

    def _maybe_log_tool(self, step_index: int) -> None:
        step = TASK_STEPS[step_index - 1]
        self.state.currentTool = step["tool"]
        if step["tool"]:
            self.log("TOOL", f"Invoking tool '{step['tool']}'.")

    def _accrue_resources(self) -> None:
        step = self.state.currentStep
        tokens = 140 + step * 27
        self.state.resourceUsage.tokensUsed += tokens
        self.state.resourceUsage.estimatedCostUsd = round(
            self.state.resourceUsage.tokensUsed * 0.000002, 4
        )

    # -- normal execution ----------------------------------------------

    def step(self) -> None:
        if self.state.taskStatus != "Executing":
            raise ValueError(f"Cannot advance step while task status is '{self.state.taskStatus}'.")

        current_label = self.state.stepLabel
        self._accrue_resources()
        self.log("VERIFY", f"Output of step {self.state.currentStep} verified.")
        self.state.completedActions.append(current_label)
        if current_label in self.state.pendingActions:
            self.state.pendingActions.remove(current_label)

        if self.state.currentStep >= TOTAL_STEPS:
            self.state.taskStatus = "Completed"
            self.state.currentTool = None
            self.log("SUCCESS", "Final verification passed. Task completed.")
            return

        self.state.currentStep += 1
        self.state.stepLabel = TASK_STEPS[self.state.currentStep - 1]["label"]
        self.log("ACTION", f"Executing Step {self.state.currentStep}: {self.state.stepLabel}.")
        self._maybe_log_tool(self.state.currentStep)

    # -- failure injection & classification -----------------------------

    def inject_failure(self, failure_type: str) -> None:
        if failure_type not in FAILURE_TYPES:
            raise ValueError(f"Unknown failure type '{failure_type}'.")
        if self.state.taskStatus != "Executing":
            raise ValueError(f"Cannot inject a failure while task status is '{self.state.taskStatus}'.")

        meta = FAILURE_TYPES[failure_type]
        prior_occurrences = sum(1 for f in self.state.failureHistory if f.failureType == failure_type)
        severity = meta["defaultSeverity"]
        if prior_occurrences >= 1 and severity != "High":
            severity = "Medium" if severity == "Low" else "High"

        self.state.failureType = failure_type
        self.state.failureSeverity = severity
        self.state.taskStatus = "Paused - Failure Detected"
        self._attempts_by_type.setdefault(failure_type, 0)

        # state-side effects of the failure category
        if meta["category"] == "Planning Failure":
            self.state.planStatus = "Invalid"
        elif meta["category"] == "Environmental Failure":
            self.state.environmentStatus = "Changed"
        elif meta["category"] == "Context Failure":
            self.state.contextIntegrity = max(35.0, self.state.contextIntegrity - 28)
        elif meta["category"] == "Memory Failure":
            self.state.contextIntegrity = max(50.0, self.state.contextIntegrity - 12)
        elif meta["category"] == "Tool Output Failure":
            self.state.contextIntegrity = max(60.0, self.state.contextIntegrity - 4)
        elif meta["category"] == "Goal Alignment Failure":
            self.state.goalAlignment = max(0.25, self.state.goalAlignment - 0.35)

        self.log("ERROR", f"{meta['label']} detected at step {self.state.currentStep}.")
        record = FailureRecord(
            failureType=failure_type, label=meta["label"], category=meta["category"],
            severity=severity, step=self.state.currentStep,
            occurredAtLog=len(self._logs) - 1,
        )
        self.state.failureHistory.append(record)
        self.log("DETECTOR", f"Failure classified as {meta['category']} ({meta['directionLabel']}).")
        self.log("STATE", "Current state analysed by the recovery policy.")

        decision = self.compute_decision()
        self.state.activeDecision = decision
        self.log(
            "POLICY",
            f"Recovery action selected: {decision.selectedActionLabel} "
            f"(attempt {decision.attemptNumber + 1}).",
        )

    # -- adaptive recovery policy (Section 11) ---------------------------

    def compute_decision(self) -> RecoveryDecision:
        if self.state.failureType is None:
            raise ValueError("No active failure to compute a decision for.")

        failure_type = self.state.failureType
        meta = FAILURE_TYPES[failure_type]
        ladder = meta["ladder"]
        attempt_number = self._attempts_by_type.get(failure_type, 0)

        rejected: list[dict] = []
        candidate_index = min(attempt_number, len(ladder) - 1)
        candidate = ladder[candidate_index]

        # -- state-aware override rules (this is what makes the policy
        #    state-DEPENDENT rather than a fixed retry loop) --

        if candidate == "retry" and self.state.environmentStatus != "Stable":
            rejected.append({
                "action": "retry",
                "reason": "Environment status is '%s'. Retrying the same action without "
                          "refreshing state would very likely reproduce the same failure."
                          % self.state.environmentStatus,
            })
            candidate = self._next_rung(ladder, candidate_index, exclude={"retry"})

        if candidate == "retry" and self.state.goalAlignment < 0.75:
            rejected.append({
                "action": "retry",
                "reason": f"Goal alignment has dropped to {self.state.goalAlignment:.2f}. "
                          "A blind retry does not address a misaligned plan.",
            })
            candidate = self._next_rung(ladder, candidate_index, exclude={"retry"})

        if candidate == "retry" and self.state.failureSeverity == "High":
            rejected.append({
                "action": "retry",
                "reason": "Failure severity is High. A first blind retry is judged unlikely "
                          "to resolve a high-severity failure, so the policy escalates directly.",
            })
            candidate = self._next_rung(ladder, candidate_index, exclude={"retry"})

        if meta["category"] == "Planning Failure":
            rejected.append({
                "action": "retry",
                "reason": "Failure category is Planning Failure: the current plan itself is "
                          "invalid, so re-attempting the same action cannot succeed.",
            })

        if self.state.retryCount >= RETRY_CAP and candidate != "human_escalation":
            rejected.append({
                "action": candidate,
                "reason": f"{self.state.retryCount} consecutive recovery attempts have failed "
                          "across this task. The safety cap escalates to a human operator "
                          "rather than continuing to spend resources autonomously.",
            })
            candidate = "human_escalation"

        # -- narrative bullets for the committee --

        state_analysis = [
            f"Environment status: {self.state.environmentStatus}.",
            f"Plan status: {self.state.planStatus}.",
            f"Context integrity: {self.state.contextIntegrity:.0f}%.",
            f"Goal alignment: {self.state.goalAlignment:.2f}.",
            f"Prior attempts for this failure type: {attempt_number}.",
        ]

        if attempt_number == 0:
            history_summary = "No previous recovery attempts for this failure."
        else:
            history_summary = (
                f"{attempt_number} prior recovery attempt(s) for this failure type did not "
                "resolve it; the policy has escalated to a stronger recovery action."
            )

        reasoning_parts = [
            f"The failure was classified as {meta['category']}."
        ]
        if rejected:
            for r in rejected:
                reasoning_parts.append(
                    f"{RECOVERY_ACTIONS[r['action']]['name']} was considered and rejected: {r['reason']}"
                )
        reasoning_parts.append(
            f"{RECOVERY_ACTIONS[candidate]['name']} was selected because it directly addresses "
            f"a {meta['category'].lower()} given the current state and recovery history."
        )

        decision = RecoveryDecision(
            failureType=failure_type,
            failureLabel=meta["label"],
            category=meta["category"],
            severity=self.state.failureSeverity,
            stateAnalysis=state_analysis,
            recoveryHistorySummary=history_summary,
            selectedAction=candidate,
            selectedActionLabel=RECOVERY_ACTIONS[candidate]["name"],
            rejectedActions=rejected,
            reasoning=" ".join(reasoning_parts),
            attemptNumber=attempt_number,
        )
        return decision

    @staticmethod
    def _next_rung(ladder: list[str], current_index: int, exclude: set[str]) -> str:
        for i in range(current_index + 1, len(ladder)):
            if ladder[i] not in exclude:
                return ladder[i]
        for action in ladder:
            if action not in exclude:
                return action
        return "human_escalation"

    # -- executing the chosen recovery -----------------------------------

    def execute_recovery(self, action_override: Optional[str] = None,
                          force_outcome: Optional[str] = None) -> RecoveryRecord:
        if self.state.activeDecision is None or self.state.failureType is None:
            raise ValueError("No active recovery decision to execute.")

        failure_type = self.state.failureType
        meta = FAILURE_TYPES[failure_type]
        decision = self.state.activeDecision
        action = action_override or decision.selectedAction
        attempt_number = self._attempts_by_type.get(failure_type, 0)

        self.state.taskStatus = "Recovering"
        self.log("RECOVERY", f"Executing recovery action: {RECOVERY_ACTIONS[action]['name']} "
                              f"(attempt {attempt_number + 1}).")

        if action == "human_escalation":
            outcome = "Escalated"
        elif force_outcome is not None:
            outcome = force_outcome
        elif action in _ALWAYS_RESOLVES:
            outcome = "Success"
        elif action in _ONLY_WORKS_FIRST_TRY:
            outcome = "Success" if attempt_number == 0 else "Failed"
        else:
            outcome = "Success"

        record = RecoveryRecord(
            action=action, actionLabel=RECOVERY_ACTIONS[action]["name"],
            failureType=failure_type, step=self.state.currentStep,
            attemptNumber=attempt_number, outcome=outcome,
            occurredAtLog=len(self._logs) - 1,
        )
        self.state.recoveryHistory.append(record)

        if outcome == "Success":
            self.log("SUCCESS", f"{RECOVERY_ACTIONS[action]['name']} succeeded.")
            self._apply_recovery_repairs(action)
            self.state.retryCount = 0
            self._attempts_by_type[failure_type] = 0
            for f in self.state.failureHistory:
                if f.failureType == failure_type and not f.resolved:
                    f.resolved = True
            self.state.failureType = None
            self.state.failureSeverity = None
            self.state.activeDecision = None
            self.state.lastRecoveryOutcome = "Success"
            self.log("VERIFY", "Recovery outcome verified against task state.")
            self.state.taskStatus = "Executing"
            self.log("INFO", f"Continuing execution from step {self.state.currentStep}.")
        elif outcome == "Escalated":
            self.log("ESCALATION", "Autonomous recovery exhausted. Escalating to human operator.")
            self.state.taskStatus = "Escalated"
            self.state.lastRecoveryOutcome = "Escalated"
        else:
            self.log("ERROR", f"{RECOVERY_ACTIONS[action]['name']} did not resolve the failure.")
            self.state.retryCount += 1
            self._attempts_by_type[failure_type] = attempt_number + 1
            self.state.lastRecoveryOutcome = "Failed"
            self.log("STATE", "State re-analysed after failed recovery attempt.")
            new_decision = self.compute_decision()
            self.state.activeDecision = new_decision
            self.state.taskStatus = "Paused - Failure Detected"
            self.log(
                "POLICY",
                f"Recovery history updated. Policy re-evaluated state and selected: "
                f"{new_decision.selectedActionLabel} (attempt {new_decision.attemptNumber + 1}).",
            )

        return record

    def _apply_recovery_repairs(self, action: str) -> None:
        if action in ("replan", "subtask_decomposition"):
            self.state.planStatus = "Active"
            self.state.goalAlignment = min(1.0, self.state.goalAlignment + 0.15)
        if action in ("replan", "rollback"):
            self.state.environmentStatus = "Stable"
        if action in ("context_reconstruction", "rollback"):
            self.state.contextIntegrity = min(100.0, self.state.contextIntegrity + 30)
        if action == "revalidate":
            self.state.contextIntegrity = min(100.0, self.state.contextIntegrity + 8)
        if action == "alternative_tool":
            self.state.currentTool = f"{self.state.currentTool or 'tool'}_alt"


# a single in-memory session for the interactive demo (Sections 1-18)
session = Session()
