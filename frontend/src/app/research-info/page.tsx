import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "problem",
    title: "Research Problem",
    body: (
      <p>
        Long-horizon agentic AI systems — agents that plan and execute multi-step tasks autonomously using LLMs and tools —
        frequently fail partway through execution due to transient tool errors, invalid outputs, planning breakdowns,
        environment changes, context degradation, memory inconsistency, or goal drift. Most current agent architectures
        respond to these failures with a fixed, undifferentiated strategy, typically a blind retry, regardless of the
        failure&apos;s type, severity, or the agent&apos;s recovery history. This limits reliability on long-horizon tasks,
        where failures compound and a poorly chosen recovery action can waste resources or leave the agent in a worse state
        than before.
      </p>
    ),
  },
  {
    id: "gap",
    title: "Research Gap",
    body: (
      <p>
        Existing agentic frameworks largely treat failure recovery as a peripheral concern bolted onto the execution loop
        (e.g. fixed retry counts, generic self-correction prompts) rather than as a first-class, state-dependent decision
        problem. There is limited prior work that explicitly models the agent&apos;s internal state — plan validity,
        environment status, context integrity, goal alignment, recovery history — as an input to the recovery decision
        itself, and that adapts the chosen recovery action as that state and history evolve across a long-horizon task.
      </p>
    ),
  },
  {
    id: "aim",
    title: "Research Aim",
    body: (
      <p>
        To design and demonstrate a State-Aware Adaptive Recovery Policy that selects a recovery action based on the
        agent&apos;s current state and recovery history, rather than a fixed rule, in order to improve the reliability of
        long-horizon agentic AI systems.
      </p>
    ),
  },
  {
    id: "objectives",
    title: "Research Objectives",
    body: (
      <ol className="list-none space-y-3 pl-0">
        {[
          "Define a structured internal state representation for a long-horizon agentic task (plan status, environment status, context integrity, goal alignment, failure and recovery history).",
          "Define a deterministic failure classification scheme mapping observable failure signals to failure categories.",
          "Design an adaptive recovery policy that selects among multiple recovery actions (retry, revalidate, replan, rollback, alternative tool, context reconstruction, subtask decomposition, strategy switch, human escalation) as a function of state, failure category, severity, and recovery history.",
          "Implement a working prototype demonstrating the full failure-classification-state assessment-recovery-verification-continuation loop.",
          "Establish an experimental framework (fixed retry / generic self-correction / SAARF) for future empirical evaluation of the proposed policy against baseline recovery strategies.",
        ].map((t, i) => (
          <li key={i} className="flex gap-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-50 font-mono text-xs font-semibold text-navy">
              {i + 1}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "questions",
    title: "Research Questions",
    body: (
      <ol className="list-none space-y-4 pl-0">
        {[
          ["RQ1", "How can the internal state of a long-horizon agentic system be represented in a way that is useful for recovery decision-making?"],
          ["RQ2", "How can failures in long-horizon agentic execution be classified in a way that meaningfully differentiates the appropriate recovery response?"],
          ["RQ3", "Does incorporating current state and recovery history into the recovery decision produce qualitatively different, and more appropriate, recovery behaviour than fixed-rule or generic self-correction baselines?"],
          ["RQ4 (future empirical work)", "Does a state-aware adaptive recovery policy improve task success rate and reduce recovery cost compared to baseline strategies, under real LLM-driven execution?"],
        ].map(([k, v]) => (
          <li key={k} className="grid gap-1 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)] sm:gap-4">
            <span className="font-semibold text-accent">{k}:</span>
            <span>{v}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "contribution",
    title: "Proposed Contribution",
    body: (
      <p>
        This work proposes SAARF, a State-Aware Adaptive Recovery Framework, whose central contribution is reframing failure
        recovery in agentic AI systems as a state-dependent, history-aware decision problem rather than a fixed retry rule.
        This prototype demonstrates the mechanism of that framework in a controlled, deterministic simulation; a full
        empirical evaluation against baseline strategies using real LLM-driven execution is proposed as the next phase of
        this research.
      </p>
    ),
  },
];

export default function ResearchInfoPage() {
  return (
    <div>
      <PageHeader
        eyebrow="MSc thesis"
        title="Research Programme"
        description="State-Aware Adaptive Recovery Policy for Reliable Long-Horizon Agentic AI Systems"
      />
      <section className="instrument-grid mb-6 overflow-hidden rounded-xl border border-navy-700 bg-navy px-6 py-5 text-white shadow-[0_18px_45px_rgba(7,21,37,0.16)] sm:px-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-[#a99fff]">Central proposition</p>
        <p className="mt-2 max-w-4xl text-balance text-xl font-medium leading-snug tracking-[-0.025em] text-white sm:text-2xl">
          Recovery is a state-dependent, history-aware decision problem — not a fixed retry rule.
        </p>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-white/55">
          This prototype demonstrates the mechanism in a controlled deterministic simulation; empirical evaluation remains future work.
        </p>
      </section>
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="sticky top-28 space-y-1 border-l border-line text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-slate-500 hover:border-accent hover:text-navy">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="lab-shadow max-w-[78ch] rounded-xl border border-line bg-white px-6 py-8 sm:px-10">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className={i > 0 ? "mt-10 scroll-mt-28 border-t border-line pt-10" : "scroll-mt-28"}>
              <p className="mb-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-slate-400">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-navy">{s.title}</h2>
              <div className="text-[15.5px] leading-[1.8] text-slate-700">{s.body}</div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
