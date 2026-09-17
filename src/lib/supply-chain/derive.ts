import { countryOf, countryRisk, inboundConcentration, type RiskIndex } from "./risk";
import type { SimulationResult } from "./simulation";
import { directNeighbors, downstreamOf } from "./simulation";
import type { NodeTier, SupplyNetwork, SupplyNode } from "./types";
import { TIER_LABEL, TIER_ORDER } from "./types";

export type Severity = "critical" | "warning" | "info";

export interface RiskAlert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  nodeId?: string;
  category: "status" | "concentration" | "score" | "capacity" | "geo" | "watchlist";
}

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function buildAlerts(
  network: SupplyNetwork,
  risk: RiskIndex,
  result: SimulationResult,
  watchlist: ReadonlySet<string>,
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  for (const n of network.nodes) {
    const status = result.statuses[n.id] ?? "healthy";
    const profile = risk[n.id];
    if (!profile) continue;
    const fulfilment = Math.round((result.capability[n.id] ?? 1) * 100);

    if (status === "failed") {
      alerts.push({
        id: `status-${n.id}`,
        severity: "critical",
        title: `${n.label} is offline`,
        detail: `Fulfilment at ${fulfilment}% · ${n.volume.toLocaleString()} units/week nominal output halted.`,
        nodeId: n.id,
        category: "status",
      });
    } else if (status === "at-risk") {
      alerts.push({
        id: `status-${n.id}`,
        severity: "warning",
        title: `${n.label} degraded`,
        detail: `Running at ${fulfilment}% of nominal output under the active scenario.`,
        nodeId: n.id,
        category: "status",
      });
    }

    const hhi = inboundConcentration(network.links, n.id);
    const inboundCount = network.links.filter((l) => l.target === n.id).length;
    if (inboundCount === 1 && profile.impact >= 30) {
      alerts.push({
        id: `sole-${n.id}`,
        severity: "warning",
        title: `${n.label} is sole-sourced`,
        detail: `Single inbound supplier with impact score ${profile.impact}. Qualify a second source.`,
        nodeId: n.id,
        category: "concentration",
      });
    } else if (inboundCount > 1 && hhi >= 0.6) {
      alerts.push({
        id: `conc-${n.id}`,
        severity: "info",
        title: `${n.label} inbound flow is concentrated`,
        detail: `Herfindahl index ${hhi.toFixed(2)} — one supplier dominates inbound volume.`,
        nodeId: n.id,
        category: "concentration",
      });
    }

    if (profile.band === "severe") {
      alerts.push({
        id: `score-${n.id}`,
        severity: "critical",
        title: `${n.label} scores severe risk (${profile.score})`,
        detail: `Likelihood ${profile.likelihood} · impact ${profile.impact}. Escalate to sourcing review.`,
        nodeId: n.id,
        category: "score",
      });
    }

    if (n.capacityUtilization >= 0.92) {
      alerts.push({
        id: `cap-${n.id}`,
        severity: "warning",
        title: `${n.label} has no capacity headroom`,
        detail: `Running at ${Math.round(n.capacityUtilization * 100)}% of nameplate capacity — cannot absorb surge demand.`,
        nodeId: n.id,
        category: "capacity",
      });
    }

    if (countryRisk(n.region) >= 70) {
      alerts.push({
        id: `geo-${n.id}`,
        severity: "warning",
        title: `${n.label} sits in a high-instability region`,
        detail: `${n.region} carries a country instability index of ${countryRisk(n.region)}.`,
        nodeId: n.id,
        category: "geo",
      });
    }

    if (watchlist.has(n.id) && profile.score >= 50) {
      alerts.push({
        id: `watch-${n.id}`,
        severity: "info",
        title: `Watchlist: ${n.label} above threshold`,
        detail: `Risk score ${profile.score} (${profile.band}) on a watched entity.`,
        nodeId: n.id,
        category: "watchlist",
      });
    }
  }

  return alerts.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.title.localeCompare(b.title),
  );
}

export interface TierStat {
  tier: NodeTier;
  label: string;
  short: string;
  nodes: number;
  volume: number;
  avgRisk: number;
  offline: number;
  atRisk: number;
}

const SHORT: Record<NodeTier, string> = {
  raw: "Raw",
  component: "Component",
  subassembly: "Sub-assy",
  factory: "Assembly",
  distribution: "Distribution",
};

export function tierStats(
  network: SupplyNetwork,
  risk: RiskIndex,
  result: SimulationResult,
): TierStat[] {
  return TIER_ORDER.map((tier) => {
    const nodes = network.nodes.filter((n) => n.type === tier);
    const volume = nodes.reduce((s, n) => s + n.volume, 0);
    const avgRisk =
      nodes.length > 0
        ? Math.round(nodes.reduce((s, n) => s + (risk[n.id]?.score ?? 0), 0) / nodes.length)
        : 0;
    return {
      tier,
      label: TIER_LABEL[tier],
      short: SHORT[tier],
      nodes: nodes.length,
      volume,
      avgRisk,
      offline: nodes.filter((n) => result.statuses[n.id] === "failed").length,
      atRisk: nodes.filter((n) => result.statuses[n.id] === "at-risk").length,
    };
  });
}

export interface RegionStat {
  country: string;
  regions: string[];
  nodes: SupplyNode[];
  volume: number;
  volumeShare: number;
  avgRisk: number;
  instability: number;
  offline: number;
}

export function regionExposure(network: SupplyNetwork, risk: RiskIndex): RegionStat[] {
  const total = network.nodes.reduce((s, n) => s + n.volume, 0) || 1;
  const map = new Map<string, SupplyNode[]>();
  for (const n of network.nodes) {
    const c = countryOf(n.region) || "??";
    map.set(c, [...(map.get(c) ?? []), n]);
  }
  return [...map.entries()]
    .map(([country, nodes]) => {
      const volume = nodes.reduce((s, n) => s + n.volume, 0);
      return {
        country,
        regions: [...new Set(nodes.map((n) => n.region))],
        nodes,
        volume,
        volumeShare: volume / total,
        avgRisk: Math.round(nodes.reduce((s, n) => s + (risk[n.id]?.score ?? 0), 0) / nodes.length),
        instability: countryRisk(nodes[0]!.region),
        offline: 0,
      };
    })
    .sort((a, b) => b.volume - a.volume);
}

/** Ranked single-point-of-failure analysis: what one node going down costs the network. */
export interface FailureImpact {
  node: SupplyNode;
  downstreamNodes: number;
  downstreamVolume: number;
  volumeShare: number;
  suppliers: number;
  customers: number;
}

export function failureImpacts(network: SupplyNetwork): FailureImpact[] {
  const total = network.nodes.reduce((s, n) => s + n.volume, 0) || 1;
  return network.nodes
    .map((node) => {
      const down = downstreamOf(network, node.id);
      const { suppliers, customers } = directNeighbors(network, node.id);
      const downstreamVolume = down.reduce((s, n) => s + n.volume, 0) + node.volume;
      return {
        node,
        downstreamNodes: down.length,
        downstreamVolume,
        volumeShare: downstreamVolume / total,
        suppliers: suppliers.length,
        customers: customers.length,
      };
    })
    .sort((a, b) => b.downstreamVolume - a.downstreamVolume);
}

export const COUNTRY_NAME: Record<string, string> = {
  CD: "DR Congo",
  CN: "China",
  TW: "Taiwan",
  VN: "Vietnam",
  BR: "Brazil",
  IN: "India",
  MY: "Malaysia",
  MX: "Mexico",
  KR: "South Korea",
  SK: "Slovakia",
  PL: "Poland",
  JP: "Japan",
  PT: "Portugal",
  SG: "Singapore",
  DE: "Germany",
  US: "United States",
  CA: "Canada",
  SE: "Sweden",
  NL: "Netherlands",
};

export const countryName = (iso: string) => COUNTRY_NAME[iso] ?? iso;

function csvEscape(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function nodesToCsv(
  network: SupplyNetwork,
  risk: RiskIndex,
  result: SimulationResult,
): string {
  const header = [
    "id",
    "label",
    "tier",
    "region",
    "country",
    "volume_per_week",
    "risk_score",
    "risk_band",
    "likelihood",
    "impact",
    "lead_time_days",
    "buffer_days",
    "recovery_days",
    "capacity_utilization",
    "financial_health",
    "status",
    "fulfilment_pct",
  ];
  const rows = network.nodes.map((n) => {
    const p = risk[n.id];
    return [
      n.id,
      n.label,
      n.type,
      n.region,
      countryOf(n.region),
      n.volume,
      p?.score ?? 0,
      p?.band ?? "low",
      p?.likelihood ?? 0,
      p?.impact ?? 0,
      n.leadTimeDays,
      n.bufferDays,
      n.recoveryDays,
      n.capacityUtilization,
      n.financialHealth,
      result.statuses[n.id] ?? "healthy",
      Math.round((result.capability[n.id] ?? 1) * 100),
    ]
      .map(csvEscape)
      .join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export function linksToCsv(network: SupplyNetwork): string {
  return [
    "source,target,volume",
    ...network.links.map((l) => `${l.source},${l.target},${l.volume}`),
  ].join("\n");
}

export function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
