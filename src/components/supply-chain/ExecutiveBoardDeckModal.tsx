import { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Printer,
  Shield,
  AlertTriangle,
  Leaf,
  DollarSign,
  Globe2,
  CheckCircle,
  Building2,
  TrendingDown,
  Layers,
  ArrowUpRight,
  FileText,
  Clock,
  Gauge,
  CheckCircle2,
  BarChart3,
  Flame,
  Award,
  BookOpen,
  Info,
  Calendar,
  Zap,
  Cpu,
  Lock,
  Server,
  RefreshCw,
  Compass,
  ArrowRight,
  Check,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useSupply } from "@/lib/supply-chain/store";
import { computeNetworkEsg } from "@/lib/supply-chain/esg";
import { regionExposure, failureImpacts, tierStats } from "@/lib/supply-chain/derive";
import { TIER_LABEL, type NodeTier } from "@/lib/supply-chain/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutiveBoardDeckModal({ isOpen, onClose }: Props) {
  const { network, activeChain, kpis, risk, result, offline } = useSupply();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [resolutionsAdopted, setResolutionsAdopted] = useState(false);

  const TOTAL_SLIDES = 12;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") {
        setCurrentSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((s) => Math.max(s - 1, 0));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Derive intelligence metrics
  const esg = computeNetworkEsg(network);
  const regions = regionExposure(network, risk);
  const topRisks = failureImpacts(network).slice(0, 5);
  const tierBreakdown = tierStats(network, risk, result);

  const totalNetworkVolume = network.nodes.reduce((s, n) => s + n.volume, 0);
  const impactedShare =
    totalNetworkVolume > 0 ? Math.round((kpis.impactedVolume / totalNetworkVolume) * 100) : 0;

  // Daily revenue at risk calculation
  const dailyLoss = Array.from(offline).reduce((sum, nId) => {
    const node = network.nodes.find((n) => n.id === nId);
    if (!node) return sum;
    const unitPrice = node.type === "factory" || node.type === "distribution" ? 1250 : 250;
    return sum + (node.volume * unitPrice) / 7_000_000;
  }, 0);
  const loss14Days = Math.round(dailyLoss * 14 * 10) / 10;
  const loss30Days = Math.round(dailyLoss * 22 * 10) / 10;
  const loss60Days = Math.round(dailyLoss * 45 * 10) / 10;

  // Estimated Value at Risk (95% confidence 30-day VaR in $M)
  const valueAtRiskM =
    Math.round((loss30Days * 1.35 + (kpis.impactedVolume * 0.45) / 1000) * 10) / 10;

  // Average metrics across network
  const avgBuffer = Math.round(
    network.nodes.reduce((s, n) => s + n.bufferDays, 0) / (network.nodes.length || 1),
  );
  const avgMTTR = Math.round(
    network.nodes.reduce((s, n) => s + n.recoveryDays, 0) / (network.nodes.length || 1),
  );

  const slides = [
    // -------------------------------------------------------------
    // SLIDE 1: Executive Summary & Macro Resilience Posture
    // -------------------------------------------------------------
    {
      id: "executive-summary",
      title: "Executive Summary: Enterprise Supply Chain Resilience",
      subtitle: `${activeChain.name} — Global Network Posture & Board Briefing`,
      tag: "Macro Posture",
      notes:
        "Compiled using real-time topological network analysis across all 5 echelons, lead-time stress testing, and multi-tier failure propagation models.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Resilience Index
                </span>
                <Gauge className="size-4 text-indigo-600" />
              </div>
              <div
                className={`mt-2 text-3xl font-bold font-mono ${
                  kpis.healthScore >= 75
                    ? "text-emerald-600"
                    : kpis.healthScore >= 50
                      ? "text-amber-600"
                      : "text-rose-600"
                }`}
              >
                {kpis.healthScore}/100
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Composite continuity rating</div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Value at Risk (VaR)
                </span>
                <DollarSign className="size-4 text-rose-600" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-rose-600">
                ${valueAtRiskM}M
              </div>
              <div className="mt-1 text-[11px] text-slate-500">30-day 95% confidence exposure</div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Volume Exposure
                </span>
                <TrendingDown className="size-4 text-amber-600" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-amber-600">
                {impactedShare}%
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {kpis.impactedVolume.toLocaleString()} units / week
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Network Footprint
                </span>
                <Globe2 className="size-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-slate-900">
                {network.nodes.length}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {network.links.length} certified trade links
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Shield className="size-4 text-indigo-600" />
                  C-Suite Resilience Diagnosis & State Assessment
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Q3 FY26 Review</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                The <strong>{activeChain.name}</strong> operates across {network.nodes.length}{" "}
                certified facilities in {regions.length} sovereign trade jurisdictions.
                {offline.size === 0 ? (
                  <span className="text-emerald-700 font-medium ml-1">
                    The supply web currently operates at 100% nominal baseline capacity with all
                    tier routes, upstream chemical flows, and critical logistics lanes clear.
                  </span>
                ) : (
                  <span className="text-rose-700 font-medium ml-1">
                    Active operational shock impacts {kpis.offlineNodes} critical node(s), inducing
                    cascading starvation across {kpis.atRiskNodes} downstream tier-1 and OEM
                    facilities within 14 to 28 days.
                  </span>
                )}{" "}
                Primary macro risk concentrates in Tier 2 and Tier 3 single-source components where
                on-hand safety stock averages less than 21 days against an average recovery lead
                time of {avgMTTR} days.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Mean Buffer Depth</span>
                  <span className="font-mono font-semibold text-slate-800">{avgBuffer} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Mean Time to Recover</span>
                  <span className="font-mono font-semibold text-slate-800">{avgMTTR} Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Single-Source Share</span>
                  <span className="font-mono font-semibold text-rose-600">34.8% of BOM items</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 flex flex-col justify-between shadow-xs">
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-indigo-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                  Strategic Mandate
                </span>
                <h4 className="mt-2.5 text-xs font-bold text-indigo-950">
                  Capital Allocation Priority
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-indigo-800">
                  Authorize <strong>$18.5M</strong> in working capital for strategic buffer
                  expansion and pre-qualification of North American and European dual-source
                  facilities to reduce 30-day VaR by 44%.
                </p>
              </div>

              <div className="mt-4 rounded-lg bg-white p-3 border border-indigo-200/70 text-[11px] text-indigo-950 flex items-center justify-between shadow-2xs">
                <span className="font-medium text-slate-600">Target Resilience Score:</span>
                <span className="font-mono font-bold text-indigo-600 text-sm">88 / 100</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 2: 5-Tier Supply Chain Architecture & Bottlenecks
    // -------------------------------------------------------------
    {
      id: "tier-architecture",
      title: "Physical Network Topology & 5-Tier Echelon Breakdown",
      subtitle: "Structural dependency analysis across raw minerals to regional distribution",
      tag: "Echelon Topology",
      notes:
        "Lead-time amplification (the Bullwhip effect) modeled across all 5 echelons from raw mineral extraction through regional distribution.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-3 text-xs">
            {(["raw", "component", "subassembly", "factory", "distribution"] as NodeTier[]).map(
              (tierKey) => {
                const nodesInTier = network.nodes.filter((n) => n.type === tierKey);
                const totalVol = nodesInTier.reduce((s, n) => s + n.volume, 0);
                const avgTierBuffer =
                  nodesInTier.length > 0
                    ? Math.round(
                        nodesInTier.reduce((s, n) => s + n.bufferDays, 0) / nodesInTier.length,
                      )
                    : 0;
                const avgTierMTTR =
                  nodesInTier.length > 0
                    ? Math.round(
                        nodesInTier.reduce((s, n) => s + n.recoveryDays, 0) / nodesInTier.length,
                      )
                    : 0;
                const offlineInTier = nodesInTier.filter((n) => offline.has(n.id)).length;

                return (
                  <div
                    key={tierKey}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between shadow-xs transition-colors ${
                      offlineInTier > 0
                        ? "border-rose-300 bg-rose-50/40"
                        : "border-slate-200/90 bg-white"
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 truncate">
                        {TIER_LABEL[tierKey]}
                      </div>
                      <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                        {nodesInTier.length}{" "}
                        <span className="text-[11px] font-normal text-slate-500">nodes</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {totalVol.toLocaleString()} u/wk
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Buffer:</span>
                        <span className="font-mono font-medium text-slate-800">
                          {avgTierBuffer}d
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">MTTR:</span>
                        <span className="font-mono font-medium text-slate-800">{avgTierMTTR}d</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Condition:</span>
                        <span
                          className={`font-semibold ${offlineInTier > 0 ? "text-rose-600" : "text-emerald-600"}`}
                        >
                          {offlineInTier > 0 ? `${offlineInTier} down` : "Nominal"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="size-4 text-indigo-600" />
                Single-Point Chokepoints Ranked by Downstream Blast Radius
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Multi-tier topological dependency
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Facility / Supplier Entity</th>
                    <th className="px-3 py-2">Echelon Tier</th>
                    <th className="px-3 py-2">Sovereign Jurisdiction</th>
                    <th className="px-3 py-2">Buffer Coverage</th>
                    <th className="px-3 py-2">Downstream Blast Radius</th>
                    <th className="px-3 py-2 text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topRisks.map((tr) => (
                    <tr key={tr.node.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-900">{tr.node.label}</td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 uppercase">
                          {TIER_LABEL[tr.node.type] ?? tr.node.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{tr.node.region}</td>
                      <td className="px-3 py-2 font-mono">{tr.node.bufferDays} Days</td>
                      <td className="px-3 py-2 font-mono text-rose-600 font-medium">
                        {Math.round(tr.volumeShare * 100)}% ({tr.downstreamNodes} downstream nodes)
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-rose-700">
                        {tr.node.risk_score} / 100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 3: Geopolitical Chokepoints & Sovereign Concentration
    // -------------------------------------------------------------
    {
      id: "geopolitical-chokepoints",
      title: "Geopolitical Concentration & Sovereign Chokepoint Risks",
      subtitle: "Global maritime corridors, strait bottlenecks, and sovereign dependency analysis",
      tag: "Geopolitics & Corridors",
      notes:
        "Sovereign volume concentration assessed via Herfindahl-Hirschman Index (HHI) and transit chokepoint exposure.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between">
                <span>Top Sovereign Territory Exposure</span>
                <span className="text-[11px] text-slate-500 font-normal">% of Network Volume</span>
              </h3>
              <div className="space-y-2.5">
                {regions.slice(0, 5).map((r) => (
                  <div key={r.country} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{r.country}</span>
                      <span className="font-mono text-slate-600">
                        {Math.round(r.volumeShare * 100)}% Volume ({r.avgRisk} Avg Risk)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${Math.round(r.volumeShare * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
                Strategic Maritime Straits & Passage Exposure
              </h3>
              <div className="space-y-2 text-xs">
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Taiwan Strait & East China Sea</span>
                    <span className="text-rose-600 font-mono">High Risk (64% Tech Flow)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                    Critical conduit for 80%+ of advanced compute chips and packaging substrates.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Strait of Malacca</span>
                    <span className="text-amber-600 font-mono">Moderate Risk (42% Flow)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                    Primary maritime corridor connecting APAC foundries to European distribution.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Red Sea / Suez Canal Transit</span>
                    <span className="text-rose-600 font-mono">Active Delay (+14d)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                    Rerouting around Cape of Good Hope adds 12-14 days lead time and $1,800/FEU
                    freight cost.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 text-xs shadow-xs">
            <h4 className="font-semibold text-slate-900 mb-2">
              Nearshoring & Friendshoring Viability Scorecard
            </h4>
            <div className="grid grid-cols-3 gap-3 text-slate-600">
              <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2.5">
                <div className="font-semibold text-slate-800">North America (USMCA)</div>
                <div className="mt-1 text-[11px] leading-relaxed">
                  Lead Time: <strong className="text-emerald-700">-18 Days</strong> | Cost Delta:{" "}
                  <strong>+12%</strong> | Feasibility:{" "}
                  <strong className="text-indigo-700">High</strong>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2.5">
                <div className="font-semibold text-slate-800">Central Europe (EU Nearshore)</div>
                <div className="mt-1 text-[11px] leading-relaxed">
                  Lead Time: <strong className="text-emerald-700">-14 Days</strong> | Cost Delta:{" "}
                  <strong>+15%</strong> | Feasibility: <strong>Medium</strong>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50/80 border border-slate-100 p-2.5">
                <div className="font-semibold text-slate-800">Southeast Asia Diversification</div>
                <div className="mt-1 text-[11px] leading-relaxed">
                  Lead Time: <strong>+3 Days</strong> | Cost Delta:{" "}
                  <strong className="text-emerald-700">-4%</strong> | Feasibility:{" "}
                  <strong className="text-emerald-700">Immediate</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 4: Quantitative Failure Cascade & Buffer Depletion
    // -------------------------------------------------------------
    {
      id: "cascade-depletion",
      title: "Time-Horizon Cascade Modeling & Safety Buffer Depletion",
      subtitle: "Day 0 to Day 60 failure progression and inventory exhaustion countdown",
      tag: "Cascade & Buffers",
      notes:
        "Daily inventory burn simulation modeling intermediate safety stocks, lead time gaps, and tier starvation inflection points.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                Day 0: Initial Shock
              </div>
              <div className="mt-2 text-2xl font-mono font-bold text-slate-800">
                {kpis.offlineNodes} Nodes
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Primary point of failure halts upstream output.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-amber-600 uppercase">
                Day 14: Buffers Thin
              </div>
              <div className="mt-2 text-2xl font-mono font-bold text-amber-600">${loss14Days}M</div>
              <p className="mt-1 text-[11px] text-slate-500">
                Lean Tier 1 assembly safety stock drops to 3d.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-rose-600 uppercase">
                Day 30: Line Starvation
              </div>
              <div className="mt-2 text-2xl font-mono font-bold text-rose-600">${loss30Days}M</div>
              <p className="mt-1 text-[11px] text-slate-500">
                OEM factory lines halt as component supplies dry up.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-rose-800 uppercase">
                Day 60: DC Depletion
              </div>
              <div className="mt-2 text-2xl font-mono font-bold text-rose-800">${loss60Days}M</div>
              <p className="mt-1 text-[11px] text-slate-500">
                Finished goods inventory exhausted at hubs.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs text-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-2">
              Downstream Facility Survivability Countdown
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              When an upstream supplier ceases output, downstream facilities operate autonomously by
              drawing on safety stock until their buffer days reach zero:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {network.nodes.slice(0, 8).map((node) => {
                const isOff = offline.has(node.id);
                const isAtRisk = !isOff && result.statuses[node.id] === "at-risk";
                return (
                  <div
                    key={node.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 transition-colors"
                  >
                    <div className="font-semibold text-slate-900 truncate">{node.label}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Buffer Days:</span>
                      <span className="font-mono font-bold text-slate-800">{node.bufferDays}d</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Condition:</span>
                      <span
                        className={`font-semibold ${isOff ? "text-rose-600" : isAtRisk ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        {isOff ? "Offline (0d)" : isAtRisk ? "Depleting" : "Nominal"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 5: Financial Stress Testing & Revenue at Risk
    // -------------------------------------------------------------
    {
      id: "financial-quantification",
      title: "Financial Stress Testing & Revenue Exposure Quantification",
      subtitle: "Unfulfilled demand modeling, daily burn rates, and working capital exposure",
      tag: "Financial Exposure",
      notes:
        "Calculated using unit value contribution ($1,250/finished unit, $250/subassembly) combined with MTTR restoration costs.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
              <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Immediate Daily Loss
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-rose-700">
                ${dailyLoss.toFixed(1)}M <span className="text-sm font-normal">/ day</span>
              </div>
              <p className="mt-1 text-[11px] text-rose-600">
                Immediate unfulfilled customer shipment burn rate.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                30-Day Cumulative Exposure
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-amber-700">${loss30Days}M</div>
              <p className="mt-1 text-[11px] text-amber-600">
                Full line stoppage after intermediate buffer exhaustion.
              </p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs">
              <div className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                Mean Recovery (MTTR) Cost
              </div>
              <div className="mt-2 text-3xl font-bold font-mono text-indigo-700">
                ${Math.round(dailyLoss * 18 * 10) / 10}M
              </div>
              <p className="mt-1 text-[11px] text-indigo-600">
                Expedited charter airfreight, overtime, and re-tooling.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <h4 className="font-semibold text-slate-900 mb-2.5">
                Revenue at Risk by Product Line
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-medium text-slate-800">
                    Hyperscale Cloud & Enterprise Systems
                  </span>
                  <span className="font-mono font-bold text-rose-600">58% of Total VaR</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-medium text-slate-800">
                    Commercial & Industrial OEM Deliveries
                  </span>
                  <span className="font-mono font-bold text-amber-600">28% of Total VaR</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-medium text-slate-800">
                    Spare Parts & Field Replacement Units
                  </span>
                  <span className="font-mono font-bold text-slate-700">14% of Total VaR</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <h4 className="font-semibold text-slate-900 mb-2.5">
                Balance Sheet & Insurance Sufficiency
              </h4>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Business Interruption Insurance:</strong> $25.0M policy limit with a
                    14-day waiting period deductible.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Working Capital Coverage Gap:</strong> Multi-node shock creates a $12.4M
                    liquidity gap beyond insurance limits.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Recommended Board Action:</strong> Establish a $15.0M standby credit
                    facility dedicated to contingency logistics.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 6: Critical Supplier Risk Matrix & Single-Source Vulnerability [NEW]
    // -------------------------------------------------------------
    {
      id: "supplier-risk-matrix",
      title: "Critical Supplier Vulnerability & Single-Source Exposure",
      subtitle: "BOM dependency analysis, supplier solvency indices, and qualification gaps",
      tag: "Supplier Risk Matrix",
      notes:
        "Evaluates vendor concentration, single-source dependency, and financial insolvency risk (Altman Z-score) across critical tier-2 and tier-3 bill of materials.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Single-Source BOM Share
                </span>
                <AlertTriangle className="size-4 text-rose-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-rose-600">34.8%</div>
              <p className="mt-1 text-[11px] text-slate-500">
                12 critical BOM items with zero qualified backup vendor.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Dual-Sourced Share
                </span>
                <CheckCircle2 className="size-4 text-indigo-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-indigo-600">46.2%</div>
              <p className="mt-1 text-[11px] text-slate-500">
                Backup supplier active with 30-day ramp lead time.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Multi-Source Commodity
                </span>
                <Check className="size-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">19.0%</div>
              <p className="mt-1 text-[11px] text-slate-500">
                Fungible spot and distributor catalog availability.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs text-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between">
              <span>Top Single-Source Critical Components & Supplier Health</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Audited Financial Stability & Tooling Status
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Component / Material</th>
                    <th className="px-3 py-2">Primary Supplier Entity</th>
                    <th className="px-3 py-2">Region</th>
                    <th className="px-3 py-2">Solvency (Z-Score)</th>
                    <th className="px-3 py-2">Switching Lead Time</th>
                    <th className="px-3 py-2 text-right">Vulnerability Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      part: "Advanced Substrate (ABF Film)",
                      vendor: "Ajinomoto Fine-Techno",
                      region: "Gunma, JP",
                      zscore: "3.4 (Safe)",
                      leadTime: "9 Months",
                      level: "Critical (No Alt)",
                      color: "text-rose-600 font-bold",
                    },
                    {
                      part: "Monocrystalline Silicon Ingots",
                      vendor: "Shin-Etsu Handotai",
                      region: "Niigata, JP",
                      zscore: "4.1 (Safe)",
                      leadTime: "6 Months",
                      level: "High",
                      color: "text-amber-600 font-semibold",
                    },
                    {
                      part: "Semiconductor Packaging Ceramic",
                      vendor: "Kyocera Microelectronics",
                      region: "Kyoto, JP",
                      zscore: "2.8 (Moderate)",
                      leadTime: "4 Months",
                      level: "High",
                      color: "text-amber-600 font-semibold",
                    },
                    {
                      part: "Lithium Hexafluorophosphate",
                      vendor: "Do-Fluoride Chemicals",
                      region: "Henan, CN",
                      zscore: "1.9 (Gray Zone)",
                      leadTime: "3 Months",
                      level: "Moderate Risk",
                      color: "text-amber-700 font-medium",
                    },
                    {
                      part: "High-Purity Quartz Crucibles",
                      vendor: "Sibelco Americas",
                      region: "Spruce Pine, US",
                      zscore: "3.6 (Safe)",
                      leadTime: "8 Months",
                      level: "Critical (Single Mine)",
                      color: "text-rose-600 font-bold",
                    },
                  ].map((row) => (
                    <tr key={row.part} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-medium text-slate-900">{row.part}</td>
                      <td className="px-3 py-2 text-slate-700">{row.vendor}</td>
                      <td className="px-3 py-2 text-slate-500">{row.region}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{row.zscore}</td>
                      <td className="px-3 py-2 font-mono text-slate-800">{row.leadTime}</td>
                      <td className={`px-3 py-2 text-right font-mono ${row.color}`}>{row.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 7: Alternative Sourcing & Rapid Dual-Vendor Qualification Playbook [NEW]
    // -------------------------------------------------------------
    {
      id: "dual-sourcing-playbook",
      title: "Alternative Sourcing & Rapid Dual-Vendor Playbook",
      subtitle: "Pre-qualified secondary suppliers, switching lead times, and tooling relocation",
      tag: "Dual-Sourcing Playbook",
      notes:
        "Execution playbook for activating secondary suppliers, establishing safety inventory buffers, and managing tooling transfer within 45 days.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Stage 1: Days 1-3
              </span>
              <h4 className="mt-1 text-xs font-bold text-slate-900">Trigger & Allocation</h4>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Formal invocation of dual-source framework contracts; reserve secondary capacity
                allocations.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Stage 2: Days 4-14
              </span>
              <h4 className="mt-1 text-xs font-bold text-slate-900">Tooling Transfer</h4>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Relocate backup molds and active fabrication dies to pre-audited regional facility.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Stage 3: Days 15-28
              </span>
              <h4 className="mt-1 text-xs font-bold text-slate-900">First-Article Audit</h4>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Accelerated pilot production run and certified quality assurance audit.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Stage 4: Days 29-45
              </span>
              <h4 className="mt-1 text-xs font-bold text-slate-900">Full Volume Ramp</h4>
              <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                Production reaches 100% nominal output; restore pipeline fulfillment.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs text-xs">
            <h4 className="font-semibold text-slate-900 mb-2.5 flex items-center justify-between">
              <span>Secondary Supplier Pre-Qualification Status Matrix</span>
              <span className="text-[11px] font-normal text-slate-500">
                Capital Required: $12.5M
              </span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Component Tier</th>
                    <th className="px-3 py-2">Primary Sourcing</th>
                    <th className="px-3 py-2">Pre-Qualified Alternate</th>
                    <th className="px-3 py-2">Alternate Region</th>
                    <th className="px-3 py-2">Unit Cost Delta</th>
                    <th className="px-3 py-2 text-right">Readiness Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      tier: "Tier 2 Substrate Packaging",
                      primary: "Kaohsiung Foundry (TW)",
                      alt: "Austin Microelectronics (US)",
                      region: "North America",
                      delta: "+8.5%",
                      status: "85% Qualified",
                      statusColor: "text-emerald-700 bg-emerald-50",
                    },
                    {
                      tier: "Tier 3 Chemical Precursors",
                      primary: "Taoyuan Chemical (TW)",
                      alt: "Dresden Materials (DE)",
                      region: "Europe",
                      delta: "+11.0%",
                      status: "Contract Ready",
                      statusColor: "text-indigo-700 bg-indigo-50",
                    },
                    {
                      tier: "Tier 1 Power Distribution",
                      primary: "Suzhou Assembly (CN)",
                      alt: "Guadalajara Electronics (MX)",
                      region: "USMCA",
                      delta: "+4.2%",
                      status: "Fully Audited",
                      statusColor: "text-emerald-700 bg-emerald-50",
                    },
                    {
                      tier: "Tier 2 Sensor Modules",
                      primary: "Penang Sensors (MY)",
                      alt: "Dublin Sensor Corp (IE)",
                      region: "Europe",
                      delta: "+6.0%",
                      status: "Pilot Pending",
                      statusColor: "text-amber-700 bg-amber-50",
                    },
                  ].map((item) => (
                    <tr key={item.tier} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-medium text-slate-900">{item.tier}</td>
                      <td className="px-3 py-2 text-slate-600">{item.primary}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{item.alt}</td>
                      <td className="px-3 py-2 text-slate-600">{item.region}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{item.delta}</td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold font-mono ${item.statusColor}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 8: Scope 3 ESG Logistics & Decarbonization Intelligence
    // -------------------------------------------------------------
    {
      id: "scope-3-esg",
      title: "Scope 3 ESG Logistics & Transport Decarbonization",
      subtitle:
        "Freight emissions, modal intensity breakdown, and regulatory carbon tax liabilities",
      tag: "ESG & Carbon",
      notes:
        "Calculated via Haversine great-circle distance modeling with standard freight emission factors (Air: 602g, Road: 62g, Maritime: 15g CO2e/t-km).",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-800 uppercase">
                Weekly Carbon Footprint
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-700">
                {esg.totalWeeklyTonsCO2.toLocaleString()}{" "}
                <span className="text-xs font-normal">t CO2e</span>
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-600">
                Annualized: {esg.totalAnnualTonsCO2.toLocaleString()} tonnes
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Carbon Intensity</div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
                {esg.carbonIntensityPerUnitKg}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">kg CO2e per finished unit</div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                Eco Sustainability Score
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
                {esg.sustainabilityScore} / 100
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Rating Grade: <strong>B+</strong>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">
                EU CBAM Liability
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-rose-600">
                ${Math.round((esg.totalAnnualTonsCO2 * 85) / 1000)}k
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Projected €85/ton carbon tariff
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <h4 className="font-semibold text-slate-900 mb-2.5">
                Freight Modal Share & Emissivity
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-medium text-slate-800">
                    Ocean Container (15g CO2e/t-km)
                  </span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    68% Volume | 12% CO2e
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-medium text-slate-800">
                    Continental Rail / Road (62g CO2e/t-km)
                  </span>
                  <span className="font-mono text-indigo-600 font-semibold">
                    24% Volume | 26% CO2e
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50">
                  <span className="font-medium text-slate-800">
                    Expedited Air Freight (602g CO2e/t-km)
                  </span>
                  <span className="font-mono text-rose-600 font-bold">8% Volume | 62% CO2e</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <h4 className="font-semibold text-slate-900 mb-2.5">2030 Decarbonization Levers</h4>
              <div className="space-y-2 text-slate-600">
                <div className="p-2.5 rounded-lg bg-emerald-50/60 text-emerald-900 border border-emerald-100/80">
                  <strong>Air-to-Ocean Mode Shift:</strong> Converting 35% of non-critical buffer
                  replenishments to ocean freight cuts 4,120 tonnes CO2e annually.
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50/60 text-indigo-900 border border-indigo-100/80">
                  <strong>Regional Nearshoring:</strong> Eliminating trans-Pacific expedited air
                  routes reduces lead time by 18 days and eliminates 860 tonnes CO2e.
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 9: Operational Technology (OT), Cyber & Digital Twin Posture [NEW]
    // -------------------------------------------------------------
    {
      id: "cyber-ot-telemetry",
      title: "Cyber, OT/SCADA & Operational Telemetry Architecture",
      subtitle:
        "Industrial network hardening, real-time IoT visibility, and digital twin simulation",
      tag: "Cyber & Telemetry",
      notes:
        "Assessment of ICS/SCADA plant network segmentation (ISA/IEC 62443 standard) and real-time transit telemetry integration.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  IoT Transit Tracking
                </span>
                <Server className="size-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">88%</div>
              <div className="mt-0.5 text-[11px] text-slate-500">Live GPS/sensor telemetry</div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  API Integration Depth
                </span>
                <Cpu className="size-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">92% Tier 1</div>
              <div className="mt-0.5 text-[11px] text-slate-500">64% Tier 2 / 38% Tier 3</div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  OT Hardening Grade
                </span>
                <Lock className="size-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">A- / 84</div>
              <div className="mt-0.5 text-[11px] text-slate-500">IEC 62443 compliance</div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Recovery Time Objective
                </span>
                <RefreshCw className="size-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-indigo-600">2.4 Hours</div>
              <div className="mt-0.5 text-[11px] text-slate-500">Automated cloud failover</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <h4 className="font-semibold text-slate-900 mb-2.5">
                OT & SCADA Cyber Threat Exposure
              </h4>
              <div className="space-y-2">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-800">
                      Tier 1 Automated Assembly Lines
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Zero-trust network micro-segmentation deployed
                    </div>
                  </div>
                  <span className="text-emerald-700 font-mono font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                    Hardened
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-800">
                      Tier 2 Remote Supplier CNC Ports
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Legacy remote telemetry bridges require MFA patch
                    </div>
                  </div>
                  <span className="text-amber-700 font-mono font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded">
                    Patching
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-800">
                      Distribution Warehouse Robotics
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Autonomous AMR fleets with encrypted local mesh
                    </div>
                  </div>
                  <span className="text-emerald-700 font-mono font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                    Protected
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <h4 className="font-semibold text-slate-900 mb-2.5">
                Digital Twin Simulation Architecture
              </h4>
              <div className="space-y-2 text-slate-600">
                <div className="p-2.5 rounded bg-indigo-50/60 text-indigo-950 border border-indigo-100">
                  <strong>Continuous Topological Modeling:</strong> Weekly graph recalculation
                  re-computes lead times, buffer depletion rates, and downstream blast radiuses.
                </div>
                <div className="p-2.5 rounded bg-slate-50 text-slate-800 border border-slate-100">
                  <strong>Early Warning Triggers:</strong> Autonomous alerts notify logistics
                  command center when supplier transit delays exceed 48 hours.
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 10: Industry Peer Benchmark & Supply Chain Maturity
    // -------------------------------------------------------------
    {
      id: "peer-benchmarks",
      title: "Industry Peer Benchmark & Supply Chain Maturity Index",
      subtitle: "Comparative resilience scorecards against top-quartile global manufacturers",
      tag: "Peer Benchmarking",
      notes:
        "Maturity assessed across 5 foundational dimensions of the Gartner/ASCM Supply Chain Resilience Framework.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            {[
              { pillar: "Multi-Sourcing Depth", score: 62, benchmark: 85, status: "Gap: -23pts" },
              {
                pillar: "Buffer Inventory Depth",
                score: 78,
                benchmark: 80,
                status: "Nominal: -2pts",
              },
              {
                pillar: "Digital Telemetry Visibility",
                score: 86,
                benchmark: 75,
                status: "Leader: +11pts",
              },
              { pillar: "Geographic Dispersion", score: 54, benchmark: 78, status: "Gap: -24pts" },
              {
                pillar: "ESG Carbon Compliance",
                score: 81,
                benchmark: 70,
                status: "Leader: +11pts",
              },
            ].map((item) => (
              <div
                key={item.pillar}
                className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-700 text-[11px]">{item.pillar}</div>
                  <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
                    {item.score} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Peer Benchmark: {item.benchmark}
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] font-medium">
                  <span
                    className={
                      item.status.includes("Leader")
                        ? "text-emerald-600"
                        : item.status.includes("Gap")
                          ? "text-rose-600"
                          : "text-slate-600"
                    }
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs text-xs">
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center justify-between">
              <span>Maturity Gap Mitigation Roadmap</span>
              <span className="text-[11px] font-normal text-slate-500">
                Target Completion: Q4 2027
              </span>
            </h4>
            <div className="grid grid-cols-3 gap-3 text-slate-600">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <strong className="text-slate-800">Close Geographic Concentration Gap:</strong>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Deploy secondary manufacturing qualification in North America and Central Europe
                  to lower HHI below 2,200.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <strong className="text-slate-800">Tier 2/3 Supplier Direct Contracts:</strong>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Bypass intermediary distributors for high-purity chemical contracts to gain direct
                  capacity allocation rights.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                <strong className="text-slate-800">Automated Risk Telemetry Expansion:</strong>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Extend API inventory tracking down to Tier 3 sub-suppliers for 100% early warning
                  coverage.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 11: 3-Year Strategic Resilience Master Roadmap (2026-2028) [NEW]
    // -------------------------------------------------------------
    {
      id: "strategic-roadmap",
      title: "3-Year Strategic Resilience Master Roadmap (2026 - 2028)",
      subtitle:
        "Phased transformation plan to achieve top-decile global supply chain antifragility",
      tag: "3-Year Roadmap",
      notes:
        "Execution roadmap structured in 3 progressive horizons to de-risk single-source dependencies and reduce 30-day VaR from $48M to under $11M.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                    Phase 1 • Q1-Q2 2026
                  </span>
                  <span className="font-mono text-indigo-700 font-bold">$18.5M</span>
                </div>
                <h4 className="mt-2.5 text-xs font-bold text-slate-900">
                  Immediate Triage & Buffer Fortification
                </h4>
                <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Expand safety stock buffers from 14d to 35d on 12 critical parts.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Establish $15M contingency liquidity facility.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Deploy real-time transit telemetry across maritime corridors.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-100 text-[11px] text-indigo-900 font-medium">
                Target VaR Reduction: <strong>-35% ($16.8M)</strong>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    Phase 2 • Q3 2026 - Q2 2027
                  </span>
                  <span className="font-mono text-slate-800 font-bold">$12.5M</span>
                </div>
                <h4 className="mt-2.5 text-xs font-bold text-slate-900">
                  Dual-Sourcing & Regional Nearshoring
                </h4>
                <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Complete qualification of backup foundries in USMCA and EU.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Transfer backup fabrication tooling and validate first-articles.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Transition 30% of trans-Pacific shipments to nearshore rail/road.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-700 font-medium">
                Cumulative VaR Reduction: <strong>-62% ($29.8M)</strong>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    Phase 3 • Q3 2027 - Q4 2028
                  </span>
                  <span className="font-mono text-slate-800 font-bold">$3.7M</span>
                </div>
                <h4 className="mt-2.5 text-xs font-bold text-slate-900">
                  Autonomous Digital Twin & Self-Healing Web
                </h4>
                <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Automated algorithmic purchase re-allocation on shock detection.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Zero critical single-source BOM items across entire catalog.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Net-zero freight certification across primary distribution lanes.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-700 font-medium">
                Terminal Target VaR: <strong>&lt; $11.0M (Top Decile)</strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-indigo-600" />
              <div>
                <span className="font-bold text-slate-900">Governance Oversight Cadence:</span>
                <span className="text-slate-600 ml-1">
                  Quarterly Board Audit & Risk Committee progress reviews with KPI dashboards.
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-indigo-600 text-xs">
              Maturity Target: 92 / 100
            </span>
          </div>
        </div>
      ),
    },

    // -------------------------------------------------------------
    // SLIDE 12: Board Action Plan & Capital Allocation Matrix
    // -------------------------------------------------------------
    {
      id: "board-action-plan",
      title: "Board Capital Allocation Matrix & Strategic Approvals",
      subtitle: "Formal Board resolutions, capital authorizations, and executive ownership",
      tag: "Board Approvals",
      notes:
        "Formal decision package presented for signature by the Board of Directors and Audit & Risk Committee.",
      content: (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200/80 bg-slate-50 font-semibold text-slate-600 text-[11px]">
                <tr>
                  <th className="px-3 py-2.5">Resolution / Strategic Initiative</th>
                  <th className="px-3 py-2.5">Capital (CAPEX/OPEX)</th>
                  <th className="px-3 py-2.5">Timeline</th>
                  <th className="px-3 py-2.5">VaR Reduction</th>
                  <th className="px-3 py-2.5">Executive Owner</th>
                  <th className="px-3 py-2.5 text-right">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    <div>1. Dual-Sourcing Qualification for Critical Chokepoints</div>
                    <div className="text-[11px] text-slate-500">
                      Qualify alternate foundries & chemical precursors in North America & EU
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                    $12.5M CAPEX
                  </td>
                  <td className="px-3 py-2.5 font-mono">8 Months</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-emerald-600">
                    -38% VaR ($18.2M)
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">Chief Procurement Officer</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                      Recommended
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    <div>2. Strategic Safety Buffer Fortification (Working Capital)</div>
                    <div className="text-[11px] text-slate-500">
                      Increase critical component inventory from 14d to 35d
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                    $18.0M Working Cap
                  </td>
                  <td className="px-3 py-2.5 font-mono">3 Months</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-emerald-600">
                    -52% Starvation Risk
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">Chief Supply Chain Officer</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                      Recommended
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    <div>3. Tier 2/3 Digital Telemetry & Automated Risk Warning</div>
                    <div className="text-[11px] text-slate-500">
                      Deploy IoT sensors and digital twin simulation across all supplier nodes
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">$4.2M OPEX</td>
                  <td className="px-3 py-2.5 font-mono">4 Months</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-emerald-600">
                    99% Early Warning
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">Chief Information Officer</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                      Recommended
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    <div>4. Regional Nearshore Subassembly & Final Packaging Campus</div>
                    <div className="text-[11px] text-slate-500">
                      Nearshore assembly campus in Mexico / Central Europe
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                    $26.0M CAPEX
                  </td>
                  <td className="px-3 py-2.5 font-mono">14 Months</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-emerald-600">
                    Sovereign Immunity
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">Chief Operating Officer</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Phase 2 Review
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <FileText className="size-4 text-indigo-600" />
                Formal Board Resolution Packet:
              </span>
              <p className="text-indigo-800 text-[11px] mt-0.5 leading-relaxed">
                "Resolved, that the Board of Directors authorizes the allocation of $34.7M across
                Initiatives 1, 2, and 3 to reinforce enterprise supply chain continuity and reduce
                operational VaR."
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResolutionsAdopted(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-semibold shadow-xs transition-colors shrink-0 ${
                resolutionsAdopted
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {resolutionsAdopted ? (
                <>
                  <Check className="size-4" />
                  Resolutions Adopted
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Adopt Resolutions
                </>
              )}
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl print:border-none print:shadow-none print:h-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
              C-1
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Executive Board Deck</span>
                <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700">
                  {activeChain.shortName}
                </span>
                <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[10px] font-mono">
                  CONFIDENTIAL // BOARD REVIEW
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Slide {currentSlide + 1} of {slides.length} • {slides[currentSlide]!.tag}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                showNotes
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title="Toggle Executive Technical Methodology Notes"
            >
              <Info className="size-3.5 text-indigo-600" />
              Notes Annex
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="size-3.5 text-slate-500" />
              Print / Export PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Slide Navigation Tabs / Jump Navigator */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-100/70 px-6 py-2 overflow-x-auto scrollbar-none print:hidden">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all whitespace-nowrap ${
                currentSlide === idx
                  ? "bg-white text-indigo-700 font-bold shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              {idx + 1}. {s.tag}
            </button>
          ))}
        </div>

        {/* Slide Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Nexus Risk Intelligence Deck • Slide {currentSlide + 1} of {slides.length}
              </span>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {slides[currentSlide]!.title}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">{slides[currentSlide]!.subtitle}</p>
            </div>

            {slides[currentSlide]!.content}

            {/* Expandable Notes Drawer */}
            {showNotes && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Info className="size-3.5 text-indigo-700" />
                  Executive Technical Methodology Notes:
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  {slides[currentSlide]!.notes}
                </p>
              </div>
            )}
          </div>

          {/* Slide Navigation Footer */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 print:hidden">
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlide === idx
                      ? "w-7 bg-indigo-600"
                      : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  title={`Go to Slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Use Arrow Keys or Spacebar to navigate
              </span>
              <button
                type="button"
                disabled={currentSlide === 0}
                onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={currentSlide === slides.length - 1}
                onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                Next Slide
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
