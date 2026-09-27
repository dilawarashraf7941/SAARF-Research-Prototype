"use client";

import { ArrowDown, Database, Wrench } from "lucide-react";
import { Card, CardHeader, PageHeader, Pill, cx } from "@/components/ui";

interface ArchNode {
  id: string;
  title: string;
  sub: string;
  policy?: boolean;
}

const MAIN: ArchNode[] = [
  { id: "task", title: "USER TASK", sub: "goal specification" },
  { id: "plan", title: "TASK PLANNING", sub: "long-horizon plan construction" },
  { id: "exec", title: "AGENT EXECUTION", sub: "step and tool invocation" },
  { id: "observe", title: "OBSERVATION", sub: "tool and environment output" },
  { id: "detect", title: "FAILURE DETECTION", sub: "identify abnormal execution signal" },
  { id: "state", title: "STATE REPRESENTATION", sub: "capture plan, context, goal and history" },
  { id: "classify", title: "FAILURE CLASSIFICATION", sub: "map signal into the failure taxonomy" },
  { id: "assess", title: "STATE ASSESSMENT", sub: "evaluate integrity and recovery conditions" },
  { id: "policy", title: "ADAPTIVE RECOVERY POLICY", sub: "state + classification + history → action", policy: true },
  { id: "action", title: "RECOVERY ACTION", sub: "execute the selected intervention" },
  { id: "verify", title: "VERIFICATION", sub: "confirm the recovery outcome" },
  { id: "route", title: "CONTINUE / REPLAN / ESCALATE", sub: "route the verified outcome" },
];

const W = 820;
const MAIN_X = 270;
const MAIN_W = 280;
const NODE_H = 52;
const STEP = 73;
const TOP = 34;
const H = TOP + (MAIN.length - 1) * STEP + NODE_H + 30;
const SIDE_W = 190;
const LEFT_X = 24;
const RIGHT_X = W - 24 - SIDE_W;
const y = (i: number) => TOP + i * STEP;
const EXEC = 2;
const OBSERVE = 3;

function SideBox({ x, top, title, sub }: { x: number; top: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={x} y={top} width={SIDE_W} height={64} rx={10} fill="#F7F9FB" stroke="#94A3B8" strokeDasharray="6 4" />
      <text x={x + SIDE_W / 2} y={top + 27} textAnchor="middle" fontSize="12.5" fontWeight={650} fill="#071525">
        {title}
      </text>
      <text x={x + SIDE_W / 2} y={top + 45} textAnchor="middle" fontSize="10.5" fill="#64748B">
        {sub}
      </text>
    </g>
  );
}

function ArchitectureSvg() {
  const execY = y(EXEC) + NODE_H / 2;
  const observeY = y(OBSERVE) + NODE_H / 2;
  const connectors = [
    { x1: LEFT_X + SIDE_W, x2: MAIN_X, yy: execY },
    { x1: MAIN_X + MAIN_W, x2: RIGHT_X, yy: execY },
    { x1: MAIN_X + MAIN_W, x2: RIGHT_X, yy: observeY },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[860px]" role="img" aria-label="Proposed SAARF architecture diagram">
      <defs>
        <marker id="arch-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#13294B" />
        </marker>
        <marker id="arch-arrow-muted" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
        </marker>
      </defs>

      {/* main flow edges */}
      {MAIN.slice(0, -1).map((n, i) => (
        <line
          key={n.id}
          x1={MAIN_X + MAIN_W / 2}
          x2={MAIN_X + MAIN_W / 2}
          y1={y(i) + NODE_H}
          y2={y(i + 1) - 3}
          stroke="#13294B"
          strokeWidth={1.4}
          markerEnd="url(#arch-arrow)"
        />
      ))}

      {/* side connectors (dashed, bidirectional) */}
      {connectors.map((c, i) => (
        <line
          key={i}
          x1={c.x1 + 3}
          x2={c.x2 - 3}
          y1={c.yy}
          y2={c.yy}
          stroke="#94A3B8"
          strokeWidth={1.3}
          strokeDasharray="5 4"
          markerStart="url(#arch-arrow-muted)"
          markerEnd="url(#arch-arrow-muted)"
        />
      ))}

      <SideBox x={LEFT_X} top={y(EXEC) - 6} title="EPISODIC MEMORY" sub="episodes and recovery outcomes" />
      <SideBox x={RIGHT_X} top={y(EXEC) - 6} title="EXTERNAL TOOLS" sub="invoked during execution" />
      <SideBox x={RIGHT_X} top={y(OBSERVE) - 6} title="KNOWLEDGE SOURCES" sub="evidence and environment input" />

      {MAIN.map((n, i) => (
        <g key={n.id}>
          <rect
            x={MAIN_X}
            y={y(i)}
            width={MAIN_W}
            height={NODE_H}
            rx={12}
            fill={n.policy ? "#6657D9" : i === 0 || i === MAIN.length - 1 ? "#071525" : "#FFFFFF"}
            stroke={n.policy ? "#5748C6" : "#173A5E"}
            strokeWidth={n.policy ? 1.6 : 1.2}
          />
          <text
            x={MAIN_X + MAIN_W / 2}
            y={y(i) + 22}
            textAnchor="middle"
            fontSize="13.5"
            fontWeight={650}
            fill={n.policy || i === 0 || i === MAIN.length - 1 ? "#FFFFFF" : "#0B1E3D"}
          >
            {n.title}
          </text>
          <text
            x={MAIN_X + MAIN_W / 2}
            y={y(i) + 39}
            textAnchor="middle"
            fontSize="11"
            fill={n.policy ? "#E7E1FA" : i === 0 || i === MAIN.length - 1 ? "#C9D3E4" : "#64748B"}
          >
            {n.sub}
          </text>
          {n.policy && (
            <text x={MAIN_X + MAIN_W + 12} y={y(i) + NODE_H / 2 + 4} fontSize="11" fontWeight={600} fill="#6C4FD1">
              ← THESIS CONTRIBUTION
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function ArchitectureStacked() {
  return (
    <div className="space-y-2">
      {MAIN.map((n, i) => (
        <div key={n.id}>
          <div
            className={cx(
              "rounded-xl border px-4 py-3 text-center",
              n.policy ? "border-accent bg-accent text-white" : i === 0 || i === MAIN.length - 1 ? "border-navy bg-navy text-white" : "border-navy-2 bg-white text-navy",
            )}
          >
            <p className="text-sm font-semibold">{n.title}</p>
            <p className={cx("text-xs", n.policy || i === 0 || i === MAIN.length - 1 ? "text-white/75" : "text-slate-500")}>{n.sub}</p>
            {(i === EXEC || i === OBSERVE) && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {i === EXEC && (
                  <span className={cx("inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-[11px]", "border-slate-400 text-slate-600")}>
                    <Database className="h-3 w-3" /> Episodic Memory
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-400 px-2 py-0.5 text-[11px] text-slate-600">
                  <Wrench className="h-3 w-3" /> {i === EXEC ? "External Tools" : "Knowledge Sources"}
                </span>
              </div>
            )}
          </div>
          {i < MAIN.length - 1 && <ArrowDown className="mx-auto my-1 h-4 w-4 text-navy-2" />}
        </div>
      ))}
    </div>
  );
}

const MAPPING: [string, string][] = [
  ["User Task", "The fixed 15-step demonstration task served by the backend."],
  ["Task Planning Module", "Simulated planner that emits the 15-step plan; plan validity is tracked as the Plan Status state variable."],
  ["Multi-Agent Execution Module", "Simulated step-by-step execution loop with named simulated tools (e.g. search_api, validator)."],
  ["Monitoring & Evaluation", "Failure injection plus the deterministic failure classifier (8 failure types → categories, severity)."],
  ["State-Aware Adaptive Recovery Policy", "Implemented: reasons over plan status, environment status, context integrity, goal alignment, severity and recovery history."],
  ["Recovery Action / Verification", "Nine recovery actions with simulated outcomes, followed by a verification log step."],
  ["Episodic Memory", "Represented in the prototype only by the failure and recovery history held in the agent state."],
  ["External Tools & Knowledge Sources", "Not connected — tool calls are simulated. A real LLM / tool backend is future work."],
];

export default function ArchitecturePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Research system design"
        title="SAARF System Architecture"
        description="The complete control path from user task through failure detection, state-aware policy selection, recovery verification and outcome routing."
      />

      <Card>
        <CardHeader
          title="Proposed end-to-end architecture"
          subtitle="Control flow, state reasoning and supporting modules. This is the architecture proposed by this thesis; it is not a previously published system."
          right={<Pill tone="accent">Proposed</Pill>}
        />
        <div className="diagram-grid m-3 hidden rounded-lg border border-line/70 p-5 md:block">
          <ArchitectureSvg />
        </div>
        <div className="p-4 md:hidden">
          <ArchitectureStacked />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line px-5 py-3 text-[11.5px] text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-6 bg-navy-2" /> control / data flow
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-6 border-t border-dashed border-slate-400" /> supporting resource access (bidirectional)
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-accent" /> thesis contribution
          </span>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="How this prototype realises the proposed architecture"
          subtitle="The prototype demonstrates the recovery mechanism in a deterministic simulation; several components are simulated or represented minimally."
        />
        <dl className="divide-y divide-line">
          {MAPPING.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[260px_minmax(0,1fr)] sm:gap-6">
              <dt className="text-sm font-semibold text-navy">{k}</dt>
              <dd className="text-sm leading-relaxed text-slate-600">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
