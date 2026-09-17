import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, BookOpen, Layers, ShieldAlert, Sparkles } from "lucide-react";

import { FlowGuideModal } from "@/components/supply-chain/FlowGuideModal";
import { KpiCards } from "@/components/supply-chain/KpiCards";
import {
  Bar as MiniBar,
  Panel,
  RiskPill,
  StatusBadge,
  scoreTone,
} from "@/components/supply-chain/Panel";
import { failureImpacts, tierStats } from "@/lib/supply-chain/derive";
import { useSupply } from "@/lib/supply-chain/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Nexus Risk Supply Chain Control Tower" },
      {
        name: "description",
        content:
          "Executive overview of supply chain posture: network health, weighted risk index, critical alerts and the entities that carry the most downstream volume.",
      },
      { property: "og:title", content: "Overview — Nexus Risk Supply Chain Control Tower" },
      {
        property: "og:description",
        content:
          "Network health, weighted risk index, critical alerts and single-point-of-failure ranking in one view.",
      },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { network, activeChain, risk, result, kpis, alerts } = useSupply();
  const [guideOpen, setGuideOpen] = useState(false);

  const tiers = useMemo(() => tierStats(network, risk, result), [network, risk, result]);
  const impacts = useMemo(() => failureImpacts(network).slice(0, 6), [network]);
  const topRisk = useMemo(
    () => [...network.nodes].sort((a, b) => b.risk_score - a.risk_score).slice(0, 7),
    [network],
  );
  const criticalAlerts = alerts.filter((a) => a.severity !== "info").slice(0, 6);

  const tierPipeline = useMemo(() => {
    const raw = network.nodes.filter((n) => n.type === "raw");
    const comp = network.nodes.filter((n) => n.type === "component");
    const sub = network.nodes.filter((n) => n.type === "subassembly");
    const fac = network.nodes.filter((n) => n.type === "factory");
    const dist = network.nodes.filter((n) => n.type === "distribution");

    return [
      {
        tier: "Tier 3: Raw Inputs",
        count: raw.length,
        desc:
          raw
            .slice(0, 2)
            .map((n) => n.label.split(" ")[0])
            .join(", ") + "...",
      },
      {
        tier: "Tier 2: Components",
        count: comp.length,
        desc:
          comp
            .slice(0, 2)
            .map((n) => n.label.split(" ")[0])
            .join(", ") + "...",
      },
      {
        tier: "Tier 1: Sub-Assemblies",
        count: sub.length,
        desc:
          sub
            .slice(0, 2)
            .map((n) => n.label.split(" ")[0])
            .join(", ") + "...",
      },
      {
        tier: "Assembly Plants",
        count: fac.length,
        desc: fac.map((n) => n.region.split(",")[0]).join(", "),
      },
      {
        tier: "Distribution Hubs",
        count: dist.length,
        desc: dist.map((n) => n.region.split(",")[0]).join(", "),
      },
    ];
  }, [network.nodes]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">{activeChain.name}</h1>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {activeChain.industry}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {network.nodes.length} mapped real-world entities · {network.links.length} trade flows ·
            derived from observable telemetry
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 hover:text-indigo-900 shadow-xs"
          >
            <BookOpen className="size-3.5 text-indigo-600" />
            How the network works
          </button>
          <Link
            to="/network"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 shadow-xs"
          >
            Open network map <ArrowRight className="size-3.5" />
          </Link>
          <Link
            to="/scenarios"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-muted shadow-xs"
          >
            Run a scenario
          </Link>
        </div>
      </div>

      {/* 5-Tier Interactive Material Flow Quick-Strip */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-indigo-100 text-indigo-700">
              <Layers className="size-3.5" />
            </span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Physical Supply Chain Value Chain &middot; {activeChain.shortName}
            </span>
          </div>
          <button
            onClick={() => setGuideOpen(true)}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
          >
            Explore failure propagation & risk formulas <ArrowRight className="size-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {tierPipeline.map((item) => (
            <div
              key={item.tier}
              onClick={() => setGuideOpen(true)}
              className="cursor-pointer rounded-lg border border-slate-200/80 bg-white p-2 text-left transition-all hover:border-indigo-300 hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-900 truncate">{item.tier}</span>
                <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {item.count}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 truncate">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <KpiCards kpis={kpis} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Average risk by tier"
          subtitle="Model score per tier, 0-100"
          className="xl:col-span-2"
        >
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tiers} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.92 0.01 255)"
                  vertical={false}
                />
                <XAxis dataKey="short" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid oklch(0.92 0.01 255)",
                  }}
                  formatter={(v: number) => [`${v}`, "Avg risk"]}
                />
                <Bar dataKey="avgRisk" radius={[4, 4, 0, 0]}>
                  {tiers.map((t) => (
                    <Cell
                      key={t.tier}
                      fill={t.avgRisk >= 70 ? "#c0322b" : t.avgRisk >= 50 ? "#e08300" : "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {tiers.map((t) => (
              <li key={t.tier} className="rounded-lg border border-border bg-surface-muted p-2.5">
                <p className="truncate text-[11px] font-medium text-foreground">{t.short}</p>
                <p className="font-mono text-sm">{t.nodes} entities</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.volume.toLocaleString()} u/wk · {t.offline} offline
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Highest scoring entities"
          subtitle="Composite risk, descending"
          actions={
            <Link to="/suppliers" className="text-xs font-medium text-primary hover:underline">
              All suppliers
            </Link>
          }
        >
          <ul className="space-y-2">
            {topRisk.map((n) => (
              <li key={n.id}>
                <Link
                  to="/suppliers/$id"
                  params={{ id: n.id }}
                  className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-medium">{n.label}</span>
                    <RiskPill band={risk[n.id]!.band} score={n.risk_score} />
                  </div>
                  <div className="mt-1.5">
                    <MiniBar value={n.risk_score} tone={scoreTone(n.risk_score)} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {n.region} · {n.volume.toLocaleString()} u/wk
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Open alerts"
          subtitle={`${alerts.length} findings from the live model`}
          actions={
            <Link to="/alerts" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {criticalAlerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No critical or warning findings under the current scenario.
            </p>
          ) : (
            <ul className="space-y-2">
              {criticalAlerts.map((a) => (
                <li
                  key={a.id}
                  className="flex gap-2.5 rounded-lg border border-border bg-surface-muted p-2.5"
                >
                  <span
                    className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ${
                      a.severity === "critical"
                        ? "bg-danger-soft text-danger"
                        : "bg-warning-soft text-warning"
                    }`}
                  >
                    {a.severity === "critical" ? (
                      <AlertTriangle className="size-3.5" />
                    ) : (
                      <ShieldAlert className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{a.title}</span>
                    <span className="block text-[11px] text-muted-foreground">{a.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Single points of failure"
          subtitle="Downstream volume exposed if this one entity stops"
        >
          <ul className="space-y-2">
            {impacts.map((i) => (
              <li
                key={i.node.id}
                className="rounded-lg border border-border bg-surface-muted p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to="/suppliers/$id"
                    params={{ id: i.node.id }}
                    className="min-w-0 truncate text-xs font-medium hover:underline"
                  >
                    {i.node.label}
                  </Link>
                  <StatusBadge status={result.statuses[i.node.id] ?? "healthy"} />
                </div>
                <div className="mt-1.5">
                  <MiniBar
                    value={i.volumeShare * 100}
                    tone={
                      i.volumeShare > 0.4 ? "danger" : i.volumeShare > 0.2 ? "warning" : "primary"
                    }
                  />
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {Math.round(i.volumeShare * 100)}% of network volume · {i.downstreamNodes}{" "}
                  downstream entities
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <FlowGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
