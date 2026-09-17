import type { ReactNode } from "react";
import type { RiskProfile } from "@/lib/supply-chain/risk";
import type { NodeStatus } from "@/lib/supply-chain/types";

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border border-border bg-surface shadow-panel ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`min-w-0 flex-1 p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export const BAND_LABEL: Record<RiskProfile["band"], string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  severe: "Severe",
};

export const BAND_CLASS: Record<RiskProfile["band"], string> = {
  low: "bg-healthy-soft text-healthy",
  moderate: "bg-accent text-primary",
  elevated: "bg-warning-soft text-warning",
  severe: "bg-danger-soft text-danger",
};

export function RiskPill({ band, score }: { band: RiskProfile["band"]; score?: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BAND_CLASS[band]}`}
    >
      {score !== undefined && <span className="font-mono">{score}</span>}
      {BAND_LABEL[band]}
    </span>
  );
}

export const STATUS_DOT: Record<NodeStatus, string> = {
  healthy: "bg-healthy",
  "at-risk": "bg-warning",
  failed: "bg-danger",
};

export const STATUS_LABEL: Record<NodeStatus, string> = {
  healthy: "Healthy",
  "at-risk": "At risk",
  failed: "Offline",
};

export function StatusBadge({ status }: { status: NodeStatus }) {
  const tone =
    status === "healthy"
      ? "bg-healthy-soft text-healthy"
      : status === "at-risk"
        ? "bg-warning-soft text-warning"
        : "bg-danger-soft text-danger";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "healthy" | "warning" | "danger";
}) {
  const valueTone =
    tone === "healthy"
      ? "text-healthy"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold tracking-tight ${valueTone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Bar({ value, tone = "primary" }: { value: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const bg =
    tone === "danger"
      ? "bg-danger"
      : tone === "warning"
        ? "bg-warning"
        : tone === "healthy"
          ? "bg-healthy"
          : "bg-primary";
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <span className={`block h-full rounded-full ${bg}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

export function scoreTone(score: number) {
  if (score >= 70) return "danger" as const;
  if (score >= 50) return "warning" as const;
  if (score >= 30) return "default" as const;
  return "healthy" as const;
}
