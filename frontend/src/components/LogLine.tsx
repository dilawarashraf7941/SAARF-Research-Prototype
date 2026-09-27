"use client";

import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Gauge,
  Info,
  LifeBuoy,
  Radar,
  Siren,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { logLevelStyle } from "@/lib/presentation";
import type { LogEntry, LogLevel } from "@/lib/types";
import { cx } from "./ui";

export const logLevelIcon: Record<LogLevel, LucideIcon> = {
  INFO: Info,
  PLAN: ClipboardList,
  ACTION: Activity,
  TOOL: Wrench,
  ERROR: AlertOctagon,
  DETECTOR: Radar,
  STATE: Gauge,
  POLICY: Cpu,
  RECOVERY: LifeBuoy,
  SUCCESS: CheckCircle2,
  VERIFY: ShieldCheck,
  ESCALATION: Siren,
};

export default function LogLine({ entry, dense, highlight, dark }: { entry: LogEntry; dense?: boolean; highlight?: string; dark?: boolean }) {
  const style = logLevelStyle[entry.level] ?? logLevelStyle.INFO;
  const Icon = logLevelIcon[entry.level] ?? Info;
  return (
    <div
      className={cx(
        "flex items-start gap-3 border-l-[3px] pl-3 pr-2",
        dark ? "bg-slate-950" : "bg-white",
        dense ? "py-1" : "py-1.5",
        style.border,
        entry.level === "ESCALATION" && (dark ? "bg-red-950/30" : "bg-red-50/60"),
      )}
    >
      <span className={cx("shrink-0 pt-px font-mono text-[11px] tabular-nums", dark ? "text-slate-500" : "text-slate-400")}>{entry.timestamp}</span>
      <span className={cx("inline-flex w-[92px] shrink-0 items-center gap-1 pt-px font-mono text-[11px] font-semibold", style.text, dark && "!text-slate-400")}>
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        {entry.level}
      </span>
      <span className={cx("min-w-0 flex-1 break-words text-[13px] leading-snug", dark ? "text-slate-300" : "text-slate-800", entry.level === "ESCALATION" && (dark ? "font-semibold text-red-300" : "font-semibold text-red-900"))}>
        {highlight ? <Highlighted text={entry.message} term={highlight} /> : entry.message}
      </span>
    </div>
  );
}

function Highlighted({ text, term }: { text: string; term: string }) {
  const q = term.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: { s: string; hit: boolean }[] = [];
  let i = 0;
  const ql = q.toLowerCase();
  while (i < text.length) {
    const j = lower.indexOf(ql, i);
    if (j === -1) {
      parts.push({ s: text.slice(i), hit: false });
      break;
    }
    if (j > i) parts.push({ s: text.slice(i, j), hit: false });
    parts.push({ s: text.slice(j, j + q.length), hit: true });
    i = j + q.length;
  }
  return (
    <>
      {parts.map((p, k) =>
        p.hit ? (
          <mark key={k} className="rounded bg-amber-100 px-0.5 text-inherit">
            {p.s}
          </mark>
        ) : (
          <span key={k}>{p.s}</span>
        ),
      )}
    </>
  );
}
