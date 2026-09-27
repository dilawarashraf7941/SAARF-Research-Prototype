"use client";

import type { AgentState } from "@/lib/types";
import { severityTone, statusTone } from "@/lib/presentation";
import { Pill, ProgressBar, SimTag, cx } from "./ui";

/** Compact read-only summary of an AgentState (used in scenario playback frames). */
export default function StateSummary({ state, className }: { state: AgentState; className?: string }) {
  const envTone = state.environmentStatus === "Stable" ? "success" : state.environmentStatus === "Degraded" ? "warning" : "danger";
  const planTone = state.planStatus === "Active" || state.planStatus === "Completed" ? "success" : state.planStatus === "Replanning" ? "warning" : "danger";
  return (
    <div className={cx("grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-3", className)}>
      <Field label="Task status">
        <Pill tone={statusTone(state.taskStatus)} dot>
          {state.taskStatus}
        </Pill>
      </Field>
      <Field label="Step">
        <span className="font-medium tabular-nums text-navy">
          {state.currentStep} / {state.totalSteps}
        </span>
        <span className="block truncate text-xs text-slate-500">{state.stepLabel}</span>
      </Field>
      <Field label="Failure">
        {state.failureType ? (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-red-700">{state.activeDecision?.failureLabel ?? state.failureType}</span>
            {state.failureSeverity && <Pill tone={severityTone(state.failureSeverity)}>{state.failureSeverity}</Pill>}
          </span>
        ) : (
          <span className="text-slate-400">None active</span>
        )}
      </Field>
      <Field label="Plan status">
        <Pill tone={planTone}>{state.planStatus}</Pill>
      </Field>
      <Field label="Environment">
        <Pill tone={envTone}>{state.environmentStatus}</Pill>
      </Field>
      <Field label="Recovery attempts">
        <span className="font-medium tabular-nums text-navy">{state.recoveryHistory.length}</span>
        {state.lastRecoveryOutcome && <span className="ml-1.5 text-xs text-slate-500">last: {state.lastRecoveryOutcome}</span>}
      </Field>
      <Field label="Context integrity">
        <div className="flex items-center gap-2">
          <ProgressBar value={state.contextIntegrity} tone={state.contextIntegrity < 70 ? "warning" : "navy"} className="h-1.5" />
          <span className="w-10 text-right text-xs tabular-nums text-slate-600">{Math.round(state.contextIntegrity)}%</span>
        </div>
      </Field>
      <Field label="Goal alignment">
        <div className="flex items-center gap-2">
          <ProgressBar value={state.goalAlignment} max={1} tone={state.goalAlignment < 0.8 ? "warning" : "accent"} className="h-1.5" />
          <span className="w-10 text-right text-xs tabular-nums text-slate-600">{state.goalAlignment.toFixed(2)}</span>
        </div>
      </Field>
      <Field label={<span className="inline-flex items-center gap-1.5">Tokens <SimTag /></span>}>
        <span className="font-medium tabular-nums text-navy">{state.resourceUsage.tokensUsed.toLocaleString("en-GB")}</span>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
      {children}
    </div>
  );
}
