import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Info, ShieldAlert, Star } from "lucide-react";

import { Metric, Panel, RiskPill, StatusBadge } from "@/components/supply-chain/Panel";
import type { RiskAlert, Severity } from "@/lib/supply-chain/derive";
import { useSupply } from "@/lib/supply-chain/store";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Watchlist — Threshold Findings" },
      {
        name: "description",
        content:
          "Live findings generated from the risk model: offline and degraded entities, sole-sourced dependencies, severe scores, capacity saturation and high-instability regions.",
      },
      { property: "og:title", content: "Alerts & Watchlist — Threshold Findings" },
      {
        property: "og:description",
        content:
          "Every threshold breach in one queue, plus a starred watchlist of the entities you track.",
      },
    ],
  }),
  component: AlertsPage,
});

const CATEGORY_LABEL: Record<RiskAlert["category"], string> = {
  status: "Operational status",
  concentration: "Sourcing concentration",
  score: "Model score",
  capacity: "Capacity",
  geo: "Geopolitical",
  watchlist: "Watchlist",
};

function AlertsPage() {
  const { network, risk, result, alerts, watchlist, toggleWatch } = useSupply();
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [category, setCategory] = useState<RiskAlert["category"] | "all">("all");

  const filtered = useMemo(
    () =>
      alerts.filter(
        (a) =>
          (severity === "all" || a.severity === severity) &&
          (category === "all" || a.category === category),
      ),
    [alerts, severity, category],
  );

  const counts = useMemo(
    () => ({
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    }),
    [alerts],
  );

  const watched = network.nodes.filter((n) => watchlist.has(n.id));

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Alerts & watchlist</h1>
        <p className="text-xs text-muted-foreground">
          {alerts.length} findings recomputed on every scenario, data edit and model change.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric
          label="Critical"
          value={`${counts.critical}`}
          sub="Immediate escalation"
          tone="danger"
        />
        <Metric
          label="Warnings"
          value={`${counts.warning}`}
          sub="Mitigation required"
          tone="warning"
        />
        <Metric label="Informational" value={`${counts.info}`} sub="Monitor" />
        <Metric label="Watched entities" value={`${watched.length}`} sub="Starred by you" />
      </div>

      <Panel bodyClassName="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="filter-alert-severity"
            name="alertSeverity"
            aria-label="Filter alerts by severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity | "all")}
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-primary"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Informational</option>
          </select>
          <select
            id="filter-alert-category"
            name="alertCategory"
            aria-label="Filter alerts by category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RiskAlert["category"] | "all")}
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-primary"
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} of {alerts.length}
          </span>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Finding queue" bodyClassName="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing matches these filters.</p>
          ) : (
            filtered.map((a) => (
              <div
                key={a.id}
                className="flex gap-3 rounded-lg border border-border bg-surface-muted p-3"
              >
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-md ${
                    a.severity === "critical"
                      ? "bg-danger-soft text-danger"
                      : a.severity === "warning"
                        ? "bg-warning-soft text-warning"
                        : "bg-accent text-primary"
                  }`}
                >
                  {a.severity === "critical" ? (
                    <AlertTriangle className="size-3.5" />
                  ) : a.severity === "warning" ? (
                    <ShieldAlert className="size-3.5" />
                  ) : (
                    <Info className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold">{a.title}</p>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {CATEGORY_LABEL[a.category]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{a.detail}</p>
                  {a.nodeId && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Link
                        to="/suppliers/$id"
                        params={{ id: a.nodeId }}
                        className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
                      >
                        Open profile
                      </Link>
                      <button
                        onClick={() => toggleWatch(a.nodeId!)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                          watchlist.has(a.nodeId)
                            ? "border-warning bg-warning-soft text-warning"
                            : "border-border bg-surface hover:bg-muted"
                        }`}
                      >
                        <Star
                          className={`size-3 ${watchlist.has(a.nodeId) ? "fill-current" : ""}`}
                        />
                        {watchlist.has(a.nodeId) ? "Watching" : "Watch"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </Panel>

        <Panel title="Watchlist" subtitle="Starred entities, tracked across every page">
          {watched.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing starred yet. Star entities from the directory, a profile or an alert.
            </p>
          ) : (
            <ul className="space-y-2">
              {watched.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-border bg-surface-muted px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to="/suppliers/$id"
                      params={{ id: n.id }}
                      className="min-w-0 truncate text-xs font-medium hover:underline"
                    >
                      {n.label}
                    </Link>
                    <button
                      onClick={() => toggleWatch(n.id)}
                      aria-label="Remove from watchlist"
                      className="text-warning"
                    >
                      <Star className="size-3.5 fill-current" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <RiskPill band={risk[n.id]!.band} score={n.risk_score} />
                    <StatusBadge status={result.statuses[n.id] ?? "healthy"} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
