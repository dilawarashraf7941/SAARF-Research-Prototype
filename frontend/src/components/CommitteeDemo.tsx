"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useUi } from "@/lib/store";
import type { Frame } from "@/lib/types";
import ScenarioPlayer from "./ScenarioPlayer";

/**
 * Committee Demo overlay (Section 22). Frames are fetched once per opening from
 * GET /api/scenario/committee-demo and held in local state only — never in the live session store.
 */
export default function CommitteeDemo() {
  const open = useUi((s) => s.committeeOpen);
  const setOpen = useUi((s) => s.setCommitteeOpen);
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .getCommitteeDemo()
      .then((res) => {
        if (!cancelled) {
          setFrames(res.frames);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  const close = useCallback(() => {
    setOpen(false);
    setFrames(null);
    setError(null);
  }, [setOpen]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  return (
    <ScenarioPlayer
      open={open}
      title="Committee Demonstration"
      kicker="Committee Demo"
      frames={frames}
      loading={open && !frames && !error}
      error={error}
      onClose={close}
      onRetry={retry}
    />
  );
}
