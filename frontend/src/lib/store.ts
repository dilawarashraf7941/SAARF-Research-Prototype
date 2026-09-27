"use client";

// Global store for the LIVE shared session only (Dashboard, Run Agent, Agent State, ...).
// Scenario / Committee Demo playback never writes here — those frames come from an
// isolated backend session and are kept in component-local state.
import { create } from "zustand";
import { api, errorMessage } from "./api";
import type { AgentState, LogEntry, SessionSnapshot } from "./types";

interface SessionStore {
  state: AgentState | null;
  logs: LogEntry[];
  hydrated: boolean;
  loading: boolean;
  connectionError: string | null;
  applySnapshot: (snap: SessionSnapshot) => void;
  setState: (state: AgentState) => void;
  hydrate: () => Promise<void>;
  refreshState: () => Promise<void>;
}

export const useSession = create<SessionStore>((set) => ({
  state: null,
  logs: [],
  hydrated: false,
  loading: false,
  connectionError: null,

  applySnapshot: (snap) =>
    set({ state: snap.state, logs: snap.logs, hydrated: true, connectionError: null }),

  setState: (state) => set({ state, connectionError: null }),

  hydrate: async () => {
    set({ loading: true });
    try {
      const snap = await api.getSession();
      set({ state: snap.state, logs: snap.logs, hydrated: true, connectionError: null, loading: false });
    } catch (err) {
      set({ connectionError: errorMessage(err), loading: false, hydrated: true });
    }
  },

  refreshState: async () => {
    try {
      const state = await api.getState();
      set({ state, connectionError: null });
    } catch (err) {
      set({ connectionError: errorMessage(err) });
    }
  },
}));

// ---- Toasts ---------------------------------------------------------------

export type ToastTone = "info" | "success" | "error" | "warning";
export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 0;
export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { ...t, id }].slice(-4) });
    setTimeout(() => get().dismiss(id), t.tone === "error" ? 6500 : 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));

export const toast = {
  info: (title: string, message?: string) => useToasts.getState().push({ tone: "info", title, message }),
  success: (title: string, message?: string) => useToasts.getState().push({ tone: "success", title, message }),
  warning: (title: string, message?: string) => useToasts.getState().push({ tone: "warning", title, message }),
  error: (title: string, message?: string) => useToasts.getState().push({ tone: "error", title, message }),
};

// ---- UI: Committee Demo overlay open flag ---------------------------------

interface UiStore {
  committeeOpen: boolean;
  setCommitteeOpen: (open: boolean) => void;
}

export const useUi = create<UiStore>((set) => ({
  committeeOpen: false,
  setCommitteeOpen: (committeeOpen) => set({ committeeOpen }),
}));
