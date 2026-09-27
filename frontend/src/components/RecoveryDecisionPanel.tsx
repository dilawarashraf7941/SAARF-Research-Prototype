"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Ban, CheckCircle2, Cpu, FlaskConical, History, Play, ScanLine, XCircle } from "lucide-react";
import type { RecoveryDecision, RecoveryOutcome, RecoveryRecord } from "@/lib/types";
import { severityTone } from "@/lib/presentation";
import { Button, Card, InfoTip, Pill, Tooltip, cx } from "./ui";

export function humanizeAction(id: string): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const outcomeTone: Record<RecoveryOutcome, "success" | "danger" | "warning"> = {
  Success: "success",
  Failed: "danger",
  Escalated: "warning",
};

export default function RecoveryDecisionPanel({
  decision,
  history = [],
  onExecute,
  executing,
  reevaluated,
  className,
}: {
  decision: RecoveryDecision;
  /** Full recoveryHistory from AgentState; filtered here to this failure type. */
  history?: RecoveryRecord[];
  /** Called with `true` when the presenter has ticked "force this attempt to fail". */
  onExecute?: (forceFail: boolean) => void;
  executing?: boolean;
  /** True when this decision was produced by re-evaluation after a failed recovery attempt. */
  reevaluated?: boolean;
  className?: string;
}) {
  const priorForType = history.filter((r) => r.failureType === decision.failureType);
  const [forceFail, setForceFail] = useState(false);
  const isTerminal = decision.selectedAction === "human_escalation";
  return (
    <Card className={cx("overflow-visible", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b border-accent-100 bg-gradient-to-r from-accent-50 to-white px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Adaptive Recovery Policy</p>
            <h2 className="text-base font-semibold tracking-tight text-navy">State-Aware Recovery Decision</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reevaluated && (
            <Pill tone="warning" title="The previous recovery attempt failed; the policy re-evaluated using the updated recovery history.">
              Re-evaluated after failed attempt
            </Pill>
          )}
          <Pill tone="accent">Attempt {decision.attemptNumber + 1} for this failure type</Pill>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* Classification */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Failure</span>
            <p className="font-semibold text-red-700">{decision.failureLabel}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Category</span>
            <p className="font-medium text-navy">{decision.category}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Severity</span>
            <p>
              <Pill tone={severityTone(decision.severity)} dot>
                {decision.severity}
              </Pill>
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <ScanLine className="h-3.5 w-3.5" /> State analysis
              <InfoTip content="The agent-state variables the policy read before choosing an action. The same failure can produce a different decision when these values differ." />
            </p>
            <ul className="space-y-1.5">
              {decision.stateAnalysis.map((s, i) => (
                <motion.li
                  key={`${s}-${i}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <History className="h-3.5 w-3.5" /> Recovery history
              <InfoTip content="Prior recovery attempts for this failure type. SAARF is history-aware: an action that already failed is not simply repeated." />
            </p>
            <p className="text-sm text-slate-700">{decision.recoveryHistorySummary}</p>
            {priorForType.length > 0 && (
              <ol className="mt-3 flex flex-wrap items-center gap-1.5">
                {priorForType.map((r, i) => (
                  <li key={`${r.occurredAtLog}-${i}`} className="flex items-center gap-1.5">
                    <Pill tone={outcomeTone[r.outcome]} title={`Step ${r.step}, attempt ${r.attemptNumber + 1}: ${r.outcome}`}>
                      {r.actionLabel} · {r.outcome}
                    </Pill>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </li>
                ))}
                <li>
                  <Pill tone="accent">{decision.selectedActionLabel} (now)</Pill>
                </li>
              </ol>
            )}
          </div>
        </div>

        {/* The central visual: considered-and-rejected vs selected */}
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)]">
          <div className="rounded-xl border border-red-200/70 bg-red-50/30 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-700">
              <Ban className="h-3.5 w-3.5" /> Considered and rejected by the state
            </p>
            {decision.rejectedActions.length === 0 ? (
              <p className="text-sm leading-relaxed text-slate-600">
                No candidate action was rejected at this point: the current state does not contradict the category&apos;s
                primary recovery action.
              </p>
            ) : (
              <ul className="space-y-2.5">
                <AnimatePresence initial>
                  {decision.rejectedActions.map((r, i) => (
                    <motion.li
                      key={r.action}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.25 }}
                      className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
                    >
                      <Tooltip content={<><strong>Rejected:</strong> {r.reason}</>} align="start">
                        <span
                          tabIndex={0}
                          className="inline-flex shrink-0 cursor-help items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1 text-[13px] font-semibold text-slate-400 line-through decoration-red-500 decoration-2"
                        >
                          <XCircle className="h-3.5 w-3.5 text-red-500 no-underline" />
                          {humanizeAction(r.action)}
                        </span>
                      </Tooltip>
                      <span className="text-[13px] leading-snug text-slate-600">{r.reason}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          <div className="hidden items-center justify-center lg:flex">
            <ArrowRight className="h-5 w-5 text-slate-300" />
          </div>

          <motion.div
            key={decision.selectedAction + decision.attemptNumber}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex flex-col justify-center rounded-xl border-2 border-green-600/70 bg-green-50/50 p-4"
          >
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Selected recovery action
            </p>
            <p className="text-2xl font-semibold tracking-tight text-navy">{decision.selectedActionLabel}</p>
            <p className="mt-1 text-xs text-slate-500">chosen as a function of failure category, severity, state and history</p>
          </motion.div>
        </div>

        <figure className="rounded-xl border-l-[3px] border-accent bg-accent-50/50 px-4 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">Policy reasoning</p>
          <blockquote className="text-sm leading-relaxed text-slate-700">{decision.reasoning}</blockquote>
          <figcaption className="mt-2 text-[11px] italic text-slate-500">
            Prototype policy explanation — not experimental evidence.
          </figcaption>
        </figure>

        {onExecute && (
          <div className="space-y-3 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Executes the policy&apos;s own choice. If it fails, the policy re-evaluates with the updated history.
              </p>
              <Button
                variant="primary"
                icon={<Play className="h-4 w-4" />}
                onClick={() => {
                  onExecute(forceFail);
                  setForceFail(false);
                }}
                loading={executing}
              >
                Execute Recovery: {decision.selectedActionLabel}
              </Button>
            </div>
            {!isTerminal && (
              <label
                className={cx(
                  "flex items-start gap-2.5 rounded-xl border border-dashed px-3 py-2.5 text-[13px] leading-snug",
                  forceFail ? "border-amber-400 bg-amber-50/70 text-amber-900" : "border-line bg-canvas/60 text-slate-600",
                  executing ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                )}
              >
                <input
                  type="checkbox"
                  checked={forceFail}
                  disabled={executing}
                  onChange={(e) => setForceFail(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-amber-600"
                />
                <span className="flex items-start gap-1.5">
                  <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span>
                    <strong>Demonstration control:</strong> force this attempt to fail, so the policy escalates to the
                    next rung on the recovery ladder. By default every recovery attempt in this simulation succeeds on
                    its first try; use this to walk Retry → Alternative Tool → Strategy Switch → Human Escalation live.
                  </span>
                </span>
              </label>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
