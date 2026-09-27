"""Pydantic data models shared across the SAARF simulation engine and API."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

TaskStatus = Literal[
    "Idle", "Executing", "Paused - Failure Detected", "Recovering",
    "Replanning", "Escalated", "Completed",
]
PlanStatus = Literal["Active", "Replanning", "Invalid", "Completed"]
EnvironmentStatus = Literal["Stable", "Degraded", "Changed"]
Severity = Literal["Low", "Medium", "High"]
LogLevel = Literal[
    "INFO", "PLAN", "ACTION", "TOOL", "ERROR", "DETECTOR",
    "STATE", "POLICY", "RECOVERY", "SUCCESS", "VERIFY", "ESCALATION",
]


class FailureRecord(BaseModel):
    failureType: str
    label: str
    category: str
    severity: Severity
    step: int
    occurredAtLog: int
    resolved: bool = False


class RecoveryRecord(BaseModel):
    action: str
    actionLabel: str
    failureType: str
    step: int
    attemptNumber: int
    outcome: Literal["Success", "Failed", "Escalated"]
    occurredAtLog: int


class ResourceUsage(BaseModel):
    tokensUsed: int
    estimatedCostUsd: float
    label: Literal["Simulation"] = "Simulation"


class LogEntry(BaseModel):
    index: int
    timestamp: str
    level: LogLevel
    message: str


class RecoveryDecision(BaseModel):
    failureType: str
    failureLabel: str
    category: str
    severity: Severity
    stateAnalysis: list[str]
    recoveryHistorySummary: str
    selectedAction: str
    selectedActionLabel: str
    rejectedActions: list[dict]
    reasoning: str
    attemptNumber: int


class AgentState(BaseModel):
    taskId: str
    taskGoal: str
    currentStep: int
    totalSteps: int
    stepLabel: str
    taskStatus: TaskStatus
    planStatus: PlanStatus
    environmentStatus: EnvironmentStatus
    contextIntegrity: float
    goalAlignment: float
    currentTool: Optional[str]
    failureType: Optional[str]
    failureSeverity: Optional[Severity]
    failureHistory: list[FailureRecord]
    recoveryHistory: list[RecoveryRecord]
    retryCount: int
    completedActions: list[str]
    pendingActions: list[str]
    resourceUsage: ResourceUsage
    activeDecision: Optional[RecoveryDecision] = None
    lastRecoveryOutcome: Optional[str] = None


class SessionSnapshot(BaseModel):
    state: AgentState
    logs: list[LogEntry]


class InjectFailureRequest(BaseModel):
    failureType: str


class ExecuteRecoveryRequest(BaseModel):
    action: Optional[str] = Field(default=None)
    # Demonstration-only control: lets a presenter force this specific attempt
    # to fail, so the escalation ladder (retry -> alternative tool -> strategy
    # switch -> human escalation) can be walked live in the interactive UI,
    # not only inside the scripted Run Demo / Committee Demo. Never used by
    # the policy itself and never changes which action the policy selects;
    # it only overrides whether the chosen action is recorded as succeeding.
    simulateOutcome: Optional[Literal["Success", "Failed"]] = Field(default=None)


class ScenarioRunRequest(BaseModel):
    scenarioId: Literal["api_timeout", "planning_failure", "repeated_failure"]


class ExperimentRunRequest(BaseModel):
    approach: Literal["fixed_retry", "generic_self_correction", "saarf"]
    failureSequence: list[str]
