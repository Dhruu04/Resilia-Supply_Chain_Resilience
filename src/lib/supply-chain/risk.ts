import type { SupplyLink, SupplyNetwork, SupplyNode } from "./types";

/**
 * Risk model
 * ==========
 * Every node's risk score is derived from observable attributes, never hand-set.
 *
 *   risk_score = 100 * (blend * likelihood + (1 - blend) * impact)
 *
 * Likelihood — how probable is a disruption at this entity?
 *   geopolitical   country/region instability index
 *   financial      1 - financialHealth/100
 *   capacity       utilisation above 0.6 leaves no surge headroom
 *   leadTime       long replenishment = little room to react
 *
 * Impact — how much damage if it does go down?
 *   concentration  inbound Herfindahl index (single-sourcing exposure)
 *   criticality    share of total network volume reachable downstream
 *   recovery       recoveryDays vs. the buffer days available to absorb it
 *
 * All weights are tunable at runtime from the Settings page.
 */

/** Country instability index, 0 (stable) - 100 (severe). Keyed by ISO-2 suffix of `region`. */
export const COUNTRY_RISK: Record<string, number> = {
  CD: 88,
  CN: 62,
  TW: 70,
  VN: 48,
  BR: 45,
  IN: 40,
  MY: 35,
  MX: 33,
  KR: 30,
  SK: 26,
  PL: 28,
  JP: 22,
  PT: 20,
  SG: 18,
  DE: 16,
  US: 15,
  CA: 14,
  SE: 12,
  NL: 12,
};

const DEFAULT_COUNTRY_RISK = 45;
/** Planning horizon (days) used to normalise lead time and recovery exposure. */
export const HORIZON_DAYS = 30;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export interface RiskWeights {
  geopolitical: number;
  financial: number;
  capacity: number;
  leadTime: number;
  concentration: number;
  criticality: number;
  recovery: number;
  /** 0-1 share of the composite driven by likelihood (remainder is impact). */
  blend: number;
}

export const DEFAULT_WEIGHTS: RiskWeights = {
  geopolitical: 0.3,
  financial: 0.25,
  capacity: 0.25,
  leadTime: 0.2,
  concentration: 0.35,
  criticality: 0.4,
  recovery: 0.25,
  blend: 0.55,
};

export function countryOf(region: string): string {
  const parts = region.split(",");
  return (parts[parts.length - 1] ?? "").trim().toUpperCase();
}

export function countryRisk(region: string): number {
  return COUNTRY_RISK[countryOf(region)] ?? DEFAULT_COUNTRY_RISK;
}

export function geopoliticalRisk(node: SupplyNode): number {
  return countryRisk(node.region) / 100;
}

/** Inbound Herfindahl-Hirschman index: 1 = fully single-sourced, ~1/n = balanced. */
export function inboundConcentration(links: SupplyLink[], id: string): number {
  const inbound = links.filter((l) => l.target === id);
  if (inbound.length === 0) return 1; // origin node: its own supply is inherently sole-sourced
  const total = inbound.reduce((s, l) => s + l.volume, 0);
  if (total <= 0) return 1;
  return inbound.reduce((s, l) => s + (l.volume / total) ** 2, 0);
}

/** Share of total network weekly volume that sits downstream of this node (incl. itself). */
export function criticality(network: SupplyNetwork, id: string): number {
  const byId = new Map(network.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const l of network.links) {
      if (l.source === cur && !seen.has(l.target)) {
        seen.add(l.target);
        queue.push(l.target);
      }
    }
  }
  const total = network.nodes.reduce((s, n) => s + n.volume, 0);
  const reach = [...seen].reduce((s, nid) => s + (byId.get(nid)?.volume ?? 0), 0);
  return total > 0 ? clamp01(reach / total) : 0;
}

export interface RiskFactors {
  geopolitical: number;
  financial: number;
  capacity: number;
  leadTime: number;
  concentration: number;
  criticality: number;
  recovery: number;
}

export interface RiskProfile {
  score: number;
  likelihood: number;
  impact: number;
  factors: RiskFactors;
  /** 0-1 fraction of a supply shortfall this node can absorb from inventory */
  absorption: number;
  band: "low" | "moderate" | "elevated" | "severe";
}

export function riskBand(score: number): RiskProfile["band"] {
  if (score >= 70) return "severe";
  if (score >= 50) return "elevated";
  if (score >= 30) return "moderate";
  return "low";
}

/** Buffer stock absorbs part of an upstream shortfall until recovery completes. */
export function shortfallAbsorption(node: SupplyNode): number {
  return clamp01(node.bufferDays / Math.max(1, node.recoveryDays + node.leadTimeDays));
}

const wavg = (pairs: [number, number][]) => {
  const total = pairs.reduce((s, [w]) => s + w, 0);
  if (total <= 0) return 0;
  return pairs.reduce((s, [w, v]) => s + w * v, 0) / total;
};

export function riskProfile(
  network: SupplyNetwork,
  node: SupplyNode,
  weights: RiskWeights = DEFAULT_WEIGHTS,
): RiskProfile {
  const factors: RiskFactors = {
    geopolitical: geopoliticalRisk(node),
    financial: clamp01(1 - node.financialHealth / 100),
    capacity: clamp01((node.capacityUtilization - 0.6) / 0.4),
    leadTime: clamp01(node.leadTimeDays / HORIZON_DAYS),
    concentration: inboundConcentration(network.links, node.id),
    criticality: Math.sqrt(criticality(network, node.id)),
    recovery: clamp01(node.recoveryDays / Math.max(1, node.recoveryDays + node.bufferDays)),
  };

  const likelihood = wavg([
    [weights.geopolitical, factors.geopolitical],
    [weights.financial, factors.financial],
    [weights.capacity, factors.capacity],
    [weights.leadTime, factors.leadTime],
  ]);

  const impact = wavg([
    [weights.concentration, factors.concentration],
    [weights.criticality, factors.criticality],
    [weights.recovery, factors.recovery],
  ]);

  const blend = clamp01(weights.blend);
  const score = 100 * (blend * likelihood + (1 - blend) * impact);

  return {
    score: Math.round(score),
    likelihood: Math.round(likelihood * 100),
    impact: Math.round(impact * 100),
    factors,
    absorption: shortfallAbsorption(node),
    band: riskBand(score),
  };
}

export type RiskIndex = Record<string, RiskProfile>;

export function buildRiskIndex(
  network: SupplyNetwork,
  weights: RiskWeights = DEFAULT_WEIGHTS,
): RiskIndex {
  const index: RiskIndex = {};
  for (const n of network.nodes) index[n.id] = riskProfile(network, n, weights);
  return index;
}

/** Returns a network whose nodes carry model-derived risk scores. */
export function scoreNetwork(
  network: SupplyNetwork,
  weights: RiskWeights = DEFAULT_WEIGHTS,
): { network: SupplyNetwork; risk: RiskIndex } {
  const risk = buildRiskIndex(network, weights);
  return {
    network: {
      links: network.links,
      nodes: network.nodes.map((n) => ({ ...n, risk_score: risk[n.id]!.score })),
    },
    risk,
  };
}

export const FACTOR_LABEL: Record<keyof RiskFactors, string> = {
  geopolitical: "Geopolitical",
  financial: "Financial",
  capacity: "Capacity",
  leadTime: "Lead time",
  concentration: "Concentration",
  criticality: "Criticality",
  recovery: "Recovery",
};

export const FACTOR_KEYS = Object.keys(FACTOR_LABEL) as (keyof RiskFactors)[];
