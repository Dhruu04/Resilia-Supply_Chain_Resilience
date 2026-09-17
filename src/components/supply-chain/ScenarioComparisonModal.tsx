import { useState, useMemo } from "react";
import {
  X,
  GitCompare,
  Check,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useSupply } from "@/lib/supply-chain/store";
import { propagateFailures, computeKpis } from "@/lib/supply-chain/simulation";
import { scoreNetwork } from "@/lib/supply-chain/risk";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ScenarioOption {
  id: string;
  name: string;
  description: string;
  offline: string[];
}

export function ScenarioComparisonModal({ isOpen, onClose }: Props) {
  const {
    network,
    activeChain,
    scenarios: savedScenarios,
    setOffline,
    offline: currentOffline,
  } = useSupply();

  // Aggregate available scenarios: Baseline, Current Active, Presets, Saved
  const allScenarioOptions = useMemo<ScenarioOption[]>(() => {
    const list: ScenarioOption[] = [
      {
        id: "baseline",
        name: "Baseline (100% Operational)",
        description: "Zero outages across all tiers and international shipping corridors.",
        offline: [],
      },
      {
        id: "current_active",
        name: "Current Active Scenario",
        description: `Active state with ${currentOffline.size} offline facilities selected.`,
        offline: Array.from(currentOffline),
      },
    ];

    if (activeChain.presetScenarios) {
      for (let i = 0; i < activeChain.presetScenarios.length; i++) {
        const p = activeChain.presetScenarios[i]!;
        list.push({
          id: `preset_${i}_${p.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
          name: p.name,
          description: p.note,
          offline: p.ids ?? [],
        });
      }
    }

    for (const s of savedScenarios) {
      list.push({
        id: `saved_${s.id}`,
        name: s.name,
        description: s.note || "User custom scenario snapshot.",
        offline: s.offline ?? [],
      });
    }

    return list;
  }, [activeChain, currentOffline, savedScenarios]);

  // Selected scenarios to compare (up to 3)
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "baseline",
    allScenarioOptions[1]?.id ?? "current_active",
    allScenarioOptions[2]?.id ?? "current_active",
  ]);

  const totalNetworkVolume = useMemo(
    () => network.nodes.reduce((s, n) => s + n.volume, 0),
    [network],
  );

  // Evaluate metrics for each selected scenario
  const evaluatedScenarios = useMemo(() => {
    return selectedIds.map((id) => {
      const scenario = allScenarioOptions.find((s) => s.id === id) ?? allScenarioOptions[0]!;
      const offlineList = scenario.offline ?? [];
      const offlineSet = new Set(offlineList);
      const simResult = propagateFailures(network, offlineSet);
      const kpis = computeKpis(network, simResult);

      // Financial loss per day calculation
      const dailyRevenueLoss = Array.from(offlineSet).reduce((sum, nId) => {
        const node = network.nodes.find((n) => n.id === nId);
        if (!node) return sum;
        const unitPrice = node.type === "factory" || node.type === "distribution" ? 1250 : 250;
        return sum + (node.volume * unitPrice) / 7_000_000;
      }, 0);

      // 30-day cumulative loss
      const loss30Days = Math.round(dailyRevenueLoss * 22 * 10) / 10;
      const impactedVolumeShare =
        totalNetworkVolume > 0 ? Math.round((kpis.impactedVolume / totalNetworkVolume) * 100) : 0;

      return {
        ...scenario,
        kpis,
        simResult,
        impactedVolumeShare,
        dailyRevenueLoss: Math.round(dailyRevenueLoss * 10) / 10,
        loss30Days,
        offlineCount: offlineList.length,
        atRiskCount: kpis.atRiskNodes,
        offlineFacilities: offlineList.map(
          (nid) => network.nodes.find((n) => n.id === nid)?.label || nid,
        ),
      };
    });
  }, [allScenarioOptions, network, selectedIds, totalNetworkVolume]);

  // Chart comparison data
  const comparisonChartData = useMemo(() => {
    return [
      {
        metric: "Health Score",
        ...Object.fromEntries(
          evaluatedScenarios.map((s, idx) => [`scen_${idx}`, s.kpis.healthScore]),
        ),
      },
      {
        metric: "Volume Exposed %",
        ...Object.fromEntries(
          evaluatedScenarios.map((s, idx) => [`scen_${idx}`, s.impactedVolumeShare]),
        ),
      },
      {
        metric: "Nodes Offline",
        ...Object.fromEntries(evaluatedScenarios.map((s, idx) => [`scen_${idx}`, s.offlineCount])),
      },
      {
        metric: "At-Risk Downstream",
        ...Object.fromEntries(evaluatedScenarios.map((s, idx) => [`scen_${idx}`, s.atRiskCount])),
      },
    ];
  }, [evaluatedScenarios]);

  if (!isOpen) return null;

  const SCENARIO_COLORS = ["#10b981", "#6366f1", "#f59e0b"];

  const handleSelectScenario = (index: number, newId: string) => {
    const updated = [...selectedIds];
    updated[index] = newId;
    setSelectedIds(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/75 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Multi-Scenario Stress Test Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Side-by-side delta analysis of network resilience, buffer survivability, and
                financial exposure.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scenario Selectors */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {evaluatedScenarios.map((scen, idx) => (
              <div
                key={idx}
                className="rounded-xl border p-4 transition-all"
                style={{
                  borderColor: `${SCENARIO_COLORS[idx]}60`,
                  backgroundColor: `${SCENARIO_COLORS[idx]}08`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${SCENARIO_COLORS[idx]}20`,
                      color: SCENARIO_COLORS[idx],
                    }}
                  >
                    Scenario {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOffline(scen.offline, `Activated from comparison: ${scen.name}`);
                    }}
                    className="text-[11px] font-medium text-slate-600 hover:text-indigo-600 underline"
                  >
                    Set as Active
                  </button>
                </div>

                <select
                  id={`scenario-comparison-slot-${idx}`}
                  name={`scenarioSlot_${idx}`}
                  aria-label={`Select scenario for slot ${idx + 1}`}
                  value={selectedIds[idx]}
                  onChange={(e) => handleSelectScenario(idx, e.target.value)}
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-none"
                >
                  {allScenarioOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>

                <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{scen.description}</p>
              </div>
            ))}
          </div>

          {/* Side-by-Side Comparison Metrics Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3 w-1/4">Key Vulnerability Metrics</th>
                  {evaluatedScenarios.map((s, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 font-semibold"
                      style={{ color: SCENARIO_COLORS[idx] }}
                    >
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-600">Network Health Index</td>
                  {evaluatedScenarios.map((s, idx) => (
                    <td key={idx} className="px-4 py-3 font-mono font-bold text-sm">
                      <span
                        className={
                          s.kpis.healthScore > 80
                            ? "text-emerald-600"
                            : s.kpis.healthScore > 50
                              ? "text-amber-600"
                              : "text-rose-600"
                        }
                      >
                        {s.kpis.healthScore} / 100
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-600">
                    Volume Exposed Downstream
                  </td>
                  {evaluatedScenarios.map((s, idx) => (
                    <td key={idx} className="px-4 py-3 font-mono">
                      {s.impactedVolumeShare}% ({s.kpis.impactedVolume.toLocaleString()} units)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-600">
                    Offline Critical Facilities
                  </td>
                  {evaluatedScenarios.map((s, idx) => (
                    <td key={idx} className="px-4 py-3 font-mono">
                      <span className="font-semibold text-rose-600">{s.offlineCount}</span> nodes
                      offline
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-600">Cascading At-Risk Nodes</td>
                  {evaluatedScenarios.map((s, idx) => (
                    <td key={idx} className="px-4 py-3 font-mono">
                      <span className="font-semibold text-amber-600">{s.atRiskCount}</span> nodes
                      disrupted
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-600">
                    Daily Revenue at Risk ($M)
                  </td>
                  {evaluatedScenarios.map((s, idx) => (
                    <td key={idx} className="px-4 py-3 font-mono font-semibold text-rose-600">
                      ${s.dailyRevenueLoss}M / day
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-600">
                    Estimated 30-Day Total Loss
                  </td>
                  {evaluatedScenarios.map((s, idx) => (
                    <td key={idx} className="px-4 py-3 font-mono font-bold text-rose-700">
                      ${s.loss30Days}M
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-600">
                    Downstream Facilities Affected
                  </td>
                  {evaluatedScenarios.map((s, idx) => (
                    <td key={idx} className="px-4 py-3 text-[11px] text-slate-500">
                      {s.offlineFacilities.length === 0 ? (
                        <span className="text-emerald-600 font-medium">None (All clear)</span>
                      ) : (
                        <span className="line-clamp-2">{s.offlineFacilities.join(", ")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comparative Bar Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Metric Delta Cross-Comparison
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    formatter={(_val, _entry, index) => (
                      <span className="text-xs text-slate-700 font-medium">
                        {evaluatedScenarios[index]?.name || `Scenario ${index + 1}`}
                      </span>
                    )}
                  />
                  {evaluatedScenarios.map((_, idx) => (
                    <Bar
                      key={idx}
                      dataKey={`scen_${idx}`}
                      fill={SCENARIO_COLORS[idx]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/75 px-6 py-3 text-xs text-slate-500">
          <div>
            Comparing 3 strategic conditions simultaneously across {network.nodes.length} network
            entities.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
