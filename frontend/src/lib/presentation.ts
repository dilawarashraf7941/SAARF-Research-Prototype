import type { AgentState, LogLevel, Severity, TaskStatus } from "./types";

export type Tone = "success" | "warning" | "danger" | "neutral" | "navy" | "accent" | "info";

export function statusTone(status: TaskStatus | undefined | null): Tone {
  switch (status) {
    case "Executing":
    case "Completed":
      return "success";
    case "Recovering":
    case "Replanning":
      return "warning";
    case "Paused - Failure Detected":
    case "Escalated":
      return "danger";
    default:
      return "neutral";
  }
}

export function severityTone(sev: Severity | null | undefined): Tone {
  if (sev === "High") return "danger";
  if (sev === "Medium") return "warning";
  if (sev === "Low") return "info";
  return "neutral";
}

export const toneClasses: Record<Tone, string> = {
  success: "bg-green-50 text-green-700 ring-green-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/25",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
  navy: "bg-navy-50 text-navy ring-navy/20",
  accent: "bg-accent-50 text-accent ring-accent/25",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

export const toneDot: Record<Tone, string> = {
  success: "bg-green-600",
  warning: "bg-amber-600",
  danger: "bg-red-600",
  neutral: "bg-slate-400",
  navy: "bg-navy",
  accent: "bg-accent",
  info: "bg-sky-600",
};

// ---- Log levels -----------------------------------------------------------

export const LOG_LEVELS: LogLevel[] = [
  "INFO",
  "PLAN",
  "ACTION",
  "TOOL",
  "ERROR",
  "DETECTOR",
  "STATE",
  "POLICY",
  "RECOVERY",
  "SUCCESS",
  "VERIFY",
  "ESCALATION",
];

export const logLevelStyle: Record<LogLevel, { border: string; text: string; chip: string; description: string }> = {
  INFO: { border: "border-l-slate-400", text: "text-slate-600", chip: "bg-slate-100 text-slate-700", description: "General lifecycle information" },
  PLAN: { border: "border-l-indigo-500", text: "text-indigo-700", chip: "bg-indigo-50 text-indigo-700", description: "Planner output" },
  ACTION: { border: "border-l-navy", text: "text-navy", chip: "bg-navy-50 text-navy", description: "Agent executing a plan step" },
  TOOL: { border: "border-l-accent", text: "text-accent", chip: "bg-accent-50 text-accent", description: "Simulated tool invocation" },
  ERROR: { border: "border-l-red-600", text: "text-red-700", chip: "bg-red-50 text-red-700", description: "A failure signal was observed" },
  DETECTOR: { border: "border-l-amber-500", text: "text-amber-700", chip: "bg-amber-50 text-amber-800", description: "Failure classification" },
  STATE: { border: "border-l-slate-500", text: "text-slate-700", chip: "bg-slate-100 text-slate-700", description: "Agent state assessment" },
  POLICY: { border: "border-l-accent", text: "text-accent", chip: "bg-accent-50 text-accent", description: "Adaptive recovery policy decision" },
  RECOVERY: { border: "border-l-blue-600", text: "text-blue-700", chip: "bg-blue-50 text-blue-700", description: "Recovery action execution" },
  SUCCESS: { border: "border-l-green-600", text: "text-green-700", chip: "bg-green-50 text-green-700", description: "Successful outcome" },
  VERIFY: { border: "border-l-teal-600", text: "text-teal-700", chip: "bg-teal-50 text-teal-700", description: "Verification of an outcome" },
  ESCALATION: { border: "border-l-red-700", text: "text-red-800 font-semibold", chip: "bg-red-100 text-red-800", description: "Escalation to a human operator" },
};

// ---- Workflow diagram nodes (Section 5) ----------------------------------

export type WorkflowNodeId =
  | "user_task"
  | "task_planning"
  | "agent_execution"
  | "observation"
  | "verify"
  | "state_update"
  | "final_result"
  | "failure_detection"
  | "failure_classification"
  | "state_assessment"
  | "adaptive_recovery_policy"
  | "recovery_action"
  | "verification"
  | "continue_replan_escalate";

/** Map a Frame.highlight value (6 possible values, see API_CONTRACT.md) to diagram node(s). */
export function highlightToNodes(highlight: string | null | undefined): WorkflowNodeId[] {
  switch (highlight) {
    case "agent_execution":
      return ["agent_execution"];
    case "failure_detection":
      return ["failure_detection"];
    case "adaptive_recovery_policy":
      return ["state_assessment", "adaptive_recovery_policy"];
    case "recovery_action":
      return ["recovery_action"];
    case "continue_replan_escalate":
      return ["continue_replan_escalate"];
    case "final_result":
      return ["final_result"];
    default:
      return [];
  }
}

/** Derive which diagram nodes represent the LIVE session state. */
export function liveHighlight(state: AgentState | null): { nodes: WorkflowNodeId[]; pulse: boolean } {
  if (!state) return { nodes: [], pulse: false };
  switch (state.taskStatus) {
    case "Completed":
      return { nodes: ["final_result"], pulse: false };
    case "Escalated":
      return { nodes: ["continue_replan_escalate"], pulse: false };
    case "Recovering":
    case "Replanning":
      return { nodes: ["recovery_action"], pulse: true };
    case "Paused - Failure Detected":
      if (state.activeDecision) {
        return { nodes: ["adaptive_recovery_policy"], pulse: true };
      }
      return { nodes: ["failure_detection"], pulse: true };
    case "Executing":
      if (state.failureType) return { nodes: ["failure_detection"], pulse: true };
      return { nodes: ["agent_execution"], pulse: true };
    case "Idle":
    default:
      return { nodes: ["user_task"], pulse: false };
  }
}

export function formatTokens(n: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.round(n));
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

export function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}
