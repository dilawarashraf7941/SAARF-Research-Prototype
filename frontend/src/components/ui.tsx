"use client";

import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, FlaskConical, Info, Loader2, XCircle } from "lucide-react";
import { toneClasses, toneDot, type Tone } from "@/lib/presentation";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ---- Card -----------------------------------------------------------------

export function Card({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <As className={cx("lab-shadow rounded-xl border border-line bg-white", className)}>{children}</As>;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  right,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 text-navy-700">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-navy">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

// ---- Pills / badges -------------------------------------------------------

export function Pill({
  tone = "neutral",
  children,
  dot,
  className,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.01em] ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", toneDot[tone])} />}
      {children}
    </span>
  );
}

/** Mandatory research-integrity tag for any number produced by the deterministic simulation. */
export function SimTag({ label = "Simulation", className }: { label?: "Simulation" | "Demo Simulation"; className?: string }) {
  return (
    <span
      title="Produced by the deterministic simulation engine — not a real measurement."
      className={cx(
        "inline-flex items-center gap-1 rounded-md border border-dashed border-amber-500/60 bg-amber-50/70 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-amber-800",
        className,
      )}
    >
      <FlaskConical className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

// ---- Tooltip --------------------------------------------------------------

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "center" | "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const alignCls = align === "center" ? "left-1/2 -translate-x-1/2" : align === "start" ? "left-0" : "right-0";
  return (
    <span
      className={cx("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={cx(
              "pointer-events-none absolute z-50 w-64 max-w-[80vw] rounded-lg bg-navy px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-white shadow-lg",
              side === "top" ? "bottom-full mb-2" : "top-full mt-2",
              alignCls,
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function InfoTip({ content, align = "center", side = "top" }: { content: ReactNode; align?: "center" | "start" | "end"; side?: "top" | "bottom" }) {
  return (
    <Tooltip content={content} align={align} side={side}>
      <button
        type="button"
        aria-label="More information"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-navy focus:text-navy focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}

// ---- Progress -------------------------------------------------------------

export function ProgressBar({
  value,
  max = 100,
  tone = "navy",
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: "navy" | "accent" | "success" | "warning" | "danger";
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors = {
    navy: "bg-navy-700",
    accent: "bg-accent",
    success: "bg-green-600",
    warning: "bg-amber-500",
    danger: "bg-red-600",
  } as const;
  return (
    <div
      className={cx("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <motion.div
        className={cx("h-full rounded-full", colors[tone])}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
      />
    </div>
  );
}

// ---- Buttons --------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-navy text-white hover:bg-navy-2 border border-navy shadow-sm",
    accent: "bg-accent text-white hover:bg-[#5748c6] border border-accent shadow-sm",
    secondary: "bg-white text-navy border border-line hover:border-navy-100 hover:bg-navy-50 shadow-sm",
    ghost: "bg-transparent text-slate-600 border border-transparent hover:bg-slate-100",
    danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
  };
  const sizes = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-9 px-4 text-sm gap-2" };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center rounded-md font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ---- Page header ----------------------------------------------------------

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.035em] text-navy">{title}</h1>
        {description && <p className="mt-1 max-w-[72ch] text-[13px] leading-relaxed text-slate-600">{description}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

// ---- Banner ---------------------------------------------------------------

export function Banner({
  tone,
  title,
  children,
  action,
  className,
}: {
  tone: "info" | "warning" | "danger" | "success";
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-navy-100 bg-navy-50 text-navy",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-green-200 bg-green-50 text-green-900",
  }[tone];
  const Icon = { info: Info, warning: AlertTriangle, danger: XCircle, success: CheckCircle2 }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cx("flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3", styles, className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </motion.div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-canvas text-slate-400">{icon}</div>
      <p className="text-sm font-semibold text-navy">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Label({ children, tip }: { children: ReactNode; tip?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {children}
      {tip && <InfoTip content={tip} />}
    </span>
  );
}
