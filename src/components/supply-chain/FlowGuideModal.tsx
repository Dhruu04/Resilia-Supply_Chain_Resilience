import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  DollarSign,
  Gauge,
  HelpCircle,
  Hourglass,
  Layers,
  Network,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

type GuideTab = "tiers" | "risk" | "cascade" | "mitigation";

const TABS: { id: GuideTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "tiers", label: "1. Five-Tier Architecture", icon: Layers },
  { id: "risk", label: "2. Seven-Pillar Risk Model", icon: Gauge },
  { id: "cascade", label: "3. Disruption & Buffer Absorption", icon: Hourglass },
  { id: "mitigation", label: "4. Financial Risk & Playbooks", icon: DollarSign },
];

export function FlowGuideModal({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<GuideTab>("tiers");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex h-[90vh] max-h-[760px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <BookOpen className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Supply Chain Risk & Material Flow Guide
              </h2>
              <p className="text-xs text-slate-500">
                Interactive reference: understanding multi-tier network architecture, risk
                equations, and failure ripples
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-all ${
                activeTab === id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-700">
          {/* TAB 1: Five-Tier Architecture */}
          {activeTab === "tiers" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  How Materials Flow Across the Global Network
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  The network is modeled as a Directed Acyclic Graph (DAG) with 5 distinct physical
                  tiers. Raw inputs move left-to-right from extraction sites to regional
                  distribution hubs.
                </p>
              </div>

              {/* 5 Tier Pipeline Visualization */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                {[
                  {
                    tier: "Tier 3",
                    title: "Raw Materials",
                    desc: "Lithium, Cobalt, Copper, Rare Earths, Glass Sand, Silicon refinery.",
                    leadTime: "12 - 46 days",
                    color: "bg-blue-50 border-blue-200 text-blue-800",
                    badge: "bg-blue-100 text-blue-700",
                  },
                  {
                    tier: "Tier 2",
                    title: "Components",
                    desc: "Battery cells, wire harnesses, logic semiconductors, sensors, casting.",
                    leadTime: "11 - 38 days",
                    color: "bg-cyan-50 border-cyan-200 text-cyan-800",
                    badge: "bg-cyan-100 text-cyan-700",
                  },
                  {
                    tier: "Tier 1",
                    title: "Sub-Assemblies",
                    desc: "Battery modules, engine control units, power trains, chassis frames.",
                    leadTime: "9 - 17 days",
                    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
                    badge: "bg-indigo-100 text-indigo-700",
                  },
                  {
                    tier: "Plants",
                    title: "Final Assembly",
                    desc: "High-volume vehicle/electronics manufacturing plants (Detroit, Bavaria, Suzhou).",
                    leadTime: "7 - 9 days",
                    color: "bg-violet-50 border-violet-200 text-violet-800",
                    badge: "bg-violet-100 text-violet-700",
                  },
                  {
                    tier: "DCs",
                    title: "Distribution",
                    desc: "Finished product warehouses feeding regional consumer delivery grids.",
                    leadTime: "3 - 4 days",
                    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
                    badge: "bg-emerald-100 text-emerald-700",
                  },
                ].map((item, idx) => (
                  <div
                    key={item.tier}
                    className={`relative rounded-xl border p-4 shadow-sm flex flex-col justify-between ${item.color}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.badge}`}>
                          {item.tier}
                        </span>
                        {idx < 4 && (
                          <ArrowRight className="size-3.5 text-slate-400 hidden md:block" />
                        )}
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-slate-900">{item.title}</h4>
                      <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-mono">
                      Lead Time: {item.leadTime}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="size-4 text-indigo-600" /> Key Flow Rule: Volume-Driven Node
                  Sizing
                </h4>
                <p className="mt-1 text-xs text-slate-600">
                  Node diameter on the network canvas is proportional to its weekly throughput
                  (units / week). The largest hubs (e.g. Pacifica Plant in Suzhou at 6,100 u/wk and
                  Aurora Plant in Detroit at 5,200 u/wk) dominate downstream fulfillment.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Seven-Pillar Risk Model */}
          {activeTab === "risk" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  How Entity Risk is Derived (0 to 100)
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Risk scores are strictly derived from observable physical telemetry, never entered
                  subjectively. The engine blends <strong>Likelihood</strong> (probability of
                  failure) and <strong>Impact</strong> (consequence to network).
                </p>
              </div>

              {/* Formula Card */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 font-mono text-xs text-indigo-950">
                <p className="font-bold text-indigo-900">Mathematical Formulation:</p>
                <p className="mt-1 font-semibold">
                  Risk Score = 100 &times; (0.55 &times; Likelihood + 0.45 &times; Impact)
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Likelihood Pillars */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Activity className="size-4 text-amber-500" /> Likelihood Pillars (55% Weight)
                  </h4>
                  <ul className="mt-3 space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 min-w-[130px]">
                        Geopolitical Instability:
                      </span>
                      <span>
                        Country risk index based on territorial conflict, sanctions, and regulatory
                        embargoes.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 min-w-[130px]">
                        Financial Solvency:
                      </span>
                      <span>
                        1 - (Credit Rating / 100). Highlights financially stressed suppliers at risk
                        of sudden insolvency.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 min-w-[130px]">
                        Capacity Exhaustion:
                      </span>
                      <span>
                        Penalizes facilities operating above 80% capacity with zero surge headroom.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 min-w-[130px]">
                        Lead Time Horizon:
                      </span>
                      <span>
                        Replenishment duration relative to planning horizon. Longer transit = harder
                        to react.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Impact Pillars */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <ShieldAlert className="size-4 text-rose-500" /> Impact Pillars (45% Weight)
                  </h4>
                  <ul className="mt-3 space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 min-w-[130px]">
                        Inbound HHI:
                      </span>
                      <span>
                        Herfindahl-Hirschman Index. HHI &ge; 0.6 signifies high-risk sole-sourcing
                        with no backup.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 min-w-[130px]">
                        Downstream Criticality:
                      </span>
                      <span>
                        Share of total weekly global volume reachable downstream if this entity goes
                        dark.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-slate-800 min-w-[130px]">
                        Buffer Deficit:
                      </span>
                      <span>
                        Ratio of recovery days needed vs. safety buffer days available to absorb the
                        outage.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Disruption & Buffer Absorption */}
          {activeTab === "cascade" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  How Failure Cascades & How Buffers Protect Output
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  When an entity halts, the disruption does not shut down the entire world
                  instantly. Intermediate tiers draw on their on-hand safety buffer stock.
                </p>
              </div>

              {/* Step by Step Breakdown */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                    <AlertTriangle className="size-4" /> 1. Upstream Shock
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    A raw material refinery (e.g. Katanga Cobalt) or semiconductor foundry halts.
                    Its output drops to 0 units/wk.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                    <Hourglass className="size-4" /> 2. Buffer Stock Buffer
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Downstream component makers have 6 to 18 days of on-hand inventory buffer. They
                    continue running at 100% capacity until the buffer depletes.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <TrendingDown className="size-4 text-rose-600" /> 3. Line Starvation & Halts
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    When safety buffer reaches 0 days, the downstream line starves. Fulfillment
                    drops below 20%, turning final assembly plants offline.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <h4 className="text-xs font-bold text-amber-900">
                  Buffer Depletion Countdown Indicator
                </h4>
                <p className="mt-1 text-xs text-amber-800">
                  Whenever a simulation is running, the platform dynamically calculates{" "}
                  <code>bufferDays / shortfall</code> for each downstream entity, flagging any
                  factory with less than 5 days of reserve before catastrophic line stoppage.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Financial Risk & Playbooks */}
          {activeTab === "mitigation" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Quantifying Financial Loss & Prescribing Mitigations
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  The platform turns operational topology into dollar exposure and automatically
                  generates board-level mitigation actions.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <DollarSign className="size-4 text-emerald-600" /> Financial Exposure Model
                  </h4>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Finished goods from assembly plants and distribution centers are valued at{" "}
                    <strong>~$1,250 / unit</strong>. Sub-assemblies and components are valued at{" "}
                    <strong>~$250 / unit</strong>.
                  </p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    When an assembly plant loses 5,200 units/week, gross weekly revenue at risk is{" "}
                    <strong>$6.5M / week</strong>, translating to a daily burn rate of{" "}
                    <strong>~$928k / day</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <CheckCircle2 className="size-4 text-indigo-600" /> Automated Playbook Actions
                  </h4>
                  <ul className="mt-2 space-y-2 text-xs text-slate-600">
                    <li>
                      <strong>Dual-Sourcing Recommendation:</strong> Triggered when HHI &ge; 0.6 to
                      split volume 65/35.
                    </li>
                    <li>
                      <strong>Safety Buffer Expansion:</strong> Triggered when buffer days &le; 8 to
                      cover replenishment lead time.
                    </li>
                    <li>
                      <strong>Nearshore Supplier Qualification:</strong> Triggered when territory
                      instability &ge; 60/100.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-3">
          <span className="text-xs text-slate-500 font-mono">
            Nexus Risk Control Tower &middot; Enterprise Guide
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
