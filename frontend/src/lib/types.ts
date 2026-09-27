// Types mirror API_CONTRACT.md exactly. Do not add fields that the backend does not serve.

export type TaskStatus =
  | "Idle"
  | "Executing"
  | "Paused - Failure Detected"
  | "Recovering"
  | "Replanning"
  | "Escalated"
  | "Completed";
export type PlanStatus = "Active" | "Replanning" | "Invalid" | "Completed";
export type EnvironmentStatus = "Stable" | "Degraded" | "Changed";
export type Severity = "Low" | "Medium" | "High";
export type LogLevel =
  | "INFO"
  | "PLAN"
  | "ACTION"
  | "TOOL"
  | "ERROR"
  | "DETECTOR"
  | "STATE"
  | "POLICY"
  | "RECOVERY"
  | "SUCCESS"
  | "VERIFY"
  | "ESCALATION";
export type RecoveryOutcome = "Success" | "Failed" | "Escalated";

export interface FailureRecord {
  failureType: string;
  label: string;
  category: string;
  severity: Severity;
  step: number;
  occurredAtLog: number;
  resolved: boolean;
}

export interface RecoveryRecord {
  action: string;
  actionLabel: string;
  failureType: string;
  step: number;
  attemptNumber: number;
  outcome: RecoveryOutcome;
  occurredAtLog: number;
}

export interface ResourceUsage {
  tokensUsed: number;
  estimatedCostUsd: number;
  label: "Simulation";
}

export interface LogEntry {
  index: number;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface RejectedAction {
  action: string;
  reason: string;
}

export interface RecoveryDecision {
  failureType: string;
  failureLabel: string;
  category: string;
  severity: Severity;
  stateAnalysis: string[];
  recoveryHistorySummary: string;
  selectedAction: string;
  selectedActionLabel: string;
  rejectedActions: RejectedAction[];
  reasoning: string;
  attemptNumber: number;
}

export interface AgentState {
  taskId: string;
  taskGoal: string;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  taskStatus: TaskStatus;
  planStatus: PlanStatus;
  environmentStatus: EnvironmentStatus;
  contextIntegrity: number;
  goalAlignment: number;
  currentTool: string | null;
  failureType: string | null;
  failureSeverity: Severity | null;
  failureHistory: FailureRecord[];
  recoveryHistory: RecoveryRecord[];
  retryCount: number;
  completedActions: string[];
  pendingActions: string[];
  resourceUsage: ResourceUsage;
  activeDecision: RecoveryDecision | null;
  lastRecoveryOutcome: RecoveryOutcome | null;
}

export interface SessionSnapshot {
  state: AgentState;
  logs: LogEntry[];
}

export interface FailureType {
  id: string;
  label: string;
  category: string;
  directionLabel: string;
  description: string;
  defaultSeverity: Severity;
}

export type Compatibility = "selected" | "rejected" | "possible" | "not_applicable" | "idle";

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  applicableCategories: string[];
  expectedEffect: string;
  compatibility: Compatibility;
}

export type HighlightId =
  | "agent_execution"
  | "failure_detection"
  | "adaptive_recovery_policy"
  | "recovery_action"
  | "continue_replan_escalate"
  | "final_result";

export interface Frame {
  caption: string;
  highlight: string;
  stage: string;
  state: AgentState | null;
  logsAdded: LogEntry[];
  sectionTitle?: string;
  summaryPoints?: string[];
}

export type ScenarioId = "api_timeout" | "planning_failure" | "repeated_failure";

export interface ScenarioRunResponse {
  scenarioId: string;
  frames: Frame[];
}

export interface CommitteeDemoResponse {
  frames: Frame[];
}

export interface Approach {
  id: string;
  name: string;
  description: string;
}

export interface SimulationStep {
  failureType: string;
  failureLabel: string;
  category: string;
  actionsAttempted: string[];
  resolved: boolean;
  outcome: string;
}

export interface SimulationTrace {
  approach: string;
  steps: SimulationStep[];
  overallResolved: boolean;
  totalActionsAttempted: number;
}

export interface ExperimentMetrics {
  taskSuccessRate: string;
  recoveryRate: string;
  recoveryCost: string;
}
