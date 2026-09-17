import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Activity, BarChart3, Leaf } from "lucide-react";

import { EsgAnalyticsView } from "@/components/supply-chain/EsgAnalyticsView";
import { MonteCarloView } from "@/components/supply-chain/MonteCarloView";
import { Panel } from "@/components/supply-chain/Panel";
import { failureImpacts, regionExposure, tierStats } from "@/lib/supply-chain/derive";
import { FACTOR_KEYS, FACTOR_LABEL, inboundConcentration } from "@/lib/supply-chain/risk";
import { useSupply } from "@/lib/supply-chain/store";

export const Route = createFileRoute("/analytics")({
  validateSearch: (search: Record<string, unknown>): { tab?: "risk" | "monte-carlo" | "esg" } => ({
    tab: (search["tab"] as "risk" | "monte-carlo" | "esg") || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Risk Analytics — Exposure, Concentration & Factor Analysis" },
      {
        name: "description",
        content:
          "Analytical views of supply chain risk: likelihood versus impact quadrants, factor contribution across the network, lead-time and buffer distribution, and tier-level exposure.",
      },
      { property: "og:title", content: "Risk Analytics — Exposure & Concentration Analysis" },
      {
        property: "og:description",
        content:
          "Likelihood/impact quadrants, factor contribution, buffer coverage and tier exposure charts.",
      },
    ],
  }),
  component: Analytics,
});

const AXIS = "#64748b";
const GRID = "oklch(0.92 0.01 255)";
const TIP = { fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.92 0.01 255)" };

function Analytics() {
  const { network, risk, result } = useSupply();
  const search = Route.useSearch();
  const [viewMode, setViewMode] = useState<"risk" | "monte-carlo" | "esg">(
    search.tab || "risk",
  );

  const tiers = useMemo(() => tierStats(network, risk, result), [network, risk, result]);
  const regions = useMemo(() => regionExposure(network, risk), [network, risk]);
  const impacts = useMemo(() => failureImpacts(network).slice(0, 10), [network]);

  const quadrant = useMemo(
    () =>
      network.nodes.map((n) => ({
        x: risk[n.id]!.likelihood,
        y: risk[n.id]!.impact,
        z: n.volume,
        label: n.label,
      })),
    [network, risk],
  );

  const factorAverages = useMemo(
    () =>
      FACTOR_KEYS.map((k) => ({
        name: FACTOR_LABEL[k],
        value: Math.round(
          (network.nodes.reduce((s, n) => s + risk[n.id]!.factors[k], 0) / network.nodes.length) *
            100,
        ),
      })),
    [network, risk],
  );

  const bufferCoverage = useMemo(
    () =>
      [...network.nodes]
        .sort((a, b) => a.bufferDays - a.recoveryDays - (b.bufferDays - b.recoveryDays))
        .slice(0, 12)
        .map((n) => ({
          name: n.id,
          buffer: n.bufferDays,
          recovery: n.recoveryDays,
          gap: n.bufferDays - n.recoveryDays,
        })),
    [network],
  );

  const concentration = useMemo(
    () =>
      [...network.nodes]
        .map((n) => ({
          name: n.id,
          label: n.label,
          hhi: Number(inboundConcentration(network.links, n.id).toFixed(2)),
          impact: risk[n.id]!.impact,
        }))
        .filter((n) => network.links.some((l) => l.target === n.name))
        .sort((a, b) => b.hhi - a.hhi || b.impact - a.impact)
        .slice(0, 12),
    [network, risk],
  );

  const bands = useMemo(() => {
    const counts = { low: 0, moderate: 0, elevated: 0, severe: 0 };
    for (const n of network.nodes) counts[risk[n.id]!.band] += 1;
    return [
      { name: "Low", value: counts.low, fill: "#15803d" },
      { name: "Moderate", value: counts.moderate, fill: "#6366f1" },
      { name: "Elevated", value: counts.elevated, fill: "#e08300" },
      { name: "Severe", value: counts.severe, fill: "#c0322b" },
    ];
  }, [network, risk]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Analytics & Intelligence</h1>
          <p className="text-xs text-muted-foreground">
            Multi-dimensional risk exposure, trade concentration, and Scope 3 ESG carbon footprint.
          </p>
        </div>

        {/* Tab switch pills */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("risk")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
              viewMode === "risk"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
            Risk & Exposure
          </button>
          <button
            type="button"
            onClick={() => setViewMode("monte-carlo")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
              viewMode === "monte-carlo"
                ? "bg-white text-indigo-700 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-indigo-600" />
            Monte Carlo & VaR
          </button>
          <button
            type="button"
            onClick={() => setViewMode("esg")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
              viewMode === "esg"
                ? "bg-white text-emerald-800 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Leaf className="h-3.5 w-3.5 text-emerald-600" />
            ESG & Carbon Footprint
          </button>
        </div>
      </div>

      {viewMode === "monte-carlo" ? (
        <MonteCarloView />
      ) : viewMode === "esg" ? (
        <EsgAnalyticsView network={network} />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Likelihood vs. impact"
              subtitle="Bubble size = weekly volume. Top-right quadrant is the escalation zone."
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Likelihood"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      stroke={AXIS}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Impact"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      stroke={AXIS}
                    />
                    <ZAxis type="number" dataKey="z" range={[40, 400]} />
                    <Tooltip
                      contentStyle={TIP}
                      formatter={(v: number, n: string) => [v, n]}
                      labelFormatter={() => ""}
                    />
                    <Scatter data={quadrant} fill="#6366f1" fillOpacity={0.65} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Average factor contribution" subtitle="Network mean per factor, 0-100">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={factorAverages}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 26, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke={AXIS} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={92}
                      tick={{ fontSize: 11 }}
                      stroke={AXIS}
                    />
                    <Tooltip contentStyle={TIP} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                      {factorAverages.map((f) => (
                        <Cell
                          key={f.name}
                          fill={f.value >= 60 ? "#c0322b" : f.value >= 40 ? "#e08300" : "#6366f1"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title="Buffer coverage vs. recovery time"
              subtitle="Negative gap means inventory runs out before the entity recovers"
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bufferCoverage}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={AXIS} />
                    <YAxis tick={{ fontSize: 11 }} stroke={AXIS} />
                    <Tooltip contentStyle={TIP} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="buffer" name="Buffer days" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar
                      dataKey="recovery"
                      name="Recovery days"
                      fill="#e08300"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title="Most concentrated inbound flows"
              subtitle="Herfindahl index — 1.00 means fully sole-sourced"
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={concentration}
                    margin={{ top: 4, right: 8, left: -22, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={AXIS} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} stroke={AXIS} />
                    <Tooltip
                      contentStyle={TIP}
                      formatter={(v: number) => [v, "HHI"]}
                      labelFormatter={(l: string) =>
                        concentration.find((c) => c.name === l)?.label ?? l
                      }
                    />
                    <Bar dataKey="hhi" radius={[3, 3, 0, 0]}>
                      {concentration.map((c) => (
                        <Cell key={c.name} fill={c.hhi >= 0.8 ? "#c0322b" : "#e08300"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Risk band distribution" subtitle="Entity count per band">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bands} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={AXIS} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={AXIS} />
                    <Tooltip contentStyle={TIP} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {bands.map((b) => (
                        <Cell key={b.name} fill={b.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Tier volume and risk" subtitle="Weekly volume against average tier risk">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tiers} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="short" tick={{ fontSize: 11 }} stroke={AXIS} />
                    <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke={AXIS} />
                    <YAxis
                      yAxisId="r"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      stroke={AXIS}
                    />
                    <Tooltip contentStyle={TIP} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      yAxisId="l"
                      type="monotone"
                      dataKey="volume"
                      name="Volume u/wk"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="r"
                      type="monotone"
                      dataKey="avgRisk"
                      name="Avg risk"
                      stroke="#e08300"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Blast radius ranking" subtitle="Downstream volume exposed per entity">
              <ul className="space-y-1.5">
                {impacts.map((i) => (
                  <li
                    key={i.node.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{i.node.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {i.downstreamNodes} nodes
                    </span>
                    <span className="font-mono">{Math.round(i.volumeShare * 100)}%</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Country concentration" subtitle="Share of network volume by country">
              <ul className="space-y-1.5">
                {regions.slice(0, 10).map((r) => (
                  <li
                    key={r.country}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-xs"
                  >
                    <span className="w-8 font-mono font-semibold">{r.country}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${Math.round(r.volumeShare * 100)}%` }}
                        />
                      </span>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {Math.round(r.volumeShare * 100)}%
                    </span>
                    <span className="font-mono">{r.avgRisk}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
