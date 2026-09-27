"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./api";
import { toast, useSession } from "./store";
import type { SessionSnapshot } from "./types";

/** Re-hydrate the live session when the page mounts and whenever the tab regains focus. */
export function useLiveSession(mode: "session" | "state" = "session") {
  const hydrate = useSession((s) => s.hydrate);
  const refreshState = useSession((s) => s.refreshState);
  useEffect(() => {
    const run = mode === "session" ? hydrate : refreshState;
    void run();
    const onFocus = () => void run();
    const onVis = () => {
      if (document.visibilityState === "visible") void run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hydrate, refreshState, mode]);
}

/** Execute a recovery action (policy's choice when `action` is undefined) and report the outcome. */
export function useRecoveryExecution(onDone?: (snap: SessionSnapshot) => void) {
  const applySnapshot = useSession((s) => s.applySnapshot);
  const [executing, setExecuting] = useState(false);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const execute = useCallback(
    async (action?: string, simulateOutcome?: "Success" | "Failed") => {
      setExecuting(true);
      try {
        const snap = await api.executeRecovery(action, simulateOutcome);
        applySnapshot(snap);
        const st = snap.state;
        if (st.taskStatus === "Escalated") {
          toast.error("Escalated to a human operator", "Autonomous recovery stopped. Use New Task to reset the demonstration.");
        } else if (st.lastRecoveryOutcome === "Failed" && st.activeDecision) {
          toast.warning(
            "Recovery attempt failed",
            `The policy re-evaluated using the updated recovery history and now selects ${st.activeDecision.selectedActionLabel}.`,
          );
        } else if (st.lastRecoveryOutcome === "Success") {
          toast.success("Recovery succeeded", "Verification passed; execution has resumed.");
        }
        doneRef.current?.(snap);
        return snap;
      } catch (err) {
        toast.error("Recovery could not be executed", errorMessage(err));
        return null;
      } finally {
        setExecuting(false);
      }
    },
    [applySnapshot],
  );

  return { execute, executing };
}
