"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Crosshair,
  Eye,
  GitBranch,
  Radar,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AgentState } from "@/lib/types";
import { statusTone } from "@/lib/presentation";
import { Card, Pill, cx } from "./ui";

type LoopNodeId =
  | "observe"
  | "failure"
  | "classify"
  | "assess"
  | "policy"
  | "action"
  | "verify"
  | "route";

const LOOP: { id: LoopNodeId; label: string; short: string; icon: LucideIcon; tone?: "failure" | "policy" | "verify" }[] = [
  { id: "observe", label: "Observe", short: "agent state", icon: Eye },
  { id: "failure", label: "Failure Detected", short: "signal", icon: AlertOctagon, tone: "failure" },
  { id: "classify", label: "Classify", short: "taxonomy", icon: Radar },
  { id: "assess", label: "State Assessment", short: "integrity", icon: Crosshair },
  { id: "policy", label: "Adaptive Policy", short: "thesis contribution", icon: BrainCircuit, tone: "policy" },
  { id: "action", label: "Select Action", short: "recovery", icon: Wrench },
  { id: "verify", label: "Verify", short: "outcome", icon: ShieldCheck, tone: "verify" },
  { id: "route", label: "Continue / Replan / Escalate", short: "route", icon: GitBranch },
];

function activeNode(state: AgentState | null): LoopNodeId {
  if (!state) return "observe";
  if (state.taskStatus === "Escalated" || state.taskStatus === "Completed") return "route";
  if (state.taskStatus === "Recovering" || state.taskStatus === "Replanning") return "action";
  if (state.taskStatus === "Paused - Failure Detected") return state.activeDecision ? "policy" : "failure";
  if (state.lastRecoveryOutcome === "Success") return "verify";
  return "observe";
}

export function AdaptiveRecoveryLoop({ state, compact = false }: { state: AgentState | null; compact?: boolean }) {
  const active = activeNode(state);
  const activeIndex = LOOP.findIndex((node) => node.id === active);

  return (
    <div className={cx("relative", compact ? "p-3" : "p-4 sm:p-5")}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-accent">Research contribution visual</p>
          <h2 className="mt-0.5 text-[17px] font-semibold tracking-[-0.025em] text-navy">Adaptive Recovery Loop</h2>
        </div>
        <p className="max-w-md text-right text-[11px] leading-relaxed text-slate-500">
          Failure response changes with agent state, failure class and recovery history.
        </p>
      </div>

      <div className="grid gap-0 md:grid-cols-[repeat(8,minmax(0,1fr))]" role="list" aria-label="SAARF adaptive recovery loop">
        {LOOP.map((node, index) => {
          const Icon = node.icon;
          const isActive = node.id === active;
          const isTraversed = index <= activeIndex && active !== "observe";
          const tone =
            node.tone === "failure"
              ? "border-red-200 bg-red-50 text-red-700"
              : node.tone === "policy"
                ? "border-accent/45 bg-accent-50 text-accent"
                : node.tone === "verify"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-line bg-white text-navy";
          return (
            <div key={node.id} className="relative flex min-w-0 items-stretch md:block" role="listitem">
              {index > 0 && (
                <div className="flex w-7 shrink-0 items-center justify-center md:absolute md:-left-3.5 md:top-[30px] md:z-10 md:w-7">
                  <ArrowRight className={cx("hidden h-3.5 w-3.5 md:block", isTraversed ? "text-accent" : "text-slate-300")} />
                  <ArrowDown className={cx("h-3.5 w-3.5 md:hidden", isTraversed ? "text-accent" : "text-slate-300")} />
                </div>
              )}
              <motion.div
                initial={false}
                animate={isActive ? { y: [0, -2, 0] } : { y: 0 }}
                transition={isActive ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                className={cx(
                  "relative min-h-[74px] flex-1 overflow-hidden border px-2.5 py-3 md:mx-1.5",
                  index === 0 ? "rounded-t-lg md:rounded-l-lg md:rounded-r-none" : "",
                  index === LOOP.length - 1 ? "rounded-b-lg md:rounded-l-none md:rounded-r-lg" : "",
                  index > 0 && index < LOOP.length - 1 ? "md:rounded-none" : "",
                  "rounded-lg md:rounded-none",
                  tone,
                  isActive && "z-10 ring-2 ring-accent/35 ring-offset-2",
                )}
              >
                {isActive && (
                  <motion.span
                    className="absolute inset-x-0 top-0 h-[2px] bg-current"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  />
                )}
                <div className="flex items-center gap-2 md:block">
                  <Icon className="h-4 w-4 shrink-0 md:mb-2" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase leading-tight tracking-[0.055em]">{node.label}</p>
                    <p className="mt-1 text-[9px] leading-tight opacity-65">{node.short}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LiveAgentState({ state, className }: { state: AgentState | null; className?: string }) {
  const phases = [
    { label: "Planning", done: !!state, active: state?.taskStatus === "Idle" },
    { label: "Execution", done: !!state && (state.currentStep > 1 || state.taskStatus === "Completed"), active: state?.taskStatus === "Executing" },
    { label: "Failure", done: (state?.failureHistory.length ?? 0) > 0, active: state?.taskStatus === "Paused - Failure Detected" },
    {
      label: "Recovery",
      done: (state?.recoveryHistory.length ?? 0) > 0,
      active: state?.taskStatus === "Recovering" || state?.taskStatus === "Replanning",
    },
  ];

  return (
    <Card className={cx("instrument-grid overflow-hidden border-navy-700 !bg-navy text-white shadow-[0_20px_55px_rgba(7,21,37,0.2)]", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.09] px-5 py-3">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          <Activity className="h-3.5 w-3.5 text-[#9d92ff]" /> Live Agent State
        </p>
        <Pill tone={statusTone(state?.taskStatus)} dot className="!ring-white/15">
          {state?.taskStatus ?? "Connecting"}
        </Pill>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#aaa1ff]">Current state</p>
            <p className="mt-1 flex items-baseline gap-3">
              <span className="font-mono text-4xl font-semibold tracking-[-0.05em] text-white">S{state?.currentStep ?? "–"}</span>
              <span className="truncate text-[15px] font-medium text-white/85">{state?.stepLabel ?? "Awaiting session state"}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Task progress</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-white">
              {state ? `${state.currentStep} / ${state.totalSteps}` : "– / –"}
            </p>
          </div>
        </div>

        <div className="my-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {phases.map((phase, index) => (
            <div key={phase.label} className="relative flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
              <span
                className={cx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  phase.active
                    ? "border-[#9d92ff] bg-[#7668e7] text-white shadow-[0_0_14px_rgba(118,104,231,0.45)]"
                    : phase.done
                      ? "border-green-400/40 bg-green-400/10 text-green-300"
                      : "border-white/15 text-white/25",
                )}
              >
                {phase.done && !phase.active ? <Check className="h-3 w-3" /> : <span className="font-mono text-[9px]">{index + 1}</span>}
              </span>
              <span className={cx("text-[10px] font-semibold uppercase tracking-[0.08em]", phase.active ? "text-white" : "text-white/50")}>{phase.label}</span>
            </div>
          ))}
        </div>

        <dl className="grid gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
          <StateField label="Current action" value={state?.stepLabel ?? "–"} />
          <StateField label="Goal alignment" value={state ? state.goalAlignment.toFixed(2) : "–"} mono />
          <StateField label="Context integrity" value={state ? `${Math.round(state.contextIntegrity)}%` : "–"} mono />
          <StateField label="Plan / environment" value={state ? `${state.planStatus} · ${state.environmentStatus}` : "–"} />
        </dl>
      </div>
    </Card>
  );
}

function StateField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 bg-navy-2/95 px-3.5 py-3">
      <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">{label}</dt>
      <dd className={cx("mt-1 truncate text-[12px] font-medium text-white/85", mono && "font-mono tabular-nums")}>{value}</dd>
    </div>
  );
}

export function VerifiedMark() {
  return <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />;
}
