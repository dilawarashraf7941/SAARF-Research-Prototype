"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Clock,
  CloudLightning,
  Database,
  Loader2,
  Lock,
  Map as MapIcon,
  RotateCcw,
  Siren,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useLiveSession, useRecoveryExecution } from "@/lib/hooks";
import { toast, useSession } from "@/lib/store";
import { severityTone } from "@/lib/presentation";
import type { AgentState, FailureType } from "@/lib/types";
import RecoveryDecisionPanel from "@/components/RecoveryDecisionPanel";
import { Banner, Button, Card, InfoTip, PageHeader, Pill, cx } from "@/components/ui";

const FAILURE_ICON: Record<string, LucideIcon> = {
  api_timeout: Clock,
  invalid_tool_output: AlertTriangle,
  planning_failure: MapIcon,
  environment_change: CloudLightning,
  context_degradation: Brain,
  memory_inconsistency: Database,
  goal_drift: Target,
  repeated_failure: RotateCcw,
};

export default function InjectFailurePage() {
  useLiveSession("session");
  const state = useSession((s) => s.state);
  const applySnapshot = useSession((s) => s.applySnapshot);
  const { execute, executing } = useRecoveryExecution();

  const [types, setTypes] = useState<FailureType[] | null>(null);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [injecting, setInjecting] = useState<string | null>(null);
  const [typesAttempt, setTypesAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .getFailureTypes()
      .then((t) => {
        if (!cancelled) {
          setTypes(t);
          setTypesError(null);
        }
      })
      .catch((err) => !cancelled && setTypesError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [typesAttempt]);

  const inject = async (ft: FailureType) => {
    setInjecting(ft.id);
    try {
      const snap = await api.injectFailure(ft.id);
      applySnapshot(snap);
      toast.warning(`${ft.label} injected`, "Failure classified and a recovery decision computed. Execution is paused.");
      requestAnimationFrame(() => document.getElementById("failure-detected")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      toast.error("Injection rejected", errorMessage(err));
    } finally {
      setInjecting(null);
    }
  };

  const executingTask = state?.taskStatus === "Executing";
  const decision = state?.activeDecision ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Controlled experiment"
        title="Controlled Failure Injection"
        description="Introduce controlled faults to evaluate state-aware recovery behaviour. The backend classifies each failure, assesses live agent state and computes a recovery decision immediately."
        right={<Pill tone="warning">8 deterministic failure types</Pill>}
      />

      <DisabledNotice state={state} />

      {typesError && (
        <Banner
          tone="danger"
          title="Could not load failure types"
          className="mb-4"
          action={<Button size="sm" onClick={() => setTypesAttempt((a) => a + 1)}>Retry</Button>}
        >
          {typesError}
        </Banner>
      )}

      <div
        className={cx("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", !executingTask && "pointer-events-none select-none opacity-55")}
        aria-disabled={!executingTask}
      >
        {(types ?? Array.from({ length: 8 }, () => null)).map((ft, i) =>
          ft ? (
            <FailureCard
              key={ft.id}
              ft={ft}
              disabled={!executingTask || injecting !== null}
              loading={injecting === ft.id}
              active={state?.failureType === ft.id && !!decision}
              onSelect={() => inject(ft)}
            />
          ) : (
            <div key={i} className="h-[196px] animate-pulse rounded-2xl border border-line bg-white" />
          ),
        )}
      </div>

      <AnimatePresence>
        {state && decision && (
          <motion.div
            id="failure-detected"
            key={`${decision.failureType}-${decision.attemptNumber}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8 scroll-mt-28 space-y-5"
          >
            <FailureDetectedPanel state={state} />
            <RecoveryDecisionPanel
              decision={decision}
              history={state.recoveryHistory}
              reevaluated={state.lastRecoveryOutcome === "Failed"}
              onExecute={(forceFail) => void execute(undefined, forceFail ? "Failed" : undefined)}
              executing={executing}
            />
            <p className="text-center text-xs text-slate-500">
              Want to explore alternatives? The{" "}
              <Link href="/recovery-policy" className="font-medium text-accent hover:underline">
                Recovery Policy
              </Link>{" "}
              page shows all nine actions with their compatibility and allows a manual override.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {state && !decision && state.recoveryHistory.length > 0 && (
        <LastRecovery state={state} />
      )}
    </div>
  );
}

function FailureCard({
  ft,
  disabled,
  loading,
  active,
  onSelect,
}: {
  ft: FailureType;
  disabled: boolean;
  loading: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = FAILURE_ICON[ft.id] ?? Zap;
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      transition={{ duration: 0.15 }}
      className={cx(
        "lab-shadow group relative flex h-full min-h-[205px] flex-col overflow-hidden rounded-xl border bg-white p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active ? "border-red-400 ring-2 ring-red-100" : "border-line hover:-translate-y-0.5 hover:border-navy-100 hover:shadow-lg",
        disabled && "cursor-not-allowed",
      )}
      title={`Inject "${ft.label}" at the current step`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", active ? "bg-red-600 text-white" : "bg-navy-50 text-navy")}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </span>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[8px] font-bold uppercase tracking-[0.13em] text-amber-700">Controlled experiment</span>
          <Pill tone={severityTone(ft.defaultSeverity)} title="Default severity assigned by the classifier">
            {ft.defaultSeverity}
          </Pill>
        </div>
      </div>
      <p className="text-[15px] font-semibold text-navy">{ft.label}</p>
      <p className="text-xs font-medium text-slate-500">{ft.category}</p>
      <p className="mt-2 flex-1 text-[13px] leading-snug text-slate-600">{ft.description}</p>
      <div className="mt-3 border-t border-line pt-2.5 text-[11px] text-slate-500">
        <p>Expected direction: <span className="font-semibold text-accent">{ft.directionLabel}</span></p>
        <p className="mt-2 flex items-center justify-between font-bold uppercase tracking-[0.1em] text-navy">
          Inject failure <span className="text-accent">→</span>
        </p>
      </div>
    </motion.button>
  );
}

function DisabledNotice({ state }: { state: AgentState | null }) {
  if (!state || state.taskStatus === "Executing") {
    return (
      <p className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <Zap className="h-4 w-4 text-accent" />
        Select a failure type to inject it at step {state?.currentStep ?? "—"}
        {state ? ` (${state.stepLabel})` : ""}.
        <InfoTip content="Injection is only possible while the task is Executing. Each injection pauses the task until a recovery action is executed." />
      </p>
    );
  }
  const messages: Record<string, { title: string; body: string }> = {
    "Paused - Failure Detected": {
      title: "Task already paused on a failure",
      body: "Resolve the active failure below (or on the Recovery Policy page) before injecting another one.",
    },
    Completed: { title: "Task completed", body: "Reset the task (New Task in the header) to try failure injection again." },
    Escalated: { title: "Task escalated to a human operator", body: "Reset the task (New Task in the header) to try failure injection again." },
  };
  const m = messages[state.taskStatus] ?? {
    title: `Task is ${state.taskStatus}`,
    body: "Failures can only be injected while the task is Executing.",
  };
  return (
    <Banner tone="warning" title={m.title} className="mb-4">
      <span className="inline-flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5" /> {m.body}
      </span>
    </Banner>
  );
}

function FailureDetectedPanel({ state }: { state: AgentState }) {
  const d = state.activeDecision!;
  return (
    <Card className="overflow-hidden border-red-200">
      <div className="flex flex-wrap items-center gap-3 bg-red-600 px-5 py-3 text-white">
        <Siren className="h-5 w-5" />
        <p className="text-sm font-bold uppercase tracking-[0.16em]">Failure Detected</p>
        <span className="ml-auto text-xs text-white/80">Execution paused · awaiting recovery</span>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Failure type">
          <p className="font-semibold text-red-700">{d.failureLabel}</p>
          <p className="text-xs text-slate-500">{d.category}</p>
        </Field>
        <Field label="Severity">
          <Pill tone={severityTone(d.severity)} dot className="text-[13px]">
            {d.severity}
          </Pill>
        </Field>
        <Field label="Current step">
          <p className="font-semibold tabular-nums text-navy">
            {state.currentStep} / {state.totalSteps}
          </p>
          <p className="truncate text-xs text-slate-500">{state.stepLabel}</p>
        </Field>
        <Field label="Previous recovery attempts" tip="Recovery attempts already made for this failure type (from the decision's attemptNumber). The policy takes these into account.">
          <p className="text-2xl font-semibold tabular-nums text-navy">{d.attemptNumber}</p>
        </Field>
      </div>
    </Card>
  );
}

function LastRecovery({ state }: { state: AgentState }) {
  const last = state.recoveryHistory[state.recoveryHistory.length - 1];
  const tone = last.outcome === "Success" ? "success" : last.outcome === "Escalated" ? "danger" : "warning";
  return (
    <Banner
      tone={tone}
      className="mt-8"
      title={`Last recovery: ${last.actionLabel} — ${last.outcome}`}
    >
      Applied to a {last.failureType.replace(/_/g, " ")} at step {last.step} (attempt {last.attemptNumber + 1}).
      {state.taskStatus === "Executing" && " Execution has resumed; you can inject another failure."}
    </Banner>
  );
}

function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
        {tip && <InfoTip content={tip} />}
      </p>
      {children}
    </div>
  );
}
