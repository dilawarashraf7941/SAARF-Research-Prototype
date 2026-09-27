"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  ArrowRight,
  Coins,
  Cpu,
  LifeBuoy,
  ListChecks,
  Play,
  Presentation,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLiveSession } from "@/lib/hooks";
import { api } from "@/lib/api";
import { formatUsd } from "@/lib/presentation";
import { useSession, useUi } from "@/lib/store";
import type { AgentState } from "@/lib/types";
import LogLine from "@/components/LogLine";
import { AdaptiveRecoveryLoop, LiveAgentState } from "@/components/ResearchControlVisuals";
import { Button, Card, CardHeader, Pill, SimTag, cx } from "@/components/ui";

export default function DashboardPage() {
  useLiveSession("session");
  const state = useSession((s) => s.state);
  const logs = useSession((s) => s.logs);
  const setCommitteeOpen = useUi((s) => s.setCommitteeOpen);
  const [failureTypeCount, setFailureTypeCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getFailureTypes().then((types) => {
      if (!cancelled) setFailureTypeCount(types.length);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <section className="mb-5 grid items-end gap-5 border-b border-line pb-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone="accent">SAARF / RESEARCH CONTROL CENTRE</Pill>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">Session {state?.taskId ?? "connecting"}</span>
          </div>
          <h1 className="text-balance break-words text-[clamp(1.85rem,4vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-navy">
            State-Aware <span className="block text-accent sm:inline">Adaptive Recovery</span>
          </h1>
          <p className="mt-3 max-w-[32ch] text-[clamp(0.95rem,1.35vw,1.15rem)] leading-relaxed text-slate-600 sm:max-w-3xl">
            Reliable recovery for long-horizon agentic AI systems.
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 lg:w-auto lg:justify-end">
          <Link
            href="/run-agent"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-navy shadow-sm transition-colors hover:bg-navy-50"
          >
            <Play className="h-4 w-4" /> Open Execution
          </Link>
          <Button variant="accent" onClick={() => setCommitteeOpen(true)} icon={<Presentation className="h-4 w-4" />}>
            Committee Demo
          </Button>
        </div>
      </section>

      <LiveAgentState state={state} />

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Telemetry icon={<ListChecks className="h-4 w-4" />} label="Task progress" value={state ? `${state.currentStep} / ${state.totalSteps}` : "–"} />
        <Telemetry icon={<AlertOctagon className="h-4 w-4" />} label="Failure types" value={failureTypeCount ?? "–"} />
        <Telemetry icon={<LifeBuoy className="h-4 w-4" />} label="Recovery events" value={state?.recoveryHistory.length ?? "–"} />
        <Telemetry icon={<Coins className="h-4 w-4" />} label="Simulation cost" value={state ? formatUsd(state.resourceUsage.estimatedCostUsd) : "–"} sim />
      </div>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="overflow-hidden">
          <AdaptiveRecoveryLoop state={state} />
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
          <DecisionSnapshot state={state} />
          <Card className="min-w-0 overflow-hidden">
            <CardHeader
              title="Live execution feed"
              icon={<ScrollText className="h-4 w-4" />}
              right={
                <Link href="/execution-logs" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
                  Full console <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />
            <div className="space-y-px bg-slate-950 p-2">
              {logs.length === 0 ? (
                <p className="px-3 py-5 font-mono text-xs text-slate-500">Awaiting execution events…</p>
              ) : (
                logs.slice(-6).map((entry) => (
                  <motion.div key={entry.index} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <LogLine entry={entry} dense dark />
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-5">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.17em] text-slate-400">Demonstration task</p>
            <p className="text-[14px] font-medium leading-relaxed text-navy">{state?.taskGoal ?? "Loading the demonstration task…"}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Deterministic 15-step research task used to exercise classification, state assessment, adaptive recovery and verification.
            </p>
          </div>
          <div className="flex items-center gap-3 border-t border-line bg-navy-50/60 p-5 lg:border-l lg:border-t-0">
            <Sparkles className="h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-navy">Show the thesis mechanism end to end</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Three isolated scenarios · live session unchanged</p>
            </div>
            <Button size="sm" variant="accent" onClick={() => setCommitteeOpen(true)} icon={<Presentation className="h-3.5 w-3.5" />}>
              Present
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Telemetry({ icon, label, value, danger, sim }: { icon: ReactNode; label: string; value: ReactNode; danger?: boolean; sim?: boolean }) {
  return (
    <div className="lab-shadow relative min-w-0 overflow-hidden rounded-lg border border-line bg-white px-4 py-3">
      <div className="absolute inset-y-0 left-0 w-[2px] bg-navy-700/80" />
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
          <span className="text-slate-400">{icon}</span> {label}
        </p>
        {sim && <SimTag />}
      </div>
      <p className={cx("mt-1.5 font-mono text-xl font-semibold tabular-nums tracking-[-0.03em]", danger ? "text-red-700" : "text-navy")}>{value}</p>
    </div>
  );
}

function DecisionSnapshot({ state }: { state: AgentState | null }) {
  const decision = state?.activeDecision;
  if (!decision) {
    const recovered = state?.lastRecoveryOutcome === "Success";
    return (
      <Card className="overflow-hidden p-5">
        <div className="flex items-start gap-3">
          <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", recovered ? "bg-green-50 text-green-700" : "bg-navy-50 text-navy")}>
            {recovered ? <ShieldCheck className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Policy state</p>
            <p className="mt-1 text-[14px] font-semibold text-navy">{recovered ? "Recovery verified" : "Monitoring execution"}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              {recovered ? "The latest recovery passed verification and execution resumed." : "No unresolved failure. The adaptive policy is standing by."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const rejected = decision.rejectedActions[0];
  return (
    <Card className="overflow-hidden border-accent/35">
      <div className="border-b border-accent/20 bg-accent-50 px-5 py-3">
        <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.17em] text-accent">
          <Cpu className="h-3.5 w-3.5" /> Current decision
        </p>
      </div>
      <div className="space-y-3 p-5">
        <DecisionRow label="Failure" value={decision.failureLabel} tone="danger" />
        {rejected && <DecisionRow label="Rejected" value={rejected.action.replace(/_/g, " ")} sub={rejected.reason} muted />}
        <DecisionRow label="Selected" value={decision.selectedActionLabel} tone="accent" />
        <Link href="/recovery-policy" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
          Inspect policy reasoning <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}

function DecisionRow({ label, value, sub, tone, muted }: { label: string; value: string; sub?: string; tone?: "danger" | "accent"; muted?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</p>
      <p className={cx("mt-0.5 text-[13px] font-semibold capitalize", tone === "danger" ? "text-red-700" : tone === "accent" ? "text-accent" : muted ? "text-slate-500 line-through" : "text-navy")}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{sub}</p>}
    </div>
  );
}
