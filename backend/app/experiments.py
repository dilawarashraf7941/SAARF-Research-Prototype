"""
Experiments page support (Section 20).

IMPORTANT (research integrity): this module never fabricates a performance
statistic. It runs a deterministic MECHANISM trace for three approaches
against the same injected failure sequence, so the committee can see *how*
each approach behaves -- whether it retries blindly, gives up, or adapts.
The headline quantitative metrics (Task Success Rate, Recovery Rate,
Recovery Cost) are intentionally NOT computed from this trace and are
reported as unavailable pending real experiments; see the `/api/experiments/
metrics` endpoint, which always returns "Experimental data not available".
"""

from __future__ import annotations

from .engine import Session
from .reference_data import FAILURE_TYPES, RECOVERY_ACTIONS

APPROACHES = {
    "fixed_retry": {
        "name": "Fixed Retry",
        "description": "Retries the same action a fixed number of times on any failure, "
                        "regardless of failure type or state. No classification, no history.",
    },
    "generic_self_correction": {
        "name": "Generic Self-Correction",
        "description": "Applies a single generic corrective step to any failure, then gives "
                        "up. Not state-aware and not history-aware.",
    },
    "saarf": {
        "name": "Proposed SAARF",
        "description": "Classifies the failure, inspects current state and recovery history, "
                        "and selects a recovery action from a state-dependent policy.",
    },
}

# Categories a fixed/generic strategy can plausibly resolve without state
# awareness (i.e. genuinely transient / superficial faults).
_SIMPLE_CATEGORIES = {"Temporary Tool Failure", "Tool Output Failure"}

FIXED_RETRY_ATTEMPTS = 3


def _simulate_fixed_retry(failure_sequence: list[str]) -> dict:
    steps = []
    for failure_type in failure_sequence:
        meta = FAILURE_TYPES[failure_type]
        resolvable = meta["category"] in _SIMPLE_CATEGORIES
        attempts = ["Retry"] * (1 if resolvable else FIXED_RETRY_ATTEMPTS)
        steps.append({
            "failureType": failure_type, "failureLabel": meta["label"],
            "category": meta["category"], "actionsAttempted": attempts,
            "resolved": resolvable,
            "outcome": "Recovered" if resolvable else "Unresolved - task stalled",
        })
    return {
        "approach": "fixed_retry", "steps": steps,
        "overallResolved": all(s["resolved"] for s in steps),
        "totalActionsAttempted": sum(len(s["actionsAttempted"]) for s in steps),
    }


def _simulate_generic_self_correction(failure_sequence: list[str]) -> dict:
    steps = []
    for failure_type in failure_sequence:
        meta = FAILURE_TYPES[failure_type]
        resolvable = meta["category"] in _SIMPLE_CATEGORIES
        attempts = ["Self-Correct"] if resolvable else ["Self-Correct", "Self-Correct"]
        steps.append({
            "failureType": failure_type, "failureLabel": meta["label"],
            "category": meta["category"], "actionsAttempted": attempts,
            "resolved": resolvable,
            "outcome": "Recovered" if resolvable else "Unresolved - ungraceful stop",
        })
    return {
        "approach": "generic_self_correction", "steps": steps,
        "overallResolved": all(s["resolved"] for s in steps),
        "totalActionsAttempted": sum(len(s["actionsAttempted"]) for s in steps),
    }


def _simulate_saarf(failure_sequence: list[str]) -> dict:
    sess = Session(task_id="experiment-saarf")
    steps = []
    for failure_type in failure_sequence:
        if sess.state.taskStatus != "Executing":
            sess.reset()
        meta = FAILURE_TYPES[failure_type]
        sess.inject_failure(failure_type)
        actions_attempted = []
        resolved = False
        outcome = "Unresolved"
        for _ in range(6):
            decision = sess.state.activeDecision
            actions_attempted.append(RECOVERY_ACTIONS[decision.selectedAction]["name"])
            sess.execute_recovery()
            if sess.state.lastRecoveryOutcome == "Success":
                resolved = True
                outcome = "Recovered"
                break
            if sess.state.lastRecoveryOutcome == "Escalated":
                outcome = "Escalated to human operator"
                break
        steps.append({
            "failureType": failure_type, "failureLabel": meta["label"],
            "category": meta["category"], "actionsAttempted": actions_attempted,
            "resolved": resolved, "outcome": outcome,
        })
    return {
        "approach": "saarf", "steps": steps,
        "overallResolved": all(s["resolved"] for s in steps),
        "totalActionsAttempted": sum(len(s["actionsAttempted"]) for s in steps),
    }


_SIMULATORS = {
    "fixed_retry": _simulate_fixed_retry,
    "generic_self_correction": _simulate_generic_self_correction,
    "saarf": _simulate_saarf,
}


def simulate(approach: str, failure_sequence: list[str]) -> dict:
    if approach not in _SIMULATORS:
        raise ValueError(f"Unknown approach '{approach}'.")
    if not failure_sequence:
        raise ValueError("failureSequence must contain at least one failure type.")
    for f in failure_sequence:
        if f not in FAILURE_TYPES:
            raise ValueError(f"Unknown failure type '{f}'.")
    return _SIMULATORS[approach](failure_sequence)
