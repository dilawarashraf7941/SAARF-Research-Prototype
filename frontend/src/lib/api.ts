// Single fetch wrapper for every backend call. Pages never call fetch() directly.
import type {
  AgentState,
  Approach,
  CommitteeDemoResponse,
  ExperimentMetrics,
  FailureType,
  LogEntry,
  RecoveryAction,
  RecoveryDecision,
  ScenarioId,
  ScenarioRunResponse,
  SessionSnapshot,
  SimulationTrace,
} from "./types";

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown }): Promise<T> {
  const method = init?.method ?? "GET";
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, `Cannot reach the SAARF backend at ${API_BASE}. Is the FastAPI server running?`);
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && typeof data.detail === "string") detail = data.detail;
      else if (data && data.detail) detail = JSON.stringify(data.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export const api = {
  health: () => request<{ status: string; mode: string }>("/api/health"),

  // Session / execution
  getSession: () => request<SessionSnapshot>("/api/session"),
  resetSession: () => request<SessionSnapshot>("/api/session/reset", { method: "POST" }),
  executeStep: () => request<SessionSnapshot>("/api/execute/step", { method: "POST" }),

  // State inspection
  getState: () => request<AgentState>("/api/state"),
  getLogs: (since = 0) => request<LogEntry[]>(`/api/logs?since=${since}`),

  // Failure injection
  getFailureTypes: () => request<FailureType[]>("/api/failure/types"),
  injectFailure: (failureType: string) =>
    request<SessionSnapshot>("/api/failure/inject", { method: "POST", body: { failureType } }),

  // Recovery
  getDecision: () => request<RecoveryDecision | null>("/api/recovery/decision"),
  getRecoveryActions: () => request<RecoveryAction[]>("/api/recovery/actions"),
  executeRecovery: (action?: string, simulateOutcome?: "Success" | "Failed") =>
    request<SessionSnapshot>("/api/recovery/execute", {
      method: "POST",
      body: { ...(action ? { action } : {}), ...(simulateOutcome ? { simulateOutcome } : {}) },
    }),

  // Scripted scenarios (isolated backend session)
  runScenario: (scenarioId: ScenarioId) =>
    request<ScenarioRunResponse>("/api/scenario/run", { method: "POST", body: { scenarioId } }),
  getCommitteeDemo: () => request<CommitteeDemoResponse>("/api/scenario/committee-demo"),

  // Experiments
  getApproaches: () => request<Approach[]>("/api/experiments/approaches"),
  simulate: (approach: string, failureSequence: string[]) =>
    request<SimulationTrace>("/api/experiments/simulate", {
      method: "POST",
      body: { approach, failureSequence },
    }),
  getMetrics: () => request<ExperimentMetrics>("/api/experiments/metrics"),
};
