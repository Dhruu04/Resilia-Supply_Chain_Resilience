import { useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Flame,
  Leaf,
  Plane,
  Ship,
  Sparkles,
  TrendingDown,
  Truck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { computeNetworkEsg, type NetworkEsgProfile } from "@/lib/supply-chain/esg";
import { Metric, Panel } from "@/components/supply-chain/Panel";
import type { SupplyNetwork } from "@/lib/supply-chain/types";

interface EsgAnalyticsViewProps {
  network: SupplyNetwork;
}

export function EsgAnalyticsView({ network }: EsgAnalyticsViewProps) {
  const esg: NetworkEsgProfile = useMemo(() => computeNetworkEsg(network), [network]);

  const modeChartData = useMemo(() => {
    return [
      { name: "Maritime", emissions: esg.modeBreakdown.maritime, fill: "#3b82f6" },
      { name: "Road / Rail", emissions: esg.modeBreakdown.road, fill: "#10b981" },
      { name: "Air Freight", emissions: esg.modeBreakdown.air, fill: "#f59e0b" },
    ];
  }, [esg]);

  const topCorridorsData = useMemo(() => {
    return esg.allCorridors.slice(0, 8).map((c) => ({
      corridor: `${c.sourceCity} → ${c.targetCity}`,
      emissions: c.weeklyTonsCO2,
      distance: c.distanceKm,
      mode: c.mode,
    }));
  }, [esg]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Level ESG Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Annual Transport Footprint"
          value={`${esg.totalAnnualTonsCO2.toLocaleString()} t`}
          sub={`${esg.totalWeeklyTonsCO2} metric tons CO2e / week`}
          tone="default"
        />

        <Metric
          label="Carbon Intensity"
          value={`${esg.carbonIntensityPerUnitKg} kg`}
          sub="CO2e emitted per finished product unit"
          tone={esg.carbonIntensityPerUnitKg < 15 ? "healthy" : "warning"}
        />

        <Metric
          label="Sustainability Posture"
          value={`${esg.sustainabilityScore}/100`}
          sub="Scope 3 transport efficiency index"
          tone={
            esg.sustainabilityScore > 80
              ? "healthy"
              : esg.sustainabilityScore > 60
                ? "warning"
                : "danger"
          }
        />

        <Metric
          label="High-Carbon Corridors"
          value={`${esg.highEmissionCorridors.length}`}
          sub="Corridors rated Grade C or D"
          tone={esg.highEmissionCorridors.length > 3 ? "danger" : "healthy"}
        />
      </div>

      {/* Visual Charts: Mode Breakdown & Top Corridors */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Transport Mode Carbon Share"
          subtitle="Annual metric tons CO2e by transportation logistics channel"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modeChartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(val: number) => [`${val.toLocaleString()} t CO2e/yr`, "Emissions"]}
                />
                <Bar dataKey="emissions" radius={[4, 4, 0, 0]}>
                  {modeChartData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Highest Emitting Freight Corridors"
          subtitle="Weekly CO2e output across intercontinental & regional arteries"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCorridorsData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 30, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis
                  type="category"
                  dataKey="corridor"
                  width={110}
                  tick={{ fontSize: 10 }}
                  stroke="#64748b"
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(val: number) => [`${val} t CO2e/wk`, "Weekly Emissions"]}
                />
                <Bar dataKey="emissions" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Comprehensive Corridor Table & Green Recommendations */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Corridor ESG Registry"
          subtitle="Scope 3 transport emissions, distance, and green efficiency grade"
          className="xl:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-2">Origin → Destination</th>
                  <th className="pb-2">Freight Mode</th>
                  <th className="pb-2">Distance</th>
                  <th className="pb-2">Weekly Volume</th>
                  <th className="pb-2">Annual CO2e</th>
                  <th className="pb-2 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {esg.allCorridors.slice(0, 10).map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-medium text-slate-900">
                      {c.sourceCity} <span className="text-slate-400">→</span> {c.targetCity}
                    </td>
                    <td className="py-2.5 text-slate-600 flex items-center gap-1.5">
                      {c.mode === "Air Freight" ? (
                        <Plane className="size-3 text-amber-500" />
                      ) : c.mode === "Maritime Container" ? (
                        <Ship className="size-3 text-blue-500" />
                      ) : (
                        <Truck className="size-3 text-emerald-500" />
                      )}
                      <span>{c.mode}</span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-600">
                      {c.distanceKm.toLocaleString()} km
                    </td>
                    <td className="py-2.5 font-mono text-slate-600">
                      {c.weeklyVolume.toLocaleString()} u/wk
                    </td>
                    <td className="py-2.5 font-mono font-bold text-slate-900">
                      {c.annualTonsCO2.toLocaleString()} t
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.greenRating === "A"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.greenRating === "B"
                              ? "bg-blue-100 text-blue-800"
                              : c.greenRating === "C"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        Grade {c.greenRating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Green Decarbonization Playbook"
          subtitle="Actionable corridor optimizations to shave Scope 3 emissions"
        >
          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Leaf className="size-4 text-emerald-600" /> Nearshore Supply Decarbonization
              </div>
              <p className="mt-1 text-emerald-800 text-[11px] leading-relaxed">
                Transitioning long-haul transoceanic sub-assemblies to regional nearshore suppliers
                (e.g. Mexico or Eastern Europe) reduces freight emissions by up to{" "}
                <strong>72%</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Ship className="size-4 text-blue-600" /> Modal Shift: Air to Green Maritime
              </div>
              <p className="mt-1 text-blue-800 text-[11px] leading-relaxed">
                Air express freight produces <strong>34x higher CO2e per ton-km</strong> than
                container shipping. Increasing regional buffer stock allows shifting urgent air
                shipments to scheduled green maritime.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Sparkles className="size-4 text-indigo-600" /> Clean Energy Carrier SLAS
              </div>
              <p className="mt-1 text-slate-600 text-[11px] leading-relaxed">
                Contract with logistics freight carriers offering biofuel or electric heavy-duty
                fleets to meet EU CBAM and SEC Scope 3 compliance thresholds.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
