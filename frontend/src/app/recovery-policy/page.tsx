"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, ArrowDown, ArrowRight, Ban, CheckCircle2, Circle, Compass, Cpu, FlaskRound, Hand, MinusCircle, Radar, ShieldCheck, ShieldQuestion, X, Zap } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useLiveSession, useRecoveryExecution } from "@/lib/hooks";
import { useSession } from "@/lib/store";
import type { AgentState, Compatibility, RecoveryAction } from "@/lib/types";
import RecoveryDecisionPanel from "@/components/RecoveryDecisionPanel";
import { Banner, Button, Card, CardHeader, EmptyState, InfoTip, PageHeader, cx } from "@/components/ui";

const COMPAT: Record<Compatibility, { label: string; card: string; ribbon: string; icon: typeof Circle; name: string }> = {
  selected: {
    label: "Selected by policy",
    card: "border-2 border-green-600 bg-green-50/40",
    ribbon: "bg-green-600 text-white",
    icon: CheckCircle2,
    name: "text-navy",
  },
  rejected: {
    label: "Rejected by state",
    card: "border-2 border-red-300 bg-red-50/30",
    ribbon: "bg-red-600 text-white",
    icon: Ban,
    name: "text-slate-400 line-through decoration-red-500 decoration-2",
  },
  possible: {
    label: "Possible",
    card: "border border-navy-100 bg-white",
    ribbon: "bg-navy-50 text-navy",
    icon: Circle,
    name: "text-navy",
  },
  not_applicable: {
    label: "Not applicable",
    card: "border border-line bg-white opacity-50",
    ribbon: "bg-slate-100 text-slate-500",
    icon: MinusCircle,
    name: "text-slate-500",
  },
  idle: {
    label: "No active failure",
    card: "border border-line bg-white",
    ribbon: "bg-slate-100 text-slate-500",
    icon: Circle,
    name: "text-navy",
  },
};

export default function RecoveryPolicyPage() {
  useLiveSession("session");
  const state = useSession((s) => s.state);
  const { execute, executing } = useRecoveryExecution();
  const [actions, setActions] = useState<RecoveryAction[] | null>(null);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [override, setOverride] = useState<RecoveryAction | null>(null);

  const decision = state?.activeDecision ?? null;
  // Refetch compatibility whenever the decision or task status changes.
  const refreshKey = `${decision?.failureType ?? "none"}|${decision?.attemptNumber ?? -1}|${decision?.selectedAction ?? ""}|${state?.taskStatus ?? ""}|${state?.recoveryHistory.length ?? 0}`;
  useEffect(() => {
    let cancelled = false;
    api
      .getRecoveryActions()
      .then((a) => {
        if (!cancelled) {
          setActions(a);
          setActionsError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setActionsError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const rejectedReason = (id: string) => decision?.rejectedActions.find((r) => r.action === id)?.reason;

  return (
    <div>
      <PageHeader
        eyebrow="Thesis contribution"
        title="Recovery Policy"
        description="The adaptive recovery policy selects an action from the failure category, severity, the agent's current state and its recovery history — and records which actions the state ruled out, and why."
      />

      <OutcomeNotice state={state} />

      {/* (a) Decision panel */}
      {decision && state ? (
        <div className="space-y-4">
          <PolicyPipeline state={state} />
          <RecoveryDecisionPanel
            decision={decision}
            history={state.recoveryHistory}
            reevaluated={state.lastRecoveryOutcome === "Failed"}
            onExecute={(forceFail) => void execute(undefined, forceFail ? "Failed" : undefined)}
            executing={executing}
          />
        </div>
      ) : (
        <Card>
          <CardHeader title="State-Aware Recovery Decision" icon={<Cpu className="h-4 w-4" />} />
          <EmptyState
            icon={<ShieldQuestion className="h-5 w-5" />}
            title="No active recovery decision"
            action={
              <Link
                href="/inject-failure"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-navy px-4 text-sm font-medium text-white hover:bg-navy-2"
              >
                <Zap className="h-4 w-4" /> Go to Inject Failure
              </Link>
            }
          >
            The policy is idle because there is no unresolved failure. Inject a failure while the task is executing to see
            how the policy analyses state, rejects unsuitable actions and selects a recovery action.
          </EmptyState>
        </Card>
      )}

      {/* (b) Action grid */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-navy">Recovery Policy Action Grid</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-600">
              The nine canonical recovery actions, annotated by the backend with their compatibility for the current
              decision.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {(["selected", "rejected", "possible", "not_applicable"] as Compatibility[]).map((c) => (
              <span key={c} className={cx("rounded-full px-2 py-0.5 font-medium", COMPAT[c].ribbon)}>
                {COMPAT[c].label}
              </span>
            ))}
          </div>
        </div>

        {decision && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-dashed border-accent/40 bg-accent-50/40 px-4 py-3 text-[13px] text-slate-700">
            <Hand className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              <strong className="text-accent">Manual override (exploration feature).</strong> Click a{" "}
              <em>possible</em> or <em>selected</em> action to force it instead of the policy&apos;s choice and observe the
              consequence. This is distinct from the policy&apos;s own decision above.
            </p>
          </div>
        )}

        {actionsError && (
          <Banner tone="danger" title="Could not load recovery actions" className="mb-4">
            {actionsError}
          </Banner>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(actions ?? Array.from({ length: 9 }, () => null)).map((a, i) =>
            a ? (
              <ActionCard
                key={a.id}
                action={a}
                reason={rejectedReason(a.id)}
                clickable={!!decision && (a.compatibility === "possible" || a.compatibility === "selected")}
                onClick={() => setOverride(a)}
              />
            ) : (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-line bg-white" />
            ),
          )}
        </div>
      </section>

      <AnimatePresence>
        {override && decision && (
          <OverrideDialog
            action={override}
            policyChoice={decision.selectedActionLabel}
            executing={executing}
            onCancel={() => setOverride(null)}
            onConfirm={async () => {
              await execute(override.id);
              setOverride(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PolicyPipeline({ state }: { state: AgentState }) {
  const decision = state.activeDecision!;
  const nodes = [
    { label: "Failure", value: decision.failureLabel, icon: AlertOctagon, style: "border-red-200 bg-red-50 text-red-700" },
    { label: "Classification", value: decision.category, icon: Radar, style: "border-sky-200 bg-sky-50 text-sky-800" },
    { label: "State assessment", value: decision.stateAnalysis[0] ?? `${state.planStatus} plan`, icon: ShieldQuestion, style: "border-line bg-white text-navy" },
    { label: "Adaptive policy", value: "State + history evaluated", icon: Cpu, style: "border-accent/40 bg-accent-50 text-accent" },
    { label: "Recovery action", value: decision.selectedActionLabel, icon: Compass, style: "border-accent/40 bg-white text-accent" },
    { label: "Verification", value: "Pending action execution", icon: ShieldCheck, style: "border-green-200 bg-green-50 text-green-700" },
  ];
  return (
    <section className="lab-shadow overflow-hidden rounded-xl border border-line bg-white" aria-label="Recovery policy decision pipeline">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent">Decision trace</p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-navy">Failure signal → deliberate recovery action</h2>
        </div>
        <p className="text-[10px] text-slate-500">No confidence score · explicit policy reasoning</p>
      </div>
      <div className="grid p-3 md:grid-cols-[repeat(6,minmax(0,1fr))]">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <div key={node.label} className="relative flex min-w-0 items-stretch md:block">
              {index > 0 && (
                <span className="flex w-7 shrink-0 items-center justify-center md:absolute md:-left-3.5 md:top-8 md:z-10">
                  <ArrowDown className="h-3.5 w-3.5 text-slate-300 md:hidden" />
                  <ArrowRight className="hidden h-3.5 w-3.5 text-slate-300 md:block" />
                </span>
              )}
              <div className={cx("min-h-[82px] flex-1 rounded-md border px-3 py-3 md:mx-1.5", node.style)}>
                <Icon className="mb-2 h-4 w-4" />
                <p className="text-[9px] font-bold uppercase tracking-[0.11em] opacity-65">{node.label}</p>
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug">{node.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionCard({
  action,
  reason,
  clickable,
  onClick,
}: {
  action: RecoveryAction;
  reason?: string;
  clickable: boolean;
  onClick: () => void;
}) {
  const c = COMPAT[action.compatibility];
  const Icon = c.icon;
  return (
    <motion.div
      layout
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      whileHover={clickable ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
      className={cx(
        "relative flex h-full flex-col overflow-hidden rounded-2xl p-4 pt-9 text-left",
        c.card,
        clickable && "cursor-pointer hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      )}
      title={clickable ? `Manual override: execute ${action.name}` : reason ? `Rejected: ${reason}` : undefined}
    >
      <span className={cx("absolute left-0 right-0 top-0 flex items-center gap-1.5 px-4 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]", c.ribbon)}>
        <Icon className="h-3 w-3" />
        {c.label}
      </span>
      <p className={cx("text-[15px] font-semibold", c.name)}>{action.name}</p>
      <p className="mt-1 text-[13px] leading-snug text-slate-600">{action.description}</p>
      {reason && (
        <p className="mt-2 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs leading-snug text-red-800">
          <strong>Rejected because:</strong> {reason}
        </p>
      )}
      <div className="mt-3 space-y-1.5 border-t border-line pt-2.5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Applies to</span>
          {action.applicableCategories.length === 0 ? (
            <span className="text-xs text-slate-400">any category</span>
          ) : (
            action.applicableCategories.map((cat) => (
              <span key={cat} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                {cat}
              </span>
            ))
          )}
        </div>
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Expected effect:</span> {action.expectedEffect}
        </p>
      </div>
      {clickable && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
          <Compass className="h-3.5 w-3.5" />
          {action.compatibility === "selected" ? "Execute (policy's choice)" : "Manual override…"}
        </span>
      )}
    </motion.div>
  );
}

function OverrideDialog({
  action,
  policyChoice,
  executing,
  onCancel,
  onConfirm,
}: {
  action: RecoveryAction;
  policyChoice: string;
  executing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isPolicyChoice = action.compatibility === "selected";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/40 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Manual override"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {isPolicyChoice ? "Execute policy choice" : "Manual override · exploration"}
            </p>
            <h3 className="text-lg font-semibold text-navy">Execute {action.name}?</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancel" className="rounded p-1 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        {isPolicyChoice ? (
          <p className="text-sm leading-relaxed text-slate-600">This is the action the adaptive policy selected.</p>
        ) : (
          <div className="space-y-2 text-sm leading-relaxed text-slate-600">
            <p>
              The policy selected <strong className="text-navy">{policyChoice}</strong>. You are forcing{" "}
              <strong className="text-navy">{action.name}</strong> instead to explore what happens.
            </p>
            <p className="flex items-start gap-2 rounded-lg bg-canvas px-3 py-2 text-xs text-slate-500">
              <FlaskRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Overrides are recorded in the recovery history like any other attempt and may influence later decisions.
            </p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={isPolicyChoice ? "primary" : "accent"} loading={executing} onClick={onConfirm}>
            Execute {action.name}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OutcomeNotice({ state }: { state: AgentState | null }) {
  if (!state || state.recoveryHistory.length === 0 || !state.lastRecoveryOutcome) return null;
  const last = state.recoveryHistory[state.recoveryHistory.length - 1];
  if (state.lastRecoveryOutcome === "Failed" && state.activeDecision) {
    return (
      <Banner tone="warning" className="mb-5" title={`${last.actionLabel} failed — the policy re-evaluated`}>
        The failed attempt was added to the recovery history. With that history, the policy now selects{" "}
        <strong>{state.activeDecision.selectedActionLabel}</strong> (next rung on the escalation ladder).
      </Banner>
    );
  }
  if (state.taskStatus === "Escalated") {
    return (
      <Banner tone="danger" className="mb-5" title="Escalated to a human operator">
        Autonomous recovery was exhausted. Use <strong>New Task</strong> in the header to reset the demonstration.
      </Banner>
    );
  }
  if (!state.activeDecision && state.lastRecoveryOutcome === "Success") {
    return (
      <Banner tone="success" className="mb-5" title={`Last recovery: ${last.actionLabel} succeeded`}>
        Verification passed at step {last.step}; the task has returned to <strong>{state.taskStatus}</strong>.{" "}
        <InfoTip content="Recorded in the agent's recovery history — see Agent State for the full timeline." />
      </Banner>
    );
  }
  return null;
}
