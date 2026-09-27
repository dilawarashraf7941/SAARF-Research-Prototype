"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertOctagon, ArrowRight, CheckCircle2, Circle, Clock, Cpu, Map as MapIcon, Pause, Play, PlayCircle, RotateCcw, ScrollText, SkipForward, Wrench } from "lucide-react";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useLiveSession } from "@/lib/hooks";
import { toast, useSession } from "@/lib/store";
import { liveHighlight, statusTone, type WorkflowNodeId } from "@/lib/presentation";
import type { AgentState, Frame, ScenarioId } from "@/lib/types";
import ScenarioPlayer from "@/components/ScenarioPlayer";
import WorkflowDiagram from "@/components/WorkflowDiagram";
import LogLine from "@/components/LogLine";
import { AdaptiveRecoveryLoop, LiveAgentState } from "@/components/ResearchControlVisuals";
import { Banner, Button, Card, CardHeader, InfoTip, PageHeader, Pill, SimTag, cx } from "@/components/ui";

// Display-only fallback; the live list is derived from completedActions / stepLabel / pendingActions.
const DEMO_STEPS = [
  "Understand task",
  "Decompose goal",
  "Create research plan",
  "Identify information requirements",
  "Search source 1",
  "Search source 2",
  "Collect evidence",
  "Validate evidence",
  "Analyse information",
  "Detect missing information",
  "Search additional source",
  "Synthesise findings",
  "Verify consistency",
  "Generate report",
  "Final verification",
];

const AUTO_RUN_INTERVAL_MS = 1200;

const SCENARIOS: { id: ScenarioId; title: string; label: string; icon: typeof Clock; description: string }[] = [
  {
    id: "api_timeout",
    title: "Scenario 1 · Transient Failure",
    label: "API Timeout",
    icon: Clock,
    description: "A temporary tool failure under a stable state: the policy selects a controlled retry, which succeeds.",
  },
  {
    id: "planning_failure",
    title: "Scenario 2 · Planning Failure",
    label: "Planning Failure",
    icon: MapIcon,
    description: "The plan itself is invalid, so retry is considered and rejected by the state; replanning is selected.",
  },
  {
    id: "repeated_failure",
    title: "Scenario 3 · Repeated Failure",
    label: "Repeated Failure",
    icon: RotateCcw,
    description: "A failure that keeps recurring: the policy climbs the escalation ladder — Retry, then Alternative Tool, then Strategy Switch — before escalating to a human operator.",
  },
];

type StepStatus = "done" | "current" | "pending";

function deriveSteps(state: AgentState | null): { label: string; status: StepStatus }[] {
  if (!state) return DEMO_STEPS.map((label) => ({ label, status: "pending" }));
  const completed = state.completedActions.map((label) => ({ label, status: "done" as StepStatus }));
  if (state.taskStatus === "Completed") return completed;
  const pending = state.pendingActions.filter((label) => label !== state.stepLabel);
  const derived = [
    ...completed,
    { label: state.stepLabel, status: "current" as StepStatus },
    ...pending.map((label) => ({ label, status: "pending" as StepStatus })),
  ];
  return derived.length > 0 ? derived : DEMO_STEPS.map((label) => ({ label, status: "pending" }));
}

export default function RunAgentPage() {
  useLiveSession("session");
  const state = useSession((s) => s.state);
  const logs = useSession((s) => s.logs);
  const applySnapshot = useSession((s) => s.applySnapshot);
  const hydrate = useSession((s) => s.hydrate);

  const [autoRun, setAutoRun] = useState(false);
  const [stepping, setStepping] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  // Scenario replay (isolated backend session; local state only)
  const [scenario, setScenario] = useState<{ id: ScenarioId; title: string; frames: Frame[] } | null>(null);
  const [loadingScenario, setLoadingScenario] = useState<ScenarioId | null>(null);
  const planScrollRef = useRef<HTMLOListElement | null>(null);
  const previousStepRef = useRef<number | null>(null);
  const decisionFocusRef = useRef<HTMLDivElement | null>(null);
  const previousDecisionRef = useRef<string | null>(null);

  const handleStepError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setConflict(err.message);
        void hydrate();
      } else {
        toast.error("Step failed", errorMessage(err));
      }
    },
    [hydrate],
  );

  const advance = async () => {
    setStepping(true);
    try {
      const snap = await api.executeStep();
      applySnapshot(snap);
      setConflict(null);
      if (snap.state.taskStatus === "Completed") toast.success("Demonstration task completed", "All 15 plan steps finished.");
    } catch (err) {
      handleStepError(err);
    } finally {
      setStepping(false);
    }
  };

  // Auto-run loop: one step every ~1.2s; stops on non-2xx or when status leaves "Executing".
  useEffect(() => {
    if (!autoRun) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const snap = await api.executeStep();
        if (cancelled) return;
        applySnapshot(snap);
        if (snap.state.taskStatus !== "Executing") {
          setAutoRun(false);
          if (snap.state.taskStatus === "Completed") toast.success("Demonstration task completed", "Auto-run stopped.");
          return;
        }
        timer = setTimeout(tick, AUTO_RUN_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        setAutoRun(false);
        handleStepError(err);
      }
    };
    timer = setTimeout(tick, 250);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [autoRun, applySnapshot, handleStepError]);

  const reset = async () => {
    setAutoRun(false);
    setResetting(true);
    try {
      const snap = await api.resetSession();
      applySnapshot(snap);
      setConflict(null);
      toast.success("Task reset", "The demonstration task is back at step 1.");
    } catch (err) {
      toast.error("Reset failed", errorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  const runScenario = async (id: ScenarioId, title: string) => {
    setAutoRun(false);
    setLoadingScenario(id);
    try {
      const res = await api.runScenario(id);
      setScenario({ id, title, frames: res.frames });
    } catch (err) {
      toast.error("Could not run the scenario", errorMessage(err));
    } finally {
      setLoadingScenario(null);
    }
  };

  const steps = useMemo(() => deriveSteps(state), [state]);
  const failureSteps = useMemo(() => new Set(state?.failureHistory.map((f) => f.step) ?? []), [state]);
  const hl = liveHighlight(state);
  const completedWorkflowNodes = useMemo<WorkflowNodeId[]>(() => {
    if (!state) return [];
    const complete = new Set<WorkflowNodeId>();
    if (state.completedActions.length > 0 || state.taskStatus === "Completed") {
      ["user_task", "task_planning", "agent_execution", "observation", "verify", "state_update"].forEach((id) => complete.add(id as WorkflowNodeId));
    }
    if (state.activeDecision) {
      ["failure_detection", "failure_classification", "state_assessment"].forEach((id) => complete.add(id as WorkflowNodeId));
    }
    if (state.recoveryHistory.length > 0 && !state.activeDecision) {
      ["failure_detection", "failure_classification", "state_assessment", "adaptive_recovery_policy", "recovery_action", "verification"].forEach((id) => complete.add(id as WorkflowNodeId));
    }
    hl.nodes.forEach((id) => complete.delete(id));
    return [...complete];
  }, [state, hl.nodes]);
  const executing = state?.taskStatus === "Executing";
  const running = autoRun && executing;

  useEffect(() => {
    const currentStep = state?.currentStep;
    if (currentStep == null || previousStepRef.current === currentStep) return;
    let timer: number | undefined;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        const container = planScrollRef.current;
        const target = container?.querySelector<HTMLElement>('[aria-current="step"]');
        if (!container || !target) return;
        // Commit the observed step only once the rendered row is available.
        // This keeps the effect reliable under React Strict Mode's mount replay.
        previousStepRef.current = currentStep;
        const top = target.offsetTop - (container.clientHeight - target.offsetHeight) / 2;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        container.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
      }, 80);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [state?.currentStep]);

  useEffect(() => {
    const decision = state?.activeDecision;
    const key = decision ? `${decision.failureType}:${decision.attemptNumber}:${decision.selectedAction}` : null;
    if (!key || previousDecisionRef.current === key) {
      previousDecisionRef.current = key;
      return;
    }
    const frame = requestAnimationFrame(() => {
      // As above, record focus only when the DOM side effect actually runs.
      previousDecisionRef.current = key;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      decisionFocusRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [state?.activeDecision]);

  return (
    <div>
      <PageHeader
        eyebrow="Execution"
        title="Run Agent"
        description="Step the live demonstration task through its 15-step plan, or let it auto-run. Inject a failure at any point to hand control to the adaptive recovery policy."
      />

      <LiveAgentState state={state} />
      {state?.activeDecision && (
        <div ref={decisionFocusRef} className="scroll-mt-24">
          <CurrentDecision state={state} />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader
              title="Execution Console"
              subtitle="Advance the deterministic agent and monitor its current action."
              icon={<PlayCircle className="h-4 w-4" />}
              right={state && <Pill tone={statusTone(state.taskStatus)} dot>{state.taskStatus}</Pill>}
            />
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={advance}
                  loading={stepping}
                  disabled={!executing || autoRun}
                  icon={<SkipForward className="h-4 w-4" />}
                  title="POST /api/execute/step — advance exactly one plan step"
                >
                  Advance One Step
                </Button>
                <Button
                  variant={autoRun ? "accent" : "secondary"}
                  onClick={() => {
                    setConflict(null);
                    setAutoRun((a) => !a);
                  }}
                  disabled={!executing && !autoRun}
                  aria-pressed={autoRun}
                  icon={autoRun ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  title="Advance one step every 1.2 s until the task pauses, escalates or completes"
                >
                  {autoRun ? "Stop Auto-Run" : "Auto-Run"}
                </Button>
                <Button onClick={reset} loading={resetting} icon={<RotateCcw className="h-4 w-4" />} title="POST /api/session/reset">
                  Reset Task
                </Button>
              </div>
              {running && (
                <p className="flex items-center gap-2 text-xs text-accent">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  Auto-running: one step every {AUTO_RUN_INTERVAL_MS / 1000}s
                </p>
              )}
              <StatusBanner state={state} conflict={conflict} onReset={reset} />
              {state && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-slate-500">
                  <span>
                    Current tool: <span className="font-mono text-navy">{state.currentTool ?? "none"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    Tokens: <span className="font-mono tabular-nums text-navy">{state.resourceUsage.tokensUsed.toLocaleString("en-GB")}</span>
                    <SimTag />
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="order-3 overflow-hidden">
            <CardHeader
              title="Live execution stream"
              icon={<ScrollText className="h-4 w-4" />}
              right={<span className="font-mono text-[10px] text-slate-400">{logs.length} events</span>}
            />
            <div className="space-y-px bg-slate-950 p-2">
              {logs.length === 0 ? (
                <p className="px-3 py-8 text-center font-mono text-xs text-slate-500">Awaiting execution events…</p>
              ) : (
                logs.slice(-9).map((entry) => <LogLine key={entry.index} entry={entry} dense dark />)
              )}
            </div>
          </Card>

          <Card className="order-2 overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div>
                  <p className="text-[13px] font-semibold text-navy">Execution plan · {steps.length} steps</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Current backend step stays centred in this bounded view.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone="accent">Demonstration Task</Pill>
                </div>
              </div>
            <ol ref={planScrollRef} className="thin-scroll relative max-h-[286px] scroll-py-24 overflow-y-auto bg-canvas/45 p-3" aria-label="Live execution plan">
              {steps.map((s, i) => {
                const n = i + 1;
                const hadFailure = failureSteps.has(n);
                return (
                  <motion.li
                    key={`${n}-${s.label}`}
                    aria-current={s.status === "current" ? "step" : undefined}
                    layout="position"
                    initial={false}
                    animate={s.status === "current" ? { scale: [1, 1.006, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={cx(
                      "mb-1 flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors duration-300 last:mb-0",
                      s.status === "done" && "border-transparent bg-white/55 text-slate-500",
                      s.status === "current" && "border-accent/45 bg-accent-50 shadow-[0_4px_16px_rgba(102,87,217,0.10)]",
                      s.status === "pending" && "border-transparent bg-transparent",
                    )}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {s.status === "done" ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                      ) : s.status === "current" ? (
                        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                          {running && <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-30" />}
                          <ArrowRight className="relative h-3 w-3" />
                        </span>
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300" />
                      )}
                    </span>
                    <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-slate-400">{String(n).padStart(2, "0")}</span>
                    <span
                      className={cx(
                        "min-w-0 flex-1 truncate",
                        s.status === "done" && "text-slate-500",
                        s.status === "current" && "font-bold text-navy",
                        s.status === "pending" && "text-slate-400",
                      )}
                    >
                      {s.label}
                    </span>
                    {s.status === "current" && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                        Current
                      </span>
                    )}
                    {hadFailure && (
                      <Pill tone="danger" title="A failure was recorded at this step (see Agent State for details)">
                        failure
                      </Pill>
                    )}
                    {s.status === "current" && state?.currentTool && (
                      <span className="hidden items-center gap-1 font-mono text-[11px] text-accent sm:inline-flex">
                        <Wrench className="h-3 w-3" />
                        {state.currentTool}
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ol>
            <div className="flex items-center justify-between border-t border-line bg-white px-4 py-2 text-[10px] text-slate-500">
              <span>Auto-focuses only when the backend step changes</span>
              <span className="font-mono tabular-nums text-navy">S{state?.currentStep ?? "–"}</span>
            </div>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <AdaptiveRecoveryLoop state={state} compact />
          </Card>
          <Card>
            <CardHeader title="Full execution / recovery topology" subtitle="Live node position in the complete control loop." />
            <div className="diagram-grid m-3 rounded-lg p-2">
              <WorkflowDiagram active={hl.nodes} completed={completedWorkflowNodes} pulse={hl.pulse} escalated={state?.taskStatus === "Escalated"} showLegend={false} />
            </div>
          </Card>
        </div>
      </div>

      {/* Scripted scenario demos */}
      <Card className="mt-6">
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              Scripted scenario demos
              <InfoTip content="Each demo runs on an isolated backend session and is replayed here frame by frame. It does not modify the live task above." />
            </span>
          }
          subtitle="Replay one of the three canonical scenarios in a guided, self-contained viewer."
          right={<SimTag label="Demo Simulation" />}
        />
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {SCENARIOS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex flex-col rounded-xl border border-line p-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{s.title}</p>
                    <p className="text-sm font-semibold text-navy">{s.label}</p>
                  </div>
                </div>
                <p className="flex-1 text-[13px] leading-relaxed text-slate-600">{s.description}</p>
                <Button
                  className="mt-4"
                  onClick={() => runScenario(s.id, s.title)}
                  loading={loadingScenario === s.id}
                  disabled={loadingScenario !== null && loadingScenario !== s.id}
                  icon={<Play className="h-4 w-4" />}
                >
                  Run Demo
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <ScenarioPlayer
        open={scenario !== null}
        title={scenario?.title ?? ""}
        kicker="Scenario Demo"
        frames={scenario?.frames ?? null}
        onClose={() => setScenario(null)}
      />
    </div>
  );
}

function CurrentDecision({ state }: { state: AgentState }) {
  const decision = state.activeDecision;
  if (!decision) return null;
  const rejected = decision.rejectedActions[0];
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="lab-shadow mt-4 overflow-hidden rounded-xl border border-accent/35 bg-white"
      aria-label="Current recovery decision"
    >
      <div className="flex items-center gap-2 border-b border-accent/20 bg-accent-50 px-5 py-2.5 text-accent">
        <Cpu className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-[0.17em]">Current Decision</p>
        <span className="ml-auto font-mono text-[10px] text-slate-500">attempt {decision.attemptNumber + 1}</span>
      </div>
      <div className="grid gap-px bg-line md:grid-cols-[1fr_1fr_1.1fr]">
        <div className="bg-white p-4">
          <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-red-600">
            <AlertOctagon className="h-3 w-3" /> Failure
          </p>
          <p className="mt-1 text-[15px] font-semibold text-navy">{decision.failureLabel}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{decision.category} · {decision.severity}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Rejected</p>
          <p className="mt-1 text-[14px] font-semibold capitalize text-slate-400 line-through decoration-red-500 decoration-2">
            {rejected ? rejected.action.replace(/_/g, " ") : "None"}
          </p>
          {rejected && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{rejected.reason}</p>}
        </div>
        <div className="bg-accent-50/60 p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent">Selected recovery action</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.025em] text-navy">{decision.selectedActionLabel}</p>
          <Link href="/recovery-policy" className="mt-1.5 inline-flex text-[11px] font-semibold text-accent hover:underline">
            Inspect reasoning →
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function StatusBanner({ state, conflict, onReset }: { state: AgentState | null; conflict: string | null; onReset: () => void }) {
  if (!state) return null;
  if (state.taskStatus === "Paused - Failure Detected") {
    return (
      <Banner
        tone="danger"
        title="Execution paused — a failure was detected"
        action={
          <>
            <Link href="/recovery-policy" className="inline-flex h-8 items-center rounded-lg bg-navy px-3 text-xs font-medium text-white hover:bg-navy-2">
              Open Recovery Policy
            </Link>
            <Link href="/inject-failure" className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-800 hover:bg-red-50">
              View on Inject Failure
            </Link>
          </>
        }
      >
        {conflict ? <span className="block text-xs opacity-80">{conflict}</span> : null}
        {state.activeDecision
          ? `${state.activeDecision.failureLabel} at step ${state.currentStep}. The policy selected ${state.activeDecision.selectedActionLabel}; execute it on the Recovery Policy page to resume.`
          : "Resolve the failure on the Recovery Policy page to resume execution."}
      </Banner>
    );
  }
  if (state.taskStatus === "Escalated") {
    return (
      <Banner tone="danger" title="Escalated to a human operator" action={<Button size="sm" onClick={onReset}>Reset Task</Button>}>
        Autonomous recovery was exhausted; no further steps can run until the task is reset.
      </Banner>
    );
  }
  if (state.taskStatus === "Completed") {
    return (
      <Banner tone="success" title="Demonstration task completed" action={<Button size="sm" onClick={onReset}>Reset Task</Button>}>
        All plan steps finished. Reset to run again or to try failure injection earlier in the plan.
      </Banner>
    );
  }
  if (conflict) {
    return (
      <Banner tone="warning" title="Step could not be executed">
        {conflict} See{" "}
        <Link href="/inject-failure" className="font-medium underline">
          Inject Failure
        </Link>{" "}
        or{" "}
        <Link href="/recovery-policy" className="font-medium underline">
          Recovery Policy
        </Link>
        .
      </Banner>
    );
  }
  if (state.taskStatus === "Executing") {
    return (
      <p className="text-xs text-slate-500">
        Tip: while executing, open{" "}
        <Link href="/inject-failure" className="font-medium text-accent hover:underline">
          Inject Failure
        </Link>{" "}
        to trigger one of the 8 failure types at the current step.
      </p>
    );
  }
  return null;
}
