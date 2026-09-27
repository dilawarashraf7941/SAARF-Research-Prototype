"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Filter, Search, X } from "lucide-react";
import { useLiveSession } from "@/lib/hooks";
import { useSession } from "@/lib/store";
import { LOG_LEVELS, logLevelStyle } from "@/lib/presentation";
import type { LogLevel } from "@/lib/types";
import LogLine from "@/components/LogLine";
import { Card, PageHeader, cx } from "@/components/ui";

const POLL_MS = 3000;
const STICK_THRESHOLD_PX = 48;

export default function ExecutionLogsPage() {
  useLiveSession("session");
  const logs = useSession((s) => s.logs);
  const hydrate = useSession((s) => s.hydrate);

  const [levels, setLevels] = useState<Set<LogLevel>>(new Set());
  const [query, setQuery] = useState("");
  const [stick, setStick] = useState(true);
  const [seenCount, setSeenCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Light polling so the viewer stays live while open (session is shared server-side).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void hydrate();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [hydrate]);

  const counts = useMemo(() => {
    const c = {} as Record<LogLevel, number>;
    LOG_LEVELS.forEach((l) => (c[l] = 0));
    logs.forEach((l) => (c[l.level] = (c[l.level] ?? 0) + 1));
    return c;
  }, [logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => (levels.size === 0 || levels.has(l.level)) && (!q || l.message.toLowerCase().includes(q) || l.level.toLowerCase().includes(q)));
  }, [logs, levels, query]);

  // Auto-scroll only while the user is at the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick) el.scrollTop = el.scrollHeight;
  }, [filtered.length, stick]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
    if (atBottom !== stick) {
      setStick(atBottom);
      if (!atBottom) setSeenCount(filtered.length);
    }
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setStick(true);
  };

  const toggleLevel = (l: LogLevel) =>
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });

  const newCount = stick ? 0 : Math.max(0, filtered.length - seenCount);

  return (
    <div>
      <PageHeader
        eyebrow="Observability"
        title="Execution Logs"
        description="Append-only log of the live session: planning, tool calls, failure detection, state assessment, policy decisions, recovery and verification."
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search log messages…"
              aria-label="Search log messages"
              className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </label>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Levels
            </span>
            {LOG_LEVELS.map((l) => {
              const on = levels.has(l);
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLevel(l)}
                  aria-pressed={on}
                  title={logLevelStyle[l].description}
                  className={cx(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors",
                    on ? cx(logLevelStyle[l].chip, "border-current") : "border-line bg-white text-slate-500 hover:border-slate-300",
                  )}
                >
                  {l}
                  <span className="font-normal opacity-60">{counts[l]}</span>
                </button>
              );
            })}
            {(levels.size > 0 || query) && (
              <button
                type="button"
                onClick={() => {
                  setLevels(new Set());
                  setQuery("");
                }}
                className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card className="relative overflow-hidden border-slate-800 bg-slate-950 shadow-[0_18px_50px_rgba(7,21,37,0.18)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-5 py-2.5 text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{filtered.length}</strong> of {logs.length} entries
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cx("h-1.5 w-1.5 rounded-full", stick ? "bg-green-600" : "bg-slate-300")} />
            {stick ? "Following latest" : "Auto-scroll paused"}
          </span>
        </div>
        <div ref={scrollRef} onScroll={onScroll} className="thin-scroll h-[calc(100vh-340px)] min-h-[440px] space-y-px overflow-y-auto bg-slate-950 p-2">
          {filtered.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <Search className="mb-3 h-5 w-5 text-slate-600" />
              <p className="font-mono text-xs text-slate-400">{logs.length === 0 ? "No log entries yet" : "No entries match the current filters"}</p>
            </div>
          ) : (
            filtered.map((l) => (
              <motion.div key={l.index} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="flex items-stretch">
                <span className="w-10 shrink-0 select-none pr-2 pt-1.5 text-right font-mono text-[10px] text-slate-300">{l.index}</span>
                <div className="min-w-0 flex-1 overflow-hidden rounded">
                  <LogLine entry={l} highlight={query} dark />
                </div>
              </motion.div>
            ))
          )}
        </div>
        <AnimatePresence>
          {!stick && (
            <motion.button
              type="button"
              onClick={jumpToLatest}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-navy-2"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Jump to latest{newCount > 0 ? ` (${newCount} new)` : ""}
            </motion.button>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
