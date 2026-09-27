"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Cpu,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Menu,
  Network,
  PlayCircle,
  Presentation,
  RefreshCw,
  ScrollText,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { api, API_BASE, errorMessage } from "@/lib/api";
import { toast, useSession, useUi } from "@/lib/store";
import { statusTone } from "@/lib/presentation";
import CommitteeDemo from "./CommitteeDemo";
import Toaster from "./Toaster";
import { Button, Pill, Tooltip, cx } from "./ui";

export const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Execution",
    items: [
      { href: "/run-agent", label: "Run Agent", icon: PlayCircle },
      { href: "/inject-failure", label: "Inject Failure", icon: Zap },
    ],
  },
  {
    label: "Observability",
    items: [
      { href: "/agent-state", label: "Agent State", icon: Gauge },
      { href: "/recovery-policy", label: "Recovery Policy", icon: Cpu },
      { href: "/execution-logs", label: "Execution Logs", icon: ScrollText },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/architecture", label: "Architecture", icon: Network },
      { href: "/experiments", label: "Experiments", icon: FlaskConical },
      { href: "/research-info", label: "Research Info", icon: BookOpen },
    ],
  },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const hydrate = useSession((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-navy/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <SidebarContent pathname={pathname} onNavigate={() => setDrawerOpen(false)} onClose={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[248px]">
        <Header onMenu={() => setDrawerOpen(true)} />
        <ConnectionBanner />
        <main className="mx-auto w-full min-w-0 max-w-[1560px] flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-6 2xl:px-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="border-t border-line bg-white/60 px-4 py-3 text-center text-[10px] uppercase tracking-[0.08em] text-slate-500 sm:px-8">
          SAARF research prototype · MSc thesis demonstration · deterministic simulation engine (no LLM calls)
        </footer>
      </div>

      <CommitteeDemo />
      <Toaster />
    </div>
  );
}

function SidebarContent({ pathname, onNavigate, onClose }: { pathname: string; onNavigate?: () => void; onClose?: () => void }) {
  const state = useSession((s) => s.state);
  const connectionError = useSession((s) => s.connectionError);
  return (
    <div className="instrument-grid relative flex h-full flex-col overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-accent via-blue-500/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-28 left-[5px] font-mono text-[7px] font-bold tracking-[0.22em] text-white/15 [writing-mode:vertical-rl]">
        SYSTEM
      </div>
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] shadow-[inset_0_0_18px_rgba(102,87,217,0.12)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <circle cx="6" cy="6" r="2.2" fill="#fff" />
              <circle cx="18" cy="6" r="2.2" fill="#fff" fillOpacity=".55" />
              <circle cx="12" cy="18" r="2.6" fill="#8E77E6" />
              <path d="M6 8.2 L11 16 M18 8.2 L13 16 M8.2 6 H15.8" stroke="#fff" strokeOpacity=".6" strokeWidth="1.3" fill="none" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-[0.16em]">SAARF</p>
            <p className="text-[10px] text-white/50">Research Prototype <span className="text-white/75">v0.1</span></p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-md p-1.5 text-white/70 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="thin-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex > 0 ? "mt-5" : ""}>
            <p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.19em] text-white/35">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "relative flex items-center gap-3 rounded-md px-3 py-[7px] text-[13px] transition-colors",
                        active ? "bg-white/[0.09] font-semibold text-white" : "text-white/62 hover:bg-white/[0.045] hover:text-white/90",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-indicator"
                          className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-[#9185f4] shadow-[0_0_10px_rgba(145,133,244,0.65)]"
                          transition={{ duration: 0.22, ease: "easeOut" }}
                        />
                      )}
                      <Icon className={cx("h-[15px] w-[15px] shrink-0", active ? "text-[#b6adff]" : "text-white/45")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="m-3 rounded-lg border border-white/[0.09] bg-white/[0.045] p-3.5 text-xs backdrop-blur-sm">
        <p className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em] text-white/42">
          Live system <span className="font-mono text-[9px] text-white/25">SYS/01</span>
        </p>
        {connectionError ? (
          <p className="flex items-center gap-1.5 text-red-300">
            <WifiOff className="h-3.5 w-3.5" /> Backend unreachable
          </p>
        ) : state ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/60">Status</span>
              <Pill tone={statusTone(state.taskStatus)} dot className="!ring-0">
                {state.taskStatus === "Paused - Failure Detected" ? "Paused" : state.taskStatus}
              </Pill>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/60">Step</span>
              <span className="font-mono tabular-nums">
                {state.currentStep} / {state.totalSteps}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-white/50">Connecting…</p>
        )}
      </div>
    </div>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const applySnapshot = useSession((s) => s.applySnapshot);
  const connectionError = useSession((s) => s.connectionError);
  const setCommitteeOpen = useUi((s) => s.setCommitteeOpen);
  const [resetting, setResetting] = useState(false);

  const newTask = async () => {
    setResetting(true);
    try {
      const snap = await api.resetSession();
      applySnapshot(snap);
      toast.success("New demonstration task started", "Session reset to step 1 — status: Executing.");
      router.push("/");
    } catch (err) {
      toast.error("Could not reset the task", errorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 shadow-[0_1px_10px_rgba(7,21,37,0.035)] backdrop-blur-xl">
      <div className="flex min-h-[62px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-7 2xl:px-9">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="-ml-1 rounded-lg p-2 text-navy hover:bg-navy-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <p className="text-[17px] font-bold leading-none tracking-[0.12em] text-navy">SAARF</p>
            <p className="hidden text-[11px] font-semibold leading-tight text-navy-700 sm:block">State-Aware Adaptive Recovery Policy</p>
          </div>
          <p className="mt-0.5 text-[10px] leading-tight text-slate-500 sm:hidden">State-Aware Adaptive Recovery Policy</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={connectionError ? "danger" : "success"} dot title={connectionError ? "The backend session is currently unreachable." : "The backend session is reachable and the research control centre is online."}>
              {connectionError ? "System Offline" : "System Online"}
            </Pill>
            <Pill tone="warning" dot title="All execution is produced by a deterministic simulation engine; no LLM is called.">
              Simulation Mode
            </Pill>
            <Tooltip
              align="end"
              side="bottom"
              content="A real LLM / LangGraph execution backend can be connected later behind the same API contract, without changing this user interface. Not available in this prototype."
            >
              <span
                tabIndex={0}
                aria-disabled="true"
                className="hidden cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 xl:inline-flex"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                LLM Mode — Coming Soon
              </span>
            </Tooltip>
          </div>
          <span className="mx-1 hidden h-6 w-px bg-line md:block" />
          <Button
            size="sm"
            onClick={newTask}
            loading={resetting}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            title="Reset the live demonstration task to step 1 (POST /api/session/reset)"
          >
            New Task
          </Button>
          <Button
            size="sm"
            variant="accent"
            onClick={() => setCommitteeOpen(true)}
            icon={<Presentation className="h-3.5 w-3.5" />}
            title="Open the guided, full-screen committee walkthrough (scripted replay; does not change the live task)"
          >
            Committee Demo
          </Button>
        </div>
      </div>
    </header>
  );
}

function ConnectionBanner() {
  const connectionError = useSession((s) => s.connectionError);
  const hydrate = useSession((s) => s.hydrate);
  if (!connectionError) return null;
  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 sm:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <strong>Backend not reachable.</strong> Start the FastAPI server at <code className="font-mono text-xs">{API_BASE}</code>, then retry.
        </span>
        <Button size="sm" variant="danger" onClick={() => void hydrate()} icon={<RefreshCw className="h-3.5 w-3.5" />}>
          Retry
        </Button>
      </div>
    </div>
  );
}
