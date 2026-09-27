"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, CheckCircle2, Coins, Gauge, History, LifeBuoy, RefreshCw, Workflow } from "lucide-react";
import { useLiveSession } from "@/lib/hooks";
import { useSession } from "@/lib/store";
import { formatTokens, formatUsd, severityTone, statusTone, type Tone } from "@/lib/presentation";
import type { AgentState, FailureRecord, RecoveryRecord } from "@/lib/types";
import { LiveAgentState } from "@/components/ResearchControlVisuals";
import { Button, Card, CardHeader, EmptyState, InfoTip, PageHeader, Pill, ProgressBar, SimTag, cx } from "@/components/ui";

type TimelineEvent =
  | { key: string; kind: "state"; step: number; label: string; status: "initial" | "completed" | "current" }
  | { key: string; kind: "failure"; record: FailureRecord }
  | { key: string; kind: "recovery"; record: RecoveryRecord };

function buildTimeline(s: AgentState): TimelineEvent[] {
  const events: TimelineEvent[] = [{ key: "S0", kind: "state", step: 0, label: "Task initialised", status: "initial" }];
  const done = s.taskStatus === "Completed";
  for (let n = 1; n <= s.currentStep; n++) {
    const completed = done || n < s.currentStep;
    events.push({
      key: `S${n}`,
      kind: "state",
      step: n,
      label: completed ? s.completedActions[n - 1] ?? `Step ${n}` : s.stepLabel,
      status: completed ? "completed" : "current",
    });
    const atStep: TimelineEvent[] = [
      ...s.failureHistory.filter((f) => f.step === n).map((f, i) => ({ key: `F${n}-${f.occurredAtLog}-${i}`, kind: "failure" as const, record: f })),
      ...s.recoveryHistory.filter((r) => r.step === n).map((r, i) => ({ key: `R${n}-${r.occurredAtLog}-${i}`, kind: "recovery" as const, record: r })),
    ];
    atStep.sort((a, b) => {
      const la = a.kind === "state" ? 0 : a.record.occurredAtLog;
      const lb = b.kind === "state" ? 0 : b.record.occurredAtLog;
      return la - lb;
    });
    events.push(...atStep);
  }
  return events;
}

export default function AgentStatePage() {
  useLiveSession("state");
  const state = useSession((s) => s.state);
  const refreshState = useSession((s) => s.refreshState);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await refreshState();
    setRefreshing(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="State representation"
        title="Agent State"
        description="The structured internal state the recovery policy reasons over. Refreshed from GET /api/state whenever this page is opened or the window regains focus."
        right={
          <Button size="sm" onClick={refresh} loading={refreshing} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        }
      />
      {!state ? (
        <Card>
          <EmptyState icon={<Gauge className="h-5 w-5" />} title="Loading agent state…" />
        </Card>
      ) : (
        <StateInspector state={state} />
      )}
    </div>
  );
}

function StateInspector({ state: s }: { state: AgentState }) {
  const envTone: Tone = s.environmentStatus === "Stable" ? "success" : s.environmentStatus === "Degraded" ? "warning" : "danger";
  const planTone: Tone = s.planStatus === "Active" || s.planStatus === "Completed" ? "success" : s.planStatus === "Replanning" ? "warning" : "danger";
  return (
    <div className="space-y-6">
      <LiveAgentState state={s} />
      <Timeline state={s} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Core state variables" icon={<Gauge className="h-4 w-4" />} right={<span className="font-mono text-xs text-slate-400">{s.taskId}</span>} />
          <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
            <Item label="Task" className="sm:col-span-2" tip="The demonstration task's goal statement.">
              <p className="text-sm leading-relaxed text-navy">{s.taskGoal}</p>
            </Item>
            <Item label="Current step" tip="The plan step currently being executed.">
              <p className="text-sm font-semibold tabular-nums text-navy">
                {s.currentStep} / {s.totalSteps} <span className="font-normal text-slate-500">— {s.stepLabel}</span>
              </p>
            </Item>
            <Item label="Task status">
              <Pill tone={statusTone(s.taskStatus)} dot>
                {s.taskStatus}
              </Pill>
            </Item>
            <Item label="Plan status" tip="Whether the current plan is still valid. An Invalid plan makes retrying pointless — the policy uses this to reject Retry.">
              <Pill tone={planTone} dot>
                {s.planStatus}
              </Pill>
            </Item>
            <Item label="Environment status" tip="Stable, Degraded or Changed. A changed environment means cached assumptions may no longer hold.">
              <Pill tone={envTone} dot>
                {s.environmentStatus}
              </Pill>
            </Item>
            <Item
              label="Context integrity"
              tip="How coherent the agent's working context still is with the task history (0–100%). Low values favour context reconstruction or rollback over retry."
            >
              <div className="flex items-center gap-3">
                <ProgressBar value={s.contextIntegrity} tone={s.contextIntegrity < 50 ? "danger" : s.contextIntegrity < 80 ? "warning" : "navy"} label="Context integrity" />
                <span className="w-12 text-right font-mono text-sm tabular-nums text-navy">{Math.round(s.contextIntegrity)}%</span>
              </div>
            </Item>
            <Item
              label="Goal alignment"
              tip="How well recent actions still serve the original goal (0–1). Low values indicate goal drift and favour realignment or replanning."
            >
              <div className="flex items-center gap-3">
                <ProgressBar value={s.goalAlignment} max={1} tone={s.goalAlignment < 0.6 ? "danger" : s.goalAlignment < 0.85 ? "warning" : "accent"} label="Goal alignment" />
                <span className="w-12 text-right font-mono text-sm tabular-nums text-navy">{s.goalAlignment.toFixed(2)}</span>
              </div>
            </Item>
            <Item label="Current tool">
              <span className="font-mono text-sm text-navy">{s.currentTool ?? "none"}</span>
            </Item>
            <Item label="Active failure">
              {s.failureType ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-red-700">{s.activeDecision?.failureLabel ?? s.failureType}</span>
                  {s.failureSeverity && <Pill tone={severityTone(s.failureSeverity)}>{s.failureSeverity}</Pill>}
                </span>
              ) : (
                <span className="text-sm text-slate-400">None</span>
              )}
            </Item>
            <Item label="Retry count" tip="Number of retry attempts recorded in the current state.">
              <span className="font-mono text-sm tabular-nums text-navy">{s.retryCount}</span>
            </Item>
            <Item label="Last recovery outcome">
              {s.lastRecoveryOutcome ? (
                <Pill tone={s.lastRecoveryOutcome === "Success" ? "success" : s.lastRecoveryOutcome === "Failed" ? "warning" : "danger"}>
                  {s.lastRecoveryOutcome}
                </Pill>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              )}
            </Item>
            <Item label="Plan progress" className="sm:col-span-2">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-green-700">{s.completedActions.length}</span> completed ·{" "}
                <span className="font-semibold text-slate-700">{s.pendingActions.length}</span> pending
              </p>
            </Item>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Resource usage" icon={<Coins className="h-4 w-4" />} right={<SimTag />} />
            <div className="grid grid-cols-2 gap-4 p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Tokens</p>
                <p className="text-xl font-semibold tabular-nums text-navy">{formatTokens(s.resourceUsage.tokensUsed)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Est. cost</p>
                <p className="text-xl font-semibold tabular-nums text-navy">{formatUsd(s.resourceUsage.estimatedCostUsd)}</p>
              </div>
              <p className="col-span-2 text-xs text-slate-500">Values come from the simulation&apos;s cost model, not real LLM usage.</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Failure history" icon={<AlertOctagon className="h-4 w-4" />} right={<span className="text-xs text-slate-500">{s.failureHistory.length}</span>} />
            {s.failureHistory.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">No failures recorded.</p>
            ) : (
              <ul className="divide-y divide-line">
                {s.failureHistory.map((f, i) => (
                  <li key={`${f.occurredAtLog}-${i}`} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">{f.label}</p>
                      <p className="text-xs text-slate-500">
                        {f.category} · step {f.step}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Pill tone={severityTone(f.severity)}>{f.severity}</Pill>
                      <span className={cx("text-[11px] font-medium", f.resolved ? "text-green-700" : "text-red-700")}>{f.resolved ? "resolved" : "unresolved"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Recovery history" icon={<History className="h-4 w-4" />} right={<span className="text-xs text-slate-500">{s.recoveryHistory.length}</span>} />
            {s.recoveryHistory.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">No recovery attempts recorded.</p>
            ) : (
              <ul className="divide-y divide-line">
                {s.recoveryHistory.map((r, i) => (
                  <li key={`${r.occurredAtLog}-${i}`} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">{r.actionLabel}</p>
                      <p className="text-xs text-slate-500">
                        for {r.failureType.replace(/_/g, " ")} · step {r.step} · attempt {r.attemptNumber + 1}
                      </p>
                    </div>
                    <Pill tone={r.outcome === "Success" ? "success" : r.outcome === "Failed" ? "warning" : "danger"}>{r.outcome}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Item({ label, tip, children, className }: { label: string; tip?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <dt className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
        {tip && <InfoTip content={tip} />}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

// ---- Timeline -------------------------------------------------------------

function Timeline({ state }: { state: AgentState }) {
  const events = useMemo(() => buildTimeline(state), [state]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = events.find((e) => e.key === selectedKey) ?? events[events.length - 1];

  return (
    <Card>
      <CardHeader
        title="State-transition timeline"
        subtitle="S0 → Sn with failure and recovery events inserted at the step where they occurred. Select any point to see what changed."
        icon={<Workflow className="h-4 w-4" />}
      />
      <div className="thin-scroll overflow-x-auto px-5 pb-2 pt-5">
        <ol className="flex min-w-max items-center pb-3">
          {events.map((e, i) => {
            const isSel = e.key === selected.key;
            return (
              <li key={e.key} className="flex items-center">
                {i > 0 && <span className={cx("h-px w-5", e.kind === "state" ? "bg-slate-300" : "bg-slate-300")} />}
                <TimelineNode event={e} selected={isSel} onClick={() => setSelectedKey(e.key)} />
              </li>
            );
          })}
        </ol>
      </div>
      <div className="border-t border-line p-5">
        <AnimatePresence mode="wait">
          <motion.div key={selected.key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <EventDetail event={selected} state={state} />
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}

function TimelineNode({ event, selected, onClick }: { event: TimelineEvent; selected: boolean; onClick: () => void }) {
  let label: string;
  let cls: string;
  let title: string;
  if (event.kind === "state") {
    label = `S${event.step}`;
    title = event.step === 0 ? "Initial state" : `Step ${event.step}: ${event.label}`;
    cls =
      event.status === "current"
        ? "border-navy bg-navy text-white"
        : event.status === "initial"
          ? "border-slate-300 bg-white text-slate-600"
          : "border-navy-100 bg-navy-50 text-navy";
  } else if (event.kind === "failure") {
    label = "FAILURE";
    title = `${event.record.label} at step ${event.record.step}`;
    cls = "border-red-300 bg-red-50 text-red-700";
  } else {
    label = "RECOVERY";
    title = `${event.record.actionLabel} — ${event.record.outcome}`;
    cls =
      event.record.outcome === "Success"
        ? "border-green-300 bg-green-50 text-green-700"
        : event.record.outcome === "Failed"
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-red-400 bg-red-100 text-red-800";
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      className={cx(
        "rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-wide transition-shadow",
        cls,
        selected ? "ring-2 ring-accent ring-offset-2" : "hover:ring-1 hover:ring-slate-300",
        event.kind !== "state" && "text-[10px]",
      )}
    >
      {event.kind === "failure" && <AlertOctagon className="mr-1 inline h-3 w-3 -translate-y-px" />}
      {event.kind === "recovery" && <LifeBuoy className="mr-1 inline h-3 w-3 -translate-y-px" />}
      {event.kind === "state" && event.status === "completed" && <CheckCircle2 className="mr-1 inline h-3 w-3 -translate-y-px" />}
      {label}
    </button>
  );
}

function EventDetail({ event, state }: { event: TimelineEvent; state: AgentState }) {
  if (event.kind === "state") {
    if (event.step === 0) {
      return (
        <Detail title="S0 — Initial state" tone="neutral">
          Task initialised and the planner produced a {state.totalSteps}-step plan. No failures or recoveries yet.
        </Detail>
      );
    }
    if (event.status === "current") {
      return (
        <Detail title={`S${event.step} — Current state`} tone="navy">
          Executing step {event.step}: <strong>{event.label}</strong>. Task status: <strong>{state.taskStatus}</strong>.{" "}
          {state.failureType && "An unresolved failure is pending recovery at this step."}
        </Detail>
      );
    }
    return (
      <Detail title={`S${event.step} — Step completed`} tone="success">
        Step {event.step} (<strong>{event.label}</strong>) was completed and added to the agent&apos;s completed actions
        ({event.step} of {state.totalSteps} done after this point).
      </Detail>
    );
  }
  if (event.kind === "failure") {
    const f = event.record;
    return (
      <Detail title={`FAILURE — ${f.label} at step ${f.step}`} tone="danger">
        Classified as <strong>{f.category}</strong> with <strong>{f.severity}</strong> severity (log #{f.occurredAtLog}).
        The failure was appended to the failure history and execution paused. Current status of this failure:{" "}
        <strong>{f.resolved ? "resolved" : "unresolved"}</strong>.
      </Detail>
    );
  }
  const r = event.record;
  return (
    <Detail title={`RECOVERY — ${r.actionLabel} (${r.outcome})`} tone={r.outcome === "Success" ? "success" : r.outcome === "Failed" ? "warning" : "danger"}>
      Recovery action <strong>{r.actionLabel}</strong> executed for <strong>{r.failureType.replace(/_/g, " ")}</strong> at step{" "}
      {r.step}, attempt {r.attemptNumber + 1} (log #{r.occurredAtLog}). Outcome: <strong>{r.outcome}</strong>.{" "}
      {r.outcome === "Success" && "Execution resumed after verification."}
      {r.outcome === "Failed" && "The attempt was recorded in the recovery history and the policy re-evaluated."}
      {r.outcome === "Escalated" && "Autonomous recovery stopped; the task was handed to a human operator."}
    </Detail>
  );
}

function Detail({ title, tone, children }: { title: string; tone: Tone; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Pill tone={tone} dot className="mt-0.5">
        {tone === "danger" ? "failure" : tone === "success" ? "ok" : tone === "warning" ? "attempt" : "state"}
      </Pill>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
      </div>
    </div>
  );
}
