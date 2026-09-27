"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Ban, CheckCircle2, ChevronLeft, Cpu, ChevronRight, Loader2, Pause, Play, RotateCcw, ScrollText, X } from "lucide-react";
import type { AgentState, Frame, RecoveryDecision } from "@/lib/types";
import { highlightToNodes } from "@/lib/presentation";
import WorkflowDiagram from "./WorkflowDiagram";
import StateSummary from "./StateSummary";
import { humanizeAction } from "./RecoveryDecisionPanel";
import LogLine from "./LogLine";
import { Button, Pill, SimTag, cx } from "./ui";

const BASE_DWELL_MS = 3500;

function dwellFor(frame: Frame | undefined): number {
  if (!frame) return BASE_DWELL_MS;
  const extra = Math.max(0, frame.logsAdded.length - 10) * 80;
  const summary = frame.summaryPoints ? 2500 : 0;
  return Math.min(BASE_DWELL_MS + extra + summary, 6500);
}

const STAGE_LABEL: Record<string, string> = {
  intro: "Introduction",
  executing: "Normal execution",
  failure_detected: "Failure detected",
  policy_decision: "Policy decision",
  recovery_success: "Recovery succeeded",
  recovery_failed: "Recovery failed",
  continue: "Execution continues",
  escalated: "Escalated",
  reset: "Reset",
  complete: "Complete",
};

const STAGE_TONE: Record<string, "neutral" | "danger" | "accent" | "success" | "warning" | "navy"> = {
  failure_detected: "danger",
  policy_decision: "accent",
  recovery_success: "success",
  continue: "success",
  recovery_failed: "warning",
  escalated: "danger",
  complete: "success",
};

export interface ScenarioPlayerProps {
  open: boolean;
  title: string;
  kicker?: string;
  frames: Frame[] | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

/**
 * Self-contained, client-side replay of scripted frames returned by the backend's isolated scenario
 * session. It never writes to the live session store.
 */
export default function ScenarioPlayer(props: ScenarioPlayerProps) {
  return <AnimatePresence>{props.open && <PlayerOverlay key="player" {...props} />}</AnimatePresence>;
}

function PlayerOverlay({ title, kicker = "Guided replay", frames, loading, error, onClose, onRetry }: ScenarioPlayerProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const total = frames?.length ?? 0;
  const frame = frames?.[index];
  const atEnd = total > 0 && index >= total - 1;

  // Latest non-null state at or before the current frame (for context on narration frames).
  const latestState: AgentState | null = useMemo(() => {
    if (!frames) return null;
    for (let i = index; i >= 0; i--) if (frames[i].state) return frames[i].state;
    return null;
  }, [frames, index]);

  // Auto-advance timer
  useEffect(() => {
    if (!playing || !frames || atEnd) return;
    const t = setTimeout(() => setIndex((i) => Math.min(i + 1, frames.length - 1)), dwellFor(frames[index]));
    return () => clearTimeout(t);
  }, [playing, frames, index, atEnd]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
    },
    [total],
  );

  const togglePlay = useCallback(() => {
    if (atEnd) {
      setIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [atEnd]);

  // Keyboard + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose, togglePlay]);

  const section = frame?.sectionTitle ?? title;
  const escalated = frame?.stage === "escalated" || frame?.state?.taskStatus === "Escalated";
  const captionMatch = frame?.caption.match(/^(Step \d+ of \d+)\s+--\s+([\s\S]*)$/);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex flex-col bg-canvas"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Top bar */}
      <div className="bg-navy text-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/60">
              SAARF · {kicker}
            </p>
            <AnimatePresence mode="wait">
              <motion.h2
                key={section}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="truncate text-lg font-semibold tracking-tight"
              >
                {section}
              </motion.h2>
            </AnimatePresence>
          </div>
          <span className="hidden rounded-md border border-dashed border-amber-300/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 sm:inline-flex">
            Demo Simulation · scripted replay
          </span>
          {total > 0 && (
            <span className="font-mono text-xs tabular-nums text-white/70">
              {index + 1} / {total}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-sm font-medium text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" /> Exit
          </button>
        </div>
        {/* Segmented progress */}
        {total > 0 && (
          <div className="flex gap-1 px-4 pb-3 sm:px-6" aria-label="Playback progress">
            {frames!.map((f, i) => (
              <button
                key={i}
                type="button"
                title={`Frame ${i + 1}: ${STAGE_LABEL[f.stage] ?? f.stage}`}
                aria-label={`Go to frame ${i + 1}`}
                onClick={() => setIndex(i)}
                className="group h-3 flex-1 py-1"
              >
                <span className="relative block h-1 overflow-hidden rounded-full bg-white/15 group-hover:bg-white/25">
                  {i === index && playing && !atEnd ? (
                    <motion.span
                      key={`run-${index}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-white"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: dwellFor(f) / 1000, ease: "linear" }}
                    />
                  ) : (
                    <span
                      className={cx(
                        "absolute inset-y-0 left-0 rounded-full transition-[width] duration-200",
                        i === index ? "bg-white" : "bg-white/80",
                      )}
                      style={{ width: i <= index ? "100%" : "0%" }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading scripted frames from the backend…
          </div>
        )}
        {!loading && error && (
          <div className="mx-auto mt-16 max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
            <p className="font-semibold text-red-700">Could not load the replay</p>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
            <div className="mt-4 flex justify-center gap-2">
              {onRetry && (
                <Button variant="primary" onClick={onRetry} icon={<RotateCcw className="h-4 w-4" />}>
                  Retry
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
        {!loading && !error && frame && (
          <div className="mx-auto grid max-w-[1400px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="rounded-2xl border border-line bg-white p-4 lg:sticky lg:top-5 lg:self-start">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Workflow</p>
                <Pill tone={STAGE_TONE[frame.stage] ?? "navy"} dot>
                  {STAGE_LABEL[frame.stage] ?? frame.stage}
                </Pill>
              </div>
              <div className="diagram-grid rounded-xl p-2">
                <WorkflowDiagram active={highlightToNodes(frame.highlight)} pulse escalated={escalated} showLegend={false} />
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              {/* Caption (the summary frame uses its caption as the checklist heading instead) */}
              {!frame.summaryPoints && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="rounded-2xl border border-line bg-white p-5"
                >
                  {captionMatch ? (
                    <>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{captionMatch[1]}</p>
                      <p className="text-[17px] leading-relaxed text-navy">{captionMatch[2]}</p>
                    </>
                  ) : (
                    <p className="text-[17px] leading-relaxed text-navy">{frame.caption}</p>
                  )}
                </motion.div>
              </AnimatePresence>
              )}

              {frame.state?.activeDecision && frame.highlight === "adaptive_recovery_policy" && (
                <CompactDecision decision={frame.state.activeDecision} />
              )}

              {latestState && <EscalationLadder state={latestState} />}

              {frame.summaryPoints ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-green-200 bg-white p-5"
                >
                  <h3 className="text-xl font-semibold tracking-tight text-navy">{frame.caption}</h3>
                  <p className="mt-1 text-sm text-slate-500">The prototype has demonstrated the following mechanisms:</p>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {frame.summaryPoints.map((p, i) => (
                      <motion.li
                        key={p}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.12, duration: 0.25 }}
                        className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm font-medium text-navy"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                        {p}
                      </motion.li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs italic text-slate-500">
                    Scripted mechanism demonstration on a deterministic simulation — not an empirical evaluation.
                  </p>
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-line bg-white p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Agent state at this point</p>
                    <SimTag label="Demo Simulation" />
                  </div>
                  {frame.state ? (
                    <StateSummary state={frame.state} />
                  ) : (
                    <p className="text-sm text-slate-500">
                      Narration frame — no state change.
                      {latestState && " The most recent scripted state is unchanged."}
                    </p>
                  )}
                </div>
              )}

              {/* Log strip */}
              <LogStrip key={index} frame={frame} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {!loading && !error && total > 0 && (
        <div className="border-t border-line bg-white">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className="hidden text-xs text-slate-500 md:block">
              Keyboard: <kbd className="rounded border border-line px-1 font-mono">←</kbd>{" "}
              <kbd className="rounded border border-line px-1 font-mono">→</kbd> step ·{" "}
              <kbd className="rounded border border-line px-1 font-mono">Space</kbd> play/pause ·{" "}
              <kbd className="rounded border border-line px-1 font-mono">Esc</kbd> exit
            </p>
            <div className="flex flex-1 items-center justify-center gap-2 md:flex-none">
              <Button onClick={() => go(-1)} disabled={index === 0} icon={<ChevronLeft className="h-4 w-4" />}>
                Prev
              </Button>
              <Button
                variant="primary"
                onClick={togglePlay}
                className="min-w-[110px]"
                icon={atEnd ? <RotateCcw className="h-4 w-4" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              >
                {atEnd ? "Replay" : playing ? "Pause" : "Play"}
              </Button>
              <Button onClick={() => go(1)} disabled={atEnd} icon={<ChevronRight className="h-4 w-4" />}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function EscalationLadder({ state }: { state: AgentState }) {
  const failed = state.recoveryHistory.filter((record) => record.outcome === "Failed");
  const active = state.activeDecision;
  if (failed.length === 0) return null;
  const currentIsEscalation = active?.selectedAction === "human_escalation" || state.taskStatus === "Escalated";
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-red-200 bg-white"
      aria-label="Recovery escalation ladder"
    >
      <div className="flex items-center justify-between border-b border-red-100 bg-red-50/70 px-5 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-700">Escalation ladder</p>
        <span className="font-mono text-[10px] text-red-600">{failed.length} failed attempt{failed.length === 1 ? "" : "s"}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 p-4">
        {failed.map((record, index) => (
          <div key={`${record.occurredAtLog}-${index}`} className="contents">
            {index > 0 && <ArrowRight className="h-4 w-4 text-red-300" />}
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-red-500">Failed</p>
              <p className="mt-0.5 text-[12px] font-semibold text-navy">{record.actionLabel}</p>
            </div>
          </div>
        ))}
        {active && (
          <>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <div className={cx("rounded-lg border px-3 py-2", currentIsEscalation ? "border-red-500 bg-red-600 text-white" : "border-accent/40 bg-accent-50 text-accent")}>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] opacity-70">{currentIsEscalation ? "Escalate" : "Selected next"}</p>
              <p className="mt-0.5 text-[12px] font-semibold">{active.selectedActionLabel}</p>
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}

function LogStrip({ frame }: { frame: Frame }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollToEnd = () => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          <ScrollText className="h-3.5 w-3.5" /> Execution log — lines added in this frame
        </p>
        <span className="font-mono text-[11px] text-slate-400">{frame.logsAdded.length} lines</span>
      </div>
      <div ref={ref} className="thin-scroll max-h-64 space-y-px overflow-y-auto bg-canvas/50 p-2">
        {frame.logsAdded.length === 0 ? (
          <p className="px-3 py-3 text-sm text-slate-500">No new log lines in this frame.</p>
        ) : (
          frame.logsAdded.map((l, i) => (
            <motion.div
              key={`${l.index}-${i}`}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.07, 1.8), duration: 0.18 }}
              onAnimationComplete={scrollToEnd}
              className={cx("overflow-hidden rounded-md")}
            >
              <LogLine entry={l} dense />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function CompactDecision({ decision }: { decision: RecoveryDecision }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="rounded-2xl border border-accent-100 bg-white"
    >
      <div className="flex items-center gap-2 border-b border-accent-100 bg-accent-50/60 px-5 py-2.5">
        <Cpu className="h-4 w-4 text-accent" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">State-aware recovery decision</p>
        <span className="ml-auto text-xs text-slate-500">attempt {decision.attemptNumber + 1}</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-700">
            <Ban className="h-3.5 w-3.5" /> Considered and rejected
          </p>
          {decision.rejectedActions.length === 0 ? (
            <p className="text-sm text-slate-500">No action rejected at this point.</p>
          ) : (
            decision.rejectedActions.map((r) => (
              <div key={r.action} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2.5">
                <span className="inline-flex shrink-0 items-center rounded-md border border-red-200 px-2 py-0.5 text-[13px] font-semibold text-slate-400 line-through decoration-red-500 decoration-2">
                  {humanizeAction(r.action)}
                </span>
                <span className="text-[13px] leading-snug text-slate-600">{r.reason}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col justify-center rounded-xl border-2 border-green-600/70 bg-green-50/50 px-4 py-3 sm:min-w-[170px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-green-700">Selected</p>
          <p className="text-xl font-semibold text-navy">{decision.selectedActionLabel}</p>
        </div>
      </div>
    </motion.div>
  );
}
