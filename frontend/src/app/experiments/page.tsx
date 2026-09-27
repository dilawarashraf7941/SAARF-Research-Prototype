"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Beaker, CheckCircle2, FlaskConical, Play, Sparkles, XCircle } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { toast } from "@/lib/store";
import type { Approach, ExperimentMetrics, FailureType, SimulationTrace } from "@/lib/types";
import { Banner, Button, Card, CardHeader, InfoTip, PageHeader, Pill, SimTag, cx } from "@/components/ui";

const METRIC_FALLBACK = "Experimental data not available";

const METRIC_CARDS: { key: keyof ExperimentMetrics; label: string; tip: string }[] = [
  { key: "taskSuccessRate", label: "Task Success Rate", tip: "Proportion of long-horizon tasks completed successfully. To be measured in future empirical work with real LLM-driven execution." },
  { key: "recoveryRate", label: "Recovery Rate", tip: "Proportion of failures from which the agent recovered autonomously. To be measured in future empirical work." },
  { key: "recoveryCost", label: "Recovery Cost", tip: "Resources (e.g. tokens, time) spent on recovery. To be measured in future empirical work." },
];

export default function ExperimentsPage() {
  const [approaches, setApproaches] = useState<Approach[] | null>(null);
  const [metrics, setMetrics] = useState<ExperimentMetrics | null>(null);
  const [types, setTypes] = useState<FailureType[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(["planning_failure"]);
  const [traces, setTraces] = useState<SimulationTrace[] | null>(null);
  const [ranSequence, setRanSequence] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getApproaches(), api.getMetrics(), api.getFailureTypes()])
      .then(([a, m, t]) => {
        if (cancelled) return;
        setApproaches(a);
        setMetrics(m);
        setTypes(t);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Keep the sequence in the canonical failure-type order for determinism.
  const sequence = types ? types.filter((t) => selected.includes(t.id)).map((t) => t.id) : selected;

  const run = async () => {
    if (!approaches || sequence.length === 0) return;
    setRunning(true);
    try {
      const results = await Promise.all(approaches.map((a) => api.simulate(a.id, sequence)));
      setTraces(results);
      setRanSequence(sequence);
    } catch (err) {
      toast.error("Simulation failed", errorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  const approachName = (id: string) => approaches?.find((a) => a.id === id)?.name ?? id;
  const labelFor = (id: string) => types?.find((t) => t.id === id)?.label ?? id;

  return (
    <div>
      <PageHeader
        eyebrow="Evaluation framework / research protocol"
        title="Experimental Methodology"
        description="The experimental framework compares three recovery approaches. Headline metrics are reserved for future empirical work; the mechanism-trace comparison below is a deterministic demonstration only."
      />

      {loadError && (
        <Banner tone="danger" title="Could not load experiment data" className="mb-5">
          {loadError}
        </Banner>
      )}

      {/* Headline metrics — must remain verbatim "Experimental data not available" */}
      <section aria-labelledby="metrics-heading" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-slate-400">01</span>
          <h2 id="metrics-heading" className="text-lg font-semibold tracking-tight text-navy">
            Evaluation metrics
          </h2>
          <Pill tone="neutral">Future empirical work</Pill>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {METRIC_CARDS.map((m) => (
            <div key={m.key} className="relative overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white p-5">
              <span className="absolute inset-y-0 left-0 w-[2px] bg-slate-300" />
              <p className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {m.label}
                <InfoTip content={m.tip} />
              </p>
              <p className="text-base font-medium italic text-slate-500">{metrics ? metrics[m.key] : METRIC_FALLBACK}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          These values are served by <code className="font-mono">GET /api/experiments/metrics</code> and are displayed
          verbatim. No figures are computed or inferred from the demo simulation below.
        </p>
      </section>

      {/* Approaches */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-slate-400">02</span>
          <h2 className="text-lg font-semibold tracking-tight text-navy">Methods under comparison</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(approaches ?? [null, null, null]).map((a, i) =>
            a ? (
              <Card key={a.id} className={cx("relative overflow-hidden p-5", a.id === "saarf" && "border-accent/50 bg-accent-50/30")}>
                <span className={cx("absolute inset-x-0 top-0 h-[2px]", a.id === "saarf" ? "bg-accent" : "bg-navy-700/55")} />
                <div className="mb-2 flex items-center gap-2">
                  <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg", a.id === "saarf" ? "bg-accent text-white" : "bg-navy-50 text-navy")}>
                    {a.id === "saarf" ? <Sparkles className="h-4 w-4" /> : <Beaker className="h-4 w-4" />}
                  </span>
                  <p className="text-[15px] font-semibold text-navy">{a.name}</p>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-600">{a.description}</p>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  {a.id === "saarf" ? "Proposed" : "Baseline"}
                </p>
              </Card>
            ) : (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-white" />
            ),
          )}
        </div>
      </section>

      {/* Demo simulation */}
      <Card className="border-amber-300/70">
        <div className="flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-amber-200 bg-amber-50/60 px-5 py-3">
          <span className="font-mono text-[10px] font-bold text-amber-700/60">03</span>
          <FlaskConical className="h-5 w-5 text-amber-700" />
          <p className="text-base font-bold uppercase tracking-[0.12em] text-amber-900">Demo Simulation</p>
          <span className="text-xs text-amber-900/80">Deterministic mechanism trace — not a performance measurement or statistical result.</span>
        </div>
        <CardHeader
          title="Mechanism-trace comparison"
          subtitle="Choose a failure sequence; all three approaches are simulated on the same sequence and shown side by side."
          className="border-b-0"
        />
        <div className="space-y-4 px-5 pb-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Failure sequence</p>
            <div className="flex flex-wrap gap-2">
              {(types ?? []).map((t) => {
                const on = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    aria-pressed={on}
                    title={t.description}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      on ? "border-navy bg-navy text-white" : "border-line bg-white text-slate-600 hover:border-navy-100 hover:bg-navy-50",
                    )}
                  >
                    {on && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={run} loading={running} disabled={!approaches || sequence.length === 0} icon={<Play className="h-4 w-4" />}>
              Run Simulation
            </Button>
            {sequence.length === 0 ? (
              <span className="text-xs text-red-700">Select at least one failure type.</span>
            ) : (
              <span className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                Sequence:
                {sequence.map((id, i) => (
                  <span key={id} className="inline-flex items-center gap-1">
                    {i > 0 && <ArrowRight className="h-3 w-3" />}
                    <span className="font-medium text-navy">{labelFor(id)}</span>
                  </span>
                ))}
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {traces && (
              <motion.div
                key={ranSequence.join(",")}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid gap-4 pt-2 lg:grid-cols-3"
              >
                {traces.map((t) => (
                  <TraceColumn key={t.approach} trace={t} name={approachName(t.approach)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {!traces && (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-slate-500">
              Run the simulation to see each approach&apos;s recovery trace for the selected failure sequence.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function TraceColumn({ trace, name }: { trace: SimulationTrace; name: string }) {
  const saarf = trace.approach === "saarf";
  return (
    <div className={cx("flex flex-col rounded-xl border", saarf ? "border-accent/60" : "border-line")}>
      <div className={cx("flex items-center justify-between gap-2 rounded-t-xl border-b px-4 py-3", saarf ? "border-accent/30 bg-accent-50/60" : "border-line bg-canvas")}>
        <p className={cx("text-sm font-semibold", saarf ? "text-accent" : "text-navy")}>{name}</p>
        <SimTag label="Demo Simulation" />
      </div>
      <ol className="flex-1 divide-y divide-line">
        {trace.steps.map((s, i) => (
          <motion.li
            key={`${s.failureType}-${i}`}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 + 0.1, duration: 0.2 }}
            className="space-y-2 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy">{s.failureLabel}</p>
                <p className="text-[11px] text-slate-500">{s.category}</p>
              </div>
              <Pill tone={s.resolved ? "success" : "danger"} dot>
                {s.resolved ? "Resolved" : "Unresolved"}
              </Pill>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {s.actionsAttempted.length === 0 ? (
                <span className="text-xs text-slate-400">no action attempted</span>
              ) : (
                s.actionsAttempted.map((a, j) => (
                  <span key={j} className="inline-flex items-center gap-1">
                    {j > 0 && <ArrowRight className="h-3 w-3 text-slate-300" />}
                    <span className={cx("rounded-md px-1.5 py-0.5 text-[11px] font-medium", saarf ? "bg-accent-50 text-accent" : "bg-slate-100 text-slate-700")}>{a}</span>
                  </span>
                ))
              )}
            </div>
            <p className="text-xs text-slate-500">Outcome: {s.outcome}</p>
          </motion.li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          {trace.overallResolved ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
          <span className="font-medium text-navy">{trace.overallResolved ? "All failures resolved in trace" : "Not all failures resolved in trace"}</span>
        </span>
        <span className="text-slate-500">
          Actions attempted: <strong className="tabular-nums text-navy">{trace.totalActionsAttempted}</strong>
        </span>
      </div>
    </div>
  );
}
