"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToasts, type ToastTone } from "@/lib/store";
import { cx } from "./ui";

const toneStyle: Record<ToastTone, { icon: typeof Info; cls: string; iconCls: string }> = {
  info: { icon: Info, cls: "border-navy-100", iconCls: "text-navy-700" },
  success: { icon: CheckCircle2, cls: "border-green-200", iconCls: "text-green-600" },
  warning: { icon: AlertTriangle, cls: "border-amber-200", iconCls: "text-amber-600" },
  error: { icon: XCircle, cls: "border-red-200", iconCls: "text-red-600" },
};

export default function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const s = toneStyle[t.tone];
          const Icon = s.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cx("pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg shadow-navy/5", s.cls)}
              role={t.tone === "error" ? "alert" : "status"}
            >
              <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", s.iconCls)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">{t.title}</p>
                {t.message && <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{t.message}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded p-0.5 text-slate-400 hover:text-slate-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
