"""
Scripted narrative walkthroughs for the "Run Demo" buttons (Sections 13-15)
and the Committee Demo (Section 22).

Each scenario runs on its own isolated Session (never the shared interactive
session used by the Run Agent / Inject Failure pages) and drives it through
the real engine (engine.py) -- the SAME classification and policy code the
interactive pages use. The only thing that is "scripted" is which failure is
injected at which step and, where the narrative requires it, that a
recovery attempt is forced to fail so the escalation ladder is visible
inside a short demo. No outcome or number is invented: every state value
shown is produced by actually running the deterministic engine.
"""

from __future__ import annotations

from typing import Optional

from .engine import Session
from .reference_data import FAILURE_TYPES


def _advance_to_step(sess: Session, target_step: int) -> None:
    while sess.state.currentStep < target_step and sess.state.taskStatus == "Executing":
        sess.step()


def _capture(sess: Session, marker: list[int], caption: str, highlight: str, stage: str) -> dict:
    logs_added = sess.logs_since(marker[0])
    marker[0] = len(sess._logs)
    return {
        "caption": caption,
        "highlight": highlight,
        "stage": stage,
        "state": sess.state.model_dump(),
        "logsAdded": [log.model_dump() for log in logs_added],
    }


def _scenario_api_timeout() -> list[dict]:
    sess = Session(task_id="scenario-api-timeout")
    marker = [len(sess._logs)]
    frames = []

    _advance_to_step(sess, 7)
    frames.append(_capture(sess, marker, "Agent is executing the demonstration task normally.",
                            "agent_execution", "executing"))

    sess.inject_failure("api_timeout")
    frames.append(_capture(sess, marker,
                            "An API Timeout is injected at step 7. The failure detector "
                            "classifies it as a Temporary Tool Failure.",
                            "failure_detection", "failure_detected"))

    frames.append(_capture(sess, marker,
                            "State assessment: environment stable, plan valid, no previous "
                            "retry for this failure. The policy selects a Controlled Retry.",
                            "adaptive_recovery_policy", "policy_decision"))

    sess.execute_recovery()
    frames.append(_capture(sess, marker,
                            "Controlled Retry is executed. The API call succeeds and the "
                            "output is verified.",
                            "recovery_action", "recovery_success"))

    sess.step()
    frames.append(_capture(sess, marker,
                            "Execution continues to step 8.",
                            "continue_replan_escalate", "continue"))

    return frames


def _scenario_planning_failure() -> list[dict]:
    sess = Session(task_id="scenario-planning-failure")
    marker = [len(sess._logs)]
    frames = []

    _advance_to_step(sess, 8)
    frames.append(_capture(sess, marker, "Agent is executing the demonstration task normally.",
                            "agent_execution", "executing"))

    sess.inject_failure("planning_failure")
    frames.append(_capture(sess, marker,
                            "A Planning Failure is injected at step 8: the current plan can "
                            "no longer reach the goal.",
                            "failure_detection", "failure_detected"))

    frames.append(_capture(sess, marker,
                            "State assessment: Retry is considered and rejected, because the "
                            "failure category is Planning Failure -- re-attempting the same "
                            "action cannot fix an invalid plan. Replanning is selected instead.",
                            "adaptive_recovery_policy", "policy_decision"))

    sess.execute_recovery()
    frames.append(_capture(sess, marker,
                            "Replanning is executed. A new plan is generated and the plan "
                            "status returns to Active.",
                            "recovery_action", "recovery_success"))

    sess.step()
    frames.append(_capture(sess, marker,
                            "Execution continues under the revised plan.",
                            "continue_replan_escalate", "continue"))

    return frames


def _scenario_repeated_failure() -> list[dict]:
    """
    Demonstrates the full escalation ladder: the same failure keeps recurring
    despite successive recovery attempts, so the policy climbs from a light
    intervention (Retry) to progressively stronger ones (Alternative Tool,
    Strategy Switch) before exhausting autonomous recovery and escalating to
    a human operator. Uses the API Timeout failure type because it has the
    full four-rung ladder (Retry -> Alternative Tool -> Strategy Switch ->
    Human Escalation); each attempt before the last is deliberately forced
    to fail (via the same internal mechanism the interactive UI's "force
    this attempt to fail" demonstration control uses) so the ladder is
    visible within a short scripted demo instead of resolving on attempt 1.
    """
    sess = Session(task_id="scenario-repeated-failure")
    marker = [len(sess._logs)]
    frames = []

    _advance_to_step(sess, 10)
    frames.append(_capture(sess, marker,
                            "Agent is executing the demonstration task normally.",
                            "agent_execution", "executing"))

    sess.inject_failure("api_timeout")
    frames.append(_capture(sess, marker,
                            "A failure is injected. It will recur across several recovery "
                            "attempts, to demonstrate how the policy escalates as its own "
                            "recovery history grows.",
                            "failure_detection", "failure_detected"))

    frames.append(_capture(sess, marker,
                            "State assessment: no previous attempts yet for this failure. "
                            "The policy selects the lightest available action, a Controlled "
                            "Retry.",
                            "adaptive_recovery_policy", "policy_decision"))

    sess.execute_recovery(force_outcome="Failed")
    frames.append(_capture(sess, marker,
                            "Retry is attempted and fails. The attempt is recorded in the "
                            "recovery history.",
                            "recovery_action", "recovery_failed"))

    frames.append(_capture(sess, marker,
                            "The policy re-evaluates using the updated recovery history: "
                            "retrying again would repeat a technique that has already failed, "
                            "so it escalates to an Alternative Tool.",
                            "adaptive_recovery_policy", "policy_decision"))

    sess.execute_recovery(force_outcome="Failed")
    frames.append(_capture(sess, marker,
                            "Alternative Tool is attempted and also fails. Recovery history "
                            "now shows two unsuccessful attempts for this failure.",
                            "recovery_action", "recovery_failed"))

    frames.append(_capture(sess, marker,
                            "The policy re-evaluates again. With two lighter techniques "
                            "exhausted, it selects a Strategy Switch -- abandoning the current "
                            "recovery approach for a materially different one.",
                            "adaptive_recovery_policy", "policy_decision"))

    sess.execute_recovery(force_outcome="Failed")
    frames.append(_capture(sess, marker,
                            "Strategy Switch is attempted and fails. The recovery history now "
                            "shows three unsuccessful attempts for this failure.",
                            "recovery_action", "recovery_failed"))

    frames.append(_capture(sess, marker,
                            "The policy re-evaluates a final time. With the available "
                            "autonomous strategies exhausted, Human Escalation is selected.",
                            "adaptive_recovery_policy", "policy_decision"))

    sess.execute_recovery()
    frames.append(_capture(sess, marker,
                            "Execution is suspended and escalated to a human operator.",
                            "continue_replan_escalate", "escalated"))

    return frames


SCENARIOS = {
    "api_timeout": _scenario_api_timeout,
    "planning_failure": _scenario_planning_failure,
    "repeated_failure": _scenario_repeated_failure,
}


def run_scenario(scenario_id: str) -> list[dict]:
    if scenario_id not in SCENARIOS:
        raise ValueError(f"Unknown scenario '{scenario_id}'.")
    return SCENARIOS[scenario_id]()


def committee_demo_frames() -> list[dict]:
    """
    The full guided walkthrough for Section 22 (Committee Demo):
    Normal Execution -> API Timeout -> Controlled Retry -> Successful Recovery
    -> Planning Failure -> Retry Rejected -> Replanning -> Repeated Failure
    -> Retry -> Alternative Tool -> Strategy Switch -> Human Escalation.

    Step numbers ("Step N of TOTAL") are computed from the actual frame count
    below rather than hardcoded, so they can never drift out of sync with the
    underlying scenario scripts.
    """
    intro = {
        "caption": "Normal agent execution on the 15-step demonstration task.",
        "highlight": "agent_execution", "stage": "intro", "state": None, "logsAdded": [],
        "sectionTitle": "Normal Execution",
    }
    reset = {
        "caption": "Reset to a clean task state.",
        "highlight": "agent_execution", "stage": "reset", "state": None, "logsAdded": [],
        "sectionTitle": "Reset",
    }

    api_frames = _scenario_api_timeout()[1:]
    api_captions = [
        "Inject an API Timeout.",
        "State assessment runs against the current agent state.",
        "Controlled Retry is selected and executed.",
        "Recovery succeeds; execution continues.",
    ]
    plan_frames = _scenario_planning_failure()[1:]
    plan_captions = [
        "Inject a Planning Failure.",
        "The policy shows that Retry is inappropriate here and rejects it.",
        "Replanning is selected and executed instead.",
        "Recovery succeeds under the revised plan; execution continues.",
    ]
    rep_frames = _scenario_repeated_failure()[1:]
    rep_captions = [
        "Inject a failure that will recur across several recovery attempts.",
        "State assessment: no prior attempts yet. A Controlled Retry is selected.",
        "Retry fails; the attempt is recorded in the recovery history.",
        "Re-evaluation escalates to an Alternative Tool.",
        "Alternative Tool also fails; recovery history now shows two failed attempts.",
        "Re-evaluation escalates to a Strategy Switch.",
        "Strategy Switch fails; recovery history now shows three failed attempts.",
        "Re-evaluation selects Human Escalation: autonomous strategies are exhausted.",
        "Execution is suspended and escalated to a human operator.",
    ]

    numbered: list[tuple[str, str, dict]] = (
        [("Normal Execution", intro["caption"], intro)]
        + [("Scenario 1: Transient Failure", c, f) for c, f in zip(api_captions, api_frames)]
        + [("Reset", reset["caption"], reset)]
        + [("Scenario 2: Planning Failure", c, f) for c, f in zip(plan_captions, plan_frames)]
        + [("Scenario 3: Repeated Failure & Escalation", c, f) for c, f in zip(rep_captions, rep_frames)]
    )
    total = len(numbered)

    frames: list[dict] = []
    for i, (section_title, body, frame) in enumerate(numbered):
        frame = dict(frame)
        frame["sectionTitle"] = section_title
        frame["caption"] = f"Step {i + 1} of {total} -- {body}"
        frames.append(frame)

    frames.append({
        "caption": "Demonstration Complete.",
        "highlight": "final_result", "stage": "complete", "state": None, "logsAdded": [],
        "sectionTitle": "Summary",
        "summaryPoints": [
            "State Awareness", "Failure Classification", "Adaptive Recovery",
            "Recovery History", "Verification", "Human Escalation",
        ],
    })

    return frames
