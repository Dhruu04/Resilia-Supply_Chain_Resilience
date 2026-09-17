import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
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
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Hourglass,
  Lightbulb,
  MapPin,
  Network,
  Power,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
} from "lucide-react";

import {
  Bar as MiniBar,
  Metric,
  Panel,
  RiskPill,
  StatusBadge,
  scoreTone,
} from "@/components/supply-chain/Panel";
import { countryName } from "@/lib/supply-chain/derive";
import {
  FACTOR_KEYS,
  FACTOR_LABEL,
  countryOf,
  countryRisk,
  inboundConcentration,
} from "@/lib/supply-chain/risk";
import { directNeighbors, downstreamOf } from "@/lib/supply-chain/simulation";
import { useSupply } from "@/lib/supply-chain/store";
import { TIER_LABEL } from "@/lib/supply-chain/types";

export const Route = createFileRoute("/suppliers/$id")({
  head: () => ({
    meta: [
      { title: "Entity Risk Profile — Nexus Risk" },
      {
        name: "description",
        content:
          "Full risk profile for a single supply chain entity: seven-factor breakdown, likelihood and impact split, upstream and downstream dependencies, and failure simulation.",
      },
      { property: "og:title", content: "Entity Risk Profile — Nexus Risk" },
      {
        property: "og:description",
        content:
          "Seven-factor risk breakdown, dependency map and one-click failure simulation for a single entity.",
      },
    ],
  }),
  component: SupplierDetail,
});

function SupplierDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { network, risk, result, offline, watchlist, toggleWatch, toggleFailure } = useSupply();

  const node = network.nodes.find((n) => n.id === id);
  const profile = node ? risk[node.id] : undefined;

  const neighbors = useMemo(
    () => (node ? directNeighbors(network, node.id) : { suppliers: [], customers: [] }),
    [network, node],
  );
  const downstream = useMemo(() => (node ? downstreamOf(network, node.id) : []), [network, node]);

  const downstreamVolume = useMemo(
    () => downstream.reduce((s, n) => s + n.volume, 0),
    [downstream],
  );

  // Financial blast radius ($/week exposed downstream)
  const financialBlastRadiusM = useMemo(() => {
    if (!node) return 0;
    const factoryOrDcDownstream = downstream.filter(
      (n) => n.type === "factory" || n.type === "distribution",
    );
    const vol = factoryOrDcDownstream.reduce((s, n) => s + n.volume, 0);
    return Math.round(((vol * 1250) / 1_000_000) * 10) / 10;
  }, [node, downstream]);

  // Derived Actionable Mitigation Recommendations
  const recommendations = useMemo(() => {
    if (!node || !profile) return [];
    const recs: {
      title: string;
      desc: string;
      urgency: "high" | "medium" | "low";
      icon: React.ComponentType<{ className?: string }>;
    }[] = [];

    if (profile.factors.geopolitical >= 0.6) {
      recs.push({
        title: "Geopolitical Redundancy Qualification",
        desc: `Operating in high-instability jurisdiction (${countryName(countryOf(node.region))}). Accelerate secondary supplier onboarding in North America or EMEA to mitigate trade/export embargo exposure.`,
        urgency: "high",
        icon: ShieldAlert,
      });
    }

    if (profile.factors.concentration >= 0.6) {
      recs.push({
        title: "Split-Allocation Dual Sourcing",
        desc: `Inbound supply exhibits severe concentration (HHI ${inboundConcentration(network.links, node.id).toFixed(2)}). Transition from sole-source to a 65/35 dual-allocation model.`,
        urgency: "high",
        icon: Network,
      });
    }

    if (node.bufferDays <= 8) {
      recs.push({
        title: "Safety Stock Buffer Expansion",
        desc: `Current inventory buffer of ${node.bufferDays} days is below the 14-day threshold required to absorb replenishment lead time (${node.leadTimeDays} days). Increase regional safety stock reserve.`,
        urgency: "high",
        icon: Hourglass,
      });
    }

    if (node.capacityUtilization >= 0.88) {
      recs.push({
        title: "Surge Capacity Agreement",
        desc: `Utilization is at ${(node.capacityUtilization * 100).toFixed(0)}%, leaving near-zero surge headroom. Negotiate pre-booked overtime line commitments or overflow capacity SLAs.`,
        urgency: "medium",
        icon: Sparkles,
      });
    }

    if (node.financialHealth < 60) {
      recs.push({
        title: "Financial Liquidity Monitoring",
        desc: `Supplier credit score is ${node.financialHealth.toFixed(0)}/100. Institute quarterly balance-sheet reviews and vendor-managed inventory (VMI) terms to prevent insolvency surprise.`,
        urgency: "medium",
        icon: DollarSign,
      });
    }

    if (recs.length === 0) {
      recs.push({
        title: "Nominal Performance Routine",
        desc: "All operational, geographic, and financial parameters are well within control limits. Maintain standard annual vendor audit cycle.",
        urgency: "low",
        icon: CheckCircle2,
      });
    }

    return recs;
  }, [node, profile, network]);

  if (!node || !profile) {
    return (
      <div className="p-6">
        <Panel title="Entity not found">
          <p className="text-xs text-muted-foreground">
            No entity with code <span className="font-mono">{id}</span> exists in the current
            network.
          </p>
          <Link
            to="/suppliers"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-3.5" /> Back to directory
          </Link>
        </Panel>
      </div>
    );
  }

  const isOffline = offline.has(node.id);
  const status = result.statuses[node.id] ?? "healthy";
  const fulfilment = Math.round((result.capability[node.id] ?? 1) * 100);
  const hhi = inboundConcentration(network.links, node.id);

  const factorData = FACTOR_KEYS.map((k) => ({
    name: FACTOR_LABEL[k],
    value: Math.round(profile.factors[k] * 100),
  }));

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/suppliers"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Supplier directory
          </Link>
          <h1 className="mt-1 truncate text-xl font-bold tracking-tight text-foreground">
            {node.label}
          </h1>
          <p className="text-xs text-muted-foreground">
            {TIER_LABEL[node.type]} · {node.region} ({countryName(countryOf(node.region))}) ·{" "}
            <span className="font-mono font-semibold text-foreground">{node.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <RiskPill band={profile.band} score={profile.score} />
          <button
            onClick={() => toggleWatch(node.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              watchlist.has(node.id)
                ? "border-warning bg-warning-soft text-warning"
                : "border-border hover:bg-muted"
            }`}
          >
            <Star className={`size-3.5 ${watchlist.has(node.id) ? "fill-current" : ""}`} />
            {watchlist.has(node.id) ? "Watching" : "Watch"}
          </button>
          <button
            onClick={() => toggleFailure(node.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              isOffline
                ? "border border-border hover:bg-muted"
                : "bg-danger text-primary-foreground hover:opacity-90"
            }`}
          >
            {isOffline ? <RotateCcw className="size-3.5" /> : <Power className="size-3.5" />}
            {isOffline ? "Restore entity" : "Simulate failure"}
          </button>
          <button
            onClick={() => navigate({ to: "/network" })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
          >
            <Network className="size-3.5" />
            Inspect on map
          </button>
        </div>
      </div>

      {/* Primary KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="Composite risk"
          value={`${profile.score}`}
          sub={`Likelihood ${profile.likelihood} · impact ${profile.impact}`}
          tone={scoreTone(profile.score)}
        />
        <Metric
          label="Fulfilment capability"
          value={`${fulfilment}%`}
          sub="Live scenario throughput"
          tone={fulfilment < 60 ? "danger" : fulfilment < 100 ? "warning" : "healthy"}
        />
        <Metric
          label="Weekly output volume"
          value={node.volume.toLocaleString()}
          sub="Units / week produced"
        />
        <Metric
          label="Downstream blast radius"
          value={
            financialBlastRadiusM > 0
              ? `$${financialBlastRadiusM}M/wk`
              : `${downstreamVolume.toLocaleString()} u/wk`
          }
          sub={`${downstream.length} downstream entities exposed`}
          tone={financialBlastRadiusM > 2 ? "danger" : "default"}
        />
        <Metric
          label="Inbound concentration"
          value={hhi.toFixed(2)}
          sub={`${neighbors.suppliers.length} direct feeder supplier(s)`}
          tone={hhi >= 0.6 ? "warning" : "default"}
        />
      </div>

      {/* Risk Factors & Operating Attributes */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Seven-pillar risk profile"
          subtitle="Observable attributes normalized 0-100 before weighting"
          className="xl:col-span-2"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={factorData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 26, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.92 0.01 255)"
                  horizontal={false}
                />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid oklch(0.92 0.01 255)",
                  }}
                  formatter={(val: number) => [`${val}/100`, "Pillar Score"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                  {factorData.map((f) => (
                    <Cell
                      key={f.name}
                      fill={f.value >= 70 ? "#c0322b" : f.value >= 45 ? "#e08300" : "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Operating telemetry & buffers">
          <dl className="grid grid-cols-2 gap-2">
            {[
              ["Replenishment lead time", `${node.leadTimeDays} days`],
              ["Inventory safety buffer", `${node.bufferDays} days`],
              ["Facility recovery time", `${node.recoveryDays} days`],
              ["Shortfall absorption", `${Math.round(profile.absorption * 100)}%`],
              ["Capacity consumed", `${Math.round(node.capacityUtilization * 100)}%`],
              ["Financial solvency", `${node.financialHealth}/100`],
              ["Country instability", `${countryRisk(node.region)}/100`],
              ["Downstream nodes", `${downstream.length}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-surface-muted px-2.5 py-2">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {k}
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      {/* Actionable AI / Algorithmic Mitigation Recommendations */}
      <Panel
        title="Automated mitigation playbook"
        subtitle="Tactical risk reduction actions derived from dominant factor vulnerabilities"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((rec, idx) => {
            const Icon = rec.icon;
            const badgeColor =
              rec.urgency === "high"
                ? "bg-danger-soft text-danger border-danger/30"
                : rec.urgency === "medium"
                  ? "bg-warning-soft text-warning border-warning/30"
                  : "bg-healthy-soft text-healthy border-healthy/30";

            return (
              <div
                key={`rec-${idx}`}
                className="flex flex-col justify-between rounded-lg border border-border bg-surface-muted p-3.5 transition-all hover:border-primary/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`grid size-7 place-items-center rounded-md border ${badgeColor}`}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${badgeColor}`}
                    >
                      {rec.urgency} priority
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-xs font-semibold text-foreground">{rec.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{rec.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Upstream Suppliers & Downstream Customers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Upstream suppliers"
          subtitle={`${neighbors.suppliers.length} inbound feeding flows`}
        >
          <NeighborList
            items={neighbors.suppliers.map((n) => ({
              id: n.id,
              label: n.label,
              score: risk[n.id]?.score ?? 0,
              volume:
                network.links.find((l) => l.source === n.id && l.target === node.id)?.volume ?? 0,
              status: result.statuses[n.id] ?? "healthy",
            }))}
            direction="up"
          />
        </Panel>
        <Panel
          title="Downstream customers"
          subtitle={`${neighbors.customers.length} outbound consumption flows`}
        >
          <NeighborList
            items={neighbors.customers.map((n) => ({
              id: n.id,
              label: n.label,
              score: risk[n.id]?.score ?? 0,
              volume:
                network.links.find((l) => l.source === node.id && l.target === n.id)?.volume ?? 0,
              status: result.statuses[n.id] ?? "healthy",
            }))}
            direction="down"
          />
        </Panel>
      </div>

      {/* Downstream Blast Radius */}
      <Panel
        title="Complete downstream blast radius"
        subtitle={`${downstream.length} entities and ${downstreamVolume.toLocaleString()} units/week sit behind this node`}
      >
        {downstream.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Terminal node — nothing downstream depends on it.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {downstream
              .sort((a, b) => b.volume - a.volume)
              .map((n) => (
                <li key={n.id}>
                  <Link
                    to="/suppliers/$id"
                    params={{ id: n.id }}
                    className="block rounded-lg border border-border bg-surface-muted px-2.5 py-2 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-medium">{n.label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {Math.round((result.capability[n.id] ?? 1) * 100)}%
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <MiniBar
                        value={(result.capability[n.id] ?? 1) * 100}
                        tone={
                          (result.capability[n.id] ?? 1) < 0.6
                            ? "danger"
                            : (result.capability[n.id] ?? 1) < 1
                              ? "warning"
                              : "healthy"
                        }
                      />
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function NeighborList({
  items,
  direction,
}: {
  items: { id: string; label: string; score: number; volume: number; status: string }[];
  direction: "up" | "down";
}) {
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground">No linked entities.</p>;
  const Icon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id}>
          <Link
            to="/suppliers/$id"
            params={{ id: i.id }}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2 transition-colors hover:bg-muted"
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{i.label}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {i.volume.toLocaleString()} u/wk
            </span>
            <span className="font-mono text-[11px] font-semibold">{i.score}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
