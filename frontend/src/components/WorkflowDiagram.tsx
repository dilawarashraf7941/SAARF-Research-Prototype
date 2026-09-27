"use client";

import { motion } from "framer-motion";
import type { WorkflowNodeId } from "@/lib/presentation";
import { cx } from "./ui";

type NodeTone = "navy" | "danger" | "accent" | "success" | "warning";

interface NodeDef {
  id: WorkflowNodeId;
  label: string;
  sub: string;
  col: 0 | 1;
  row: number;
  tone: NodeTone; // colour used when highlighted
  policy?: boolean;
}

const NODES: NodeDef[] = [
  { id: "user_task", label: "USER TASK", sub: "goal specification", col: 0, row: 0, tone: "navy" },
  { id: "task_planning", label: "TASK PLANNING", sub: "multi-step plan", col: 0, row: 1, tone: "navy" },
  { id: "agent_execution", label: "AGENT EXECUTION", sub: "step + tool invocation", col: 0, row: 2, tone: "navy" },
  { id: "observation", label: "OBSERVATION", sub: "tool / environment output", col: 0, row: 3, tone: "navy" },
  { id: "verify", label: "VERIFY", sub: "output check", col: 0, row: 4, tone: "navy" },
  { id: "state_update", label: "STATE UPDATE", sub: "progress recorded", col: 0, row: 5, tone: "navy" },
  { id: "final_result", label: "FINAL RESULT", sub: "task output", col: 0, row: 6, tone: "success" },
  { id: "failure_detection", label: "FAILURE DETECTION", sub: "identify abnormal signal", col: 1, row: 4, tone: "danger" },
  { id: "failure_classification", label: "FAILURE CLASSIFICATION", sub: "map signal to taxonomy", col: 1, row: 5, tone: "danger" },
  { id: "state_assessment", label: "STATE ASSESSMENT", sub: "plan · environment · context · goal", col: 1, row: 6, tone: "accent" },
  { id: "adaptive_recovery_policy", label: "ADAPTIVE RECOVERY POLICY", sub: "state + history → action", col: 1, row: 7, tone: "accent", policy: true },
  { id: "recovery_action", label: "RECOVERY ACTION", sub: "execute selected action", col: 1, row: 8, tone: "warning" },
  { id: "verification", label: "VERIFICATION", sub: "confirm recovery outcome", col: 1, row: 9, tone: "success" },
  { id: "continue_replan_escalate", label: "CONTINUE / REPLAN / ESCALATE", sub: "route the outcome", col: 1, row: 10, tone: "navy" },
];

const W = 600;
const NODE_W = [224, 244] as const;
const COL_X = [36, 334] as const;
const NODE_H = 44;
const ROW_GAP = 66;
const TOP = 46;
const H = TOP + 10 * ROW_GAP + NODE_H + 22;

const rowY = (row: number) => TOP + row * ROW_GAP;
const nodeBox = (n: NodeDef) => ({ x: COL_X[n.col], y: rowY(n.row), w: NODE_W[n.col], h: NODE_H });

const TONE: Record<NodeTone, { fill: string; stroke: string; text: string; sub: string }> = {
  navy: { fill: "#0B1E3D", stroke: "#0B1E3D", text: "#FFFFFF", sub: "#C9D3E4" },
  danger: { fill: "#DC2626", stroke: "#B91C1C", text: "#FFFFFF", sub: "#FDE2E2" },
  accent: { fill: "#6C4FD1", stroke: "#5B3FC0", text: "#FFFFFF", sub: "#E7E1FA" },
  success: { fill: "#16A34A", stroke: "#15803D", text: "#FFFFFF", sub: "#DCFCE7" },
  warning: { fill: "#D97706", stroke: "#B45309", text: "#FFFFFF", sub: "#FEF3C7" },
};

interface Edge {
  id: string;
  to: WorkflowNodeId;
  d: string;
  label?: { text: string; x: number; y: number; anchor?: "start" | "middle" | "end"; rotate?: boolean };
  variant?: "normal" | "failure" | "return";
}

function buildEdges(): Edge[] {
  const byId = Object.fromEntries(NODES.map((n) => [n.id, nodeBox(n)])) as Record<WorkflowNodeId, ReturnType<typeof nodeBox>>;
  const vertical = (a: WorkflowNodeId, b: WorkflowNodeId): string => {
    const A = byId[a];
    const B = byId[b];
    const x = A.x + A.w / 2;
    return `M ${x} ${A.y + A.h} L ${x} ${B.y - 3}`;
  };
  const spine: WorkflowNodeId[] = ["user_task", "task_planning", "agent_execution", "observation", "verify", "state_update", "final_result"];
  const loop: WorkflowNodeId[] = ["failure_detection", "failure_classification", "state_assessment", "adaptive_recovery_policy", "recovery_action", "verification", "continue_replan_escalate"];
  const edges: Edge[] = [];
  spine.slice(0, -1).forEach((a, i) => edges.push({ id: `${a}-${spine[i + 1]}`, to: spine[i + 1], d: vertical(a, spine[i + 1]) }));
  loop.slice(0, -1).forEach((a, i) => edges.push({ id: `${a}-${loop[i + 1]}`, to: loop[i + 1], d: vertical(a, loop[i + 1]) }));

  // labels on spine
  const v = byId.verify;
  edges.find((e) => e.id === "verify-state_update")!.label = { text: "pass", x: v.x + v.w / 2 + 8, y: v.y + v.h + 14, anchor: "start" };
  const su = byId.state_update;
  edges.find((e) => e.id === "state_update-final_result")!.label = { text: "all steps complete", x: su.x + su.w / 2 + 8, y: su.y + su.h + 14, anchor: "start" };

  // next-step loop: STATE UPDATE -> AGENT EXECUTION (left side)
  const ae = byId.agent_execution;
  edges.push({
    id: "state_update-agent_execution",
    to: "agent_execution",
    d: `M ${su.x} ${su.y + su.h / 2} L ${su.x - 18} ${su.y + su.h / 2} L ${su.x - 18} ${ae.y + ae.h / 2} L ${ae.x - 3} ${ae.y + ae.h / 2}`,
    variant: "return",
    label: { text: "next step", x: su.x - 23, y: (su.y + su.h / 2 + ae.y + ae.h / 2) / 2, anchor: "middle", rotate: true },
  });

  // failure branch: VERIFY -> FAILURE DETECTION
  const fd = byId.failure_detection;
  edges.push({
    id: "verify-failure_detection",
    to: "failure_detection",
    d: `M ${v.x + v.w} ${v.y + v.h / 2} L ${fd.x - 3} ${fd.y + fd.h / 2}`,
    variant: "failure",
    label: { text: "failure", x: (v.x + v.w + fd.x) / 2, y: v.y + v.h / 2 - 7, anchor: "middle" },
  });

  // return: CONTINUE -> AGENT EXECUTION (right side, over the top of the recovery loop)
  const cr = byId.continue_replan_escalate;
  const rx = cr.x + cr.w + 14;
  edges.push({
    id: "continue-agent_execution",
    to: "agent_execution",
    d: `M ${cr.x + cr.w} ${cr.y + cr.h / 2} L ${rx} ${cr.y + cr.h / 2} L ${rx} ${ae.y + ae.h / 2} L ${ae.x + ae.w + 3} ${ae.y + ae.h / 2}`,
    variant: "return",
    label: { text: "resume execution (continue / revised plan)", x: (ae.x + ae.w + rx) / 2 + 6, y: ae.y + ae.h / 2 - 7, anchor: "middle" },
  });
  return edges;
}

const EDGES = buildEdges();

export interface WorkflowDiagramProps {
  /** Nodes to highlight. */
  active: WorkflowNodeId[];
  /** Nodes already traversed according to backend state. */
  completed?: WorkflowNodeId[];
  /** Whether highlighted nodes pulse (live activity) or are simply lit. */
  pulse?: boolean;
  /** Render CONTINUE / REPLAN / ESCALATE in the escalation (red) tone. */
  escalated?: boolean;
  className?: string;
  showLegend?: boolean;
  ariaLabel?: string;
}

export default function WorkflowDiagram({ active, completed = [], pulse = true, escalated, className, showLegend = true, ariaLabel }: WorkflowDiagramProps) {
  const activeSet = new Set(active);
  const completedSet = new Set(completed);
  const recoveryFrame = {
    x: COL_X[1] - 12,
    y: rowY(4) - 30,
    w: NODE_W[1] + 22,
    h: rowY(10) + NODE_H - rowY(4) + 44,
  };
  return (
    <div className={cx("w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block h-auto w-full max-w-[640px]"
        role="img"
        aria-label={ariaLabel ?? `SAARF workflow diagram. Active: ${active.join(", ") || "none"}`}
      >
        <defs>
          {[
            ["arrow", "#94A3B8"],
            ["arrow-active", "#0B1E3D"],
            ["arrow-complete", "#16A34A"],
            ["arrow-failure", "#DC2626"],
            ["arrow-return", "#6C4FD1"],
          ].map(([id, color]) => (
            <marker key={id} id={`wf-${id}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          ))}
        </defs>

        {/* Column captions */}
        <text x={COL_X[0]} y={22} fontSize="10.5" fontWeight={600} letterSpacing="1.4" fill="#64748B">
          EXECUTION LOOP
        </text>

        {/* Recovery loop frame */}
        <rect
          x={recoveryFrame.x}
          y={recoveryFrame.y}
          width={recoveryFrame.w}
          height={recoveryFrame.h}
          rx={16}
          fill="#F4F1FD"
          fillOpacity={0.45}
          stroke="#6C4FD1"
          strokeOpacity={0.35}
          strokeDasharray="5 5"
        />
        <text x={recoveryFrame.x + 14} y={recoveryFrame.y + 18} fontSize="10.5" fontWeight={600} letterSpacing="1.4" fill="#6C4FD1">
          SAARF RECOVERY LOOP
        </text>

        {/* Edges */}
        {EDGES.map((e) => {
          const isActive = activeSet.has(e.to);
          const isCompleted = completedSet.has(e.to);
          const variant = e.variant ?? "normal";
          const color =
            variant === "failure" ? "#DC2626" : variant === "return" ? "#6C4FD1" : isActive ? "#0B1E3D" : isCompleted ? "#16A34A" : "#94A3B8";
          const marker =
            variant === "failure" ? "wf-arrow-failure" : variant === "return" ? "wf-arrow-return" : isActive ? "wf-arrow-active" : isCompleted ? "wf-arrow-complete" : "wf-arrow";
          return (
            <g key={e.id}>
              <path
                d={e.d}
                fill="none"
                stroke={color}
                strokeOpacity={variant === "normal" ? 1 : isActive ? 0.95 : 0.55}
                strokeWidth={isActive ? 1.8 : 1.3}
                strokeDasharray={variant === "return" ? "4 4" : undefined}
                markerEnd={`url(#${marker})`}
              />
              {e.label && (
                <text
                  x={e.label.x}
                  y={e.label.y}
                  textAnchor={e.label.anchor ?? "middle"}
                  fontSize="10"
                  fill={variant === "failure" ? "#B91C1C" : variant === "return" ? "#6C4FD1" : "#64748B"}
                  fontStyle="italic"
                  transform={e.label.rotate ? `rotate(-90 ${e.label.x} ${e.label.y})` : undefined}
                >
                  {e.label.text}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((n) => {
          const b = nodeBox(n);
          const isActive = activeSet.has(n.id);
          const isCompleted = completedSet.has(n.id) && !isActive;
          const toneKey: NodeTone = n.id === "continue_replan_escalate" && escalated ? "danger" : n.tone;
          const t = TONE[toneKey];
          const idleFill = isCompleted ? "#ECFDF3" : n.policy ? "#F4F1FD" : "#FFFFFF";
          const idleStroke = isCompleted ? "#86CFA0" : n.policy ? "#6C4FD1" : "#CBD2DC";
          return (
            <g key={n.id}>
              {isActive && (
                <motion.rect
                  x={b.x - 5}
                  y={b.y - 5}
                  width={b.w + 10}
                  height={b.h + 10}
                  rx={14}
                  fill="none"
                  stroke={t.fill}
                  strokeWidth={2}
                  initial={{ opacity: 0 }}
                  animate={pulse ? { opacity: [0.15, 0.6, 0.15] } : { opacity: 0.35 }}
                  transition={pulse ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
                />
              )}
              <motion.rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={10}
                initial={false}
                animate={{
                  fill: isActive ? t.fill : idleFill,
                  stroke: isActive ? t.stroke : idleStroke,
                }}
                strokeWidth={n.policy ? 1.6 : 1}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
              <motion.text
                x={b.x + b.w / 2}
                y={b.y + 18}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight={650}
                letterSpacing="0.6"
                initial={false}
                animate={{ fill: isActive ? t.text : isCompleted ? "#166534" : n.policy ? "#4C33A8" : "#0B1E3D" }}
                transition={{ duration: 0.35 }}
              >
                {n.label}
              </motion.text>
              <motion.text
                x={b.x + b.w / 2}
                y={b.y + 33}
                textAnchor="middle"
                fontSize="10"
                initial={false}
                animate={{ fill: isActive ? t.sub : isCompleted ? "#4D7C5C" : "#64748B" }}
                transition={{ duration: 0.35 }}
              >
                {n.sub}
              </motion.text>
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-navy" /> active node
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-green-300 bg-green-50" /> completed node
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-accent bg-accent-50" /> adaptive policy (thesis contribution)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 bg-red-600" /> failure path
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-accent" /> return to execution
          </span>
        </div>
      )}
    </div>
  );
}
