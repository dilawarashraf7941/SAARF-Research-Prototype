"""
Static reference data for SAARF: the demonstration task definition, the 8
injectable failure types, their deterministic classification mapping, and
the 9 canonical recovery actions.

This module is the "ontology" of the prototype. Everything in the policy
engine (policy.py) reasons over these fixed vocabularies. Keeping them here
(rather than scattered across route handlers) is what makes it possible to
later swap the deterministic engine for a real LLM/LangGraph implementation
without touching the vocabulary the rest of the system depends on.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Demonstration task (Section 6)
# ---------------------------------------------------------------------------

TASK_GOAL = "Research a topic, collect information from multiple sources, analyse the information, and generate a final report."

TASK_STEPS: list[dict] = [
    {"index": 1, "label": "Understand task", "tool": None},
    {"index": 2, "label": "Decompose goal", "tool": None},
    {"index": 3, "label": "Create research plan", "tool": None},
    {"index": 4, "label": "Identify information requirements", "tool": None},
    {"index": 5, "label": "Search source 1", "tool": "search_api"},
    {"index": 6, "label": "Search source 2", "tool": "search_api"},
    {"index": 7, "label": "Collect evidence", "tool": "search_api"},
    {"index": 8, "label": "Validate evidence", "tool": "validator"},
    {"index": 9, "label": "Analyse information", "tool": "analysis_engine"},
    {"index": 10, "label": "Detect missing information", "tool": "analysis_engine"},
    {"index": 11, "label": "Search additional source", "tool": "search_api"},
    {"index": 12, "label": "Synthesise findings", "tool": "analysis_engine"},
    {"index": 13, "label": "Verify consistency", "tool": "validator"},
    {"index": 14, "label": "Generate report", "tool": "report_generator"},
    {"index": 15, "label": "Final verification", "tool": "validator"},
]

TOTAL_STEPS = len(TASK_STEPS)

# ---------------------------------------------------------------------------
# Failure types (Section 7) -> classification (Section 10)
# ---------------------------------------------------------------------------
# `category`   : the deterministic failure classification label
# `directionLabel` : the human-readable "recovery direction" from Section 10
#                     (shown to the committee as the conceptual response)
# `ladder`     : canonical action ids (Section 16) tried in order as the
#                policy escalates through repeated failures of this type
# `defaultSeverity` : severity assigned when this failure is injected fresh

FAILURE_TYPES: dict[str, dict] = {
    "api_timeout": {
        "label": "API Timeout",
        "category": "Temporary Tool Failure",
        "directionLabel": "Controlled Retry",
        "defaultSeverity": "Low",
        "ladder": ["retry", "alternative_tool", "strategy_switch", "human_escalation"],
        "description": "The external research API did not respond within the expected time window.",
    },
    "invalid_tool_output": {
        "label": "Invalid Tool Output",
        "category": "Tool Output Failure",
        "directionLabel": "Revalidation / Alternative Tool",
        "defaultSeverity": "Medium",
        "ladder": ["revalidate", "alternative_tool", "strategy_switch", "human_escalation"],
        "description": "A tool returned output that failed schema or content validation.",
    },
    "planning_failure": {
        "label": "Planning Failure",
        "category": "Planning Failure",
        "directionLabel": "Replanning",
        "defaultSeverity": "Medium",
        "ladder": ["replan", "subtask_decomposition", "strategy_switch", "human_escalation"],
        "description": "The current plan can no longer lead to the goal (e.g. an unreachable sub-goal).",
    },
    "environment_change": {
        "label": "Environment Change",
        "category": "Environmental Failure",
        "directionLabel": "State Refresh + Replanning",
        "defaultSeverity": "Medium",
        "ladder": ["rollback", "replan", "strategy_switch", "human_escalation"],
        "description": "The external environment changed underneath the agent (e.g. source unavailable).",
    },
    "context_degradation": {
        "label": "Context Degradation",
        "category": "Context Failure",
        "directionLabel": "Context Reconstruction",
        "defaultSeverity": "Medium",
        "ladder": ["context_reconstruction", "rollback", "strategy_switch", "human_escalation"],
        "description": "The agent's working context has drifted or lost coherence with the task history.",
    },
    "memory_inconsistency": {
        "label": "Memory Inconsistency",
        "category": "Memory Failure",
        "directionLabel": "Memory Validation",
        "defaultSeverity": "Medium",
        "ladder": ["revalidate", "context_reconstruction", "strategy_switch", "human_escalation"],
        "description": "Stored intermediate results conflict with one another or with current observations.",
    },
    "goal_drift": {
        "label": "Goal Drift",
        "category": "Goal Alignment Failure",
        "directionLabel": "Goal Realignment / Replanning",
        "defaultSeverity": "High",
        "ladder": ["replan", "subtask_decomposition", "strategy_switch", "human_escalation"],
        "description": "The agent's recent actions are diverging from the original task goal.",
    },
    "repeated_failure": {
        "label": "Repeated Failure",
        "category": "Persistent Failure",
        "directionLabel": "Strategy Switch / Escalation",
        "defaultSeverity": "High",
        "ladder": ["strategy_switch", "human_escalation"],
        "description": "The same failure has recurred after recovery was already attempted.",
    },
}

# ---------------------------------------------------------------------------
# Recovery actions (Section 16)
# ---------------------------------------------------------------------------

RECOVERY_ACTIONS: dict[str, dict] = {
    "retry": {
        "name": "Retry",
        "description": "Re-attempt the exact same action unchanged, assuming the failure was transient.",
        "applicableCategories": ["Temporary Tool Failure"],
        "expectedEffect": "Recovers if the underlying cause was transient (e.g. a dropped connection).",
    },
    "revalidate": {
        "name": "Revalidate",
        "description": "Re-run validation on the last output or stored fact before deciding how to proceed.",
        "applicableCategories": ["Tool Output Failure", "Memory Failure"],
        "expectedEffect": "Confirms whether the data is actually unusable or was a false positive.",
    },
    "replan": {
        "name": "Replan",
        "description": "Invoke the planning module to produce a revised plan from the current state.",
        "applicableCategories": ["Planning Failure", "Environmental Failure", "Goal Alignment Failure"],
        "expectedEffect": "Produces a plan consistent with the current environment and goal.",
    },
    "rollback": {
        "name": "Rollback",
        "description": "Revert state to the last known-good checkpoint before the failure occurred.",
        "applicableCategories": ["Environmental Failure", "Context Failure"],
        "expectedEffect": "Removes corrupted intermediate state before retrying forward.",
    },
    "alternative_tool": {
        "name": "Alternative Tool",
        "description": "Substitute a different tool capable of achieving the same sub-goal.",
        "applicableCategories": ["Temporary Tool Failure", "Tool Output Failure"],
        "expectedEffect": "Bypasses a tool-specific fault without abandoning the current plan.",
    },
    "context_reconstruction": {
        "name": "Context Reconstruction",
        "description": "Rebuild working context from verified episodic memory and task history.",
        "applicableCategories": ["Context Failure", "Memory Failure"],
        "expectedEffect": "Restores coherent context so execution can resume reliably.",
    },
    "subtask_decomposition": {
        "name": "Subtask Decomposition",
        "description": "Break the failing step into smaller, independently verifiable subtasks.",
        "applicableCategories": ["Planning Failure", "Goal Alignment Failure"],
        "expectedEffect": "Reduces the chance of the same complex step failing again.",
    },
    "strategy_switch": {
        "name": "Strategy Switch",
        "description": "Abandon the current recovery strategy family and adopt a materially different one.",
        "applicableCategories": ["Persistent Failure"],
        "expectedEffect": "Used once history shows the current strategy family will not converge.",
    },
    "human_escalation": {
        "name": "Human Escalation",
        "description": "Suspend autonomous execution and hand control to a human operator.",
        "applicableCategories": ["Persistent Failure"],
        "expectedEffect": "Prevents unbounded resource use once autonomous recovery is exhausted.",
    },
}

RECOVERY_ACTION_IDS = list(RECOVERY_ACTIONS.keys())
