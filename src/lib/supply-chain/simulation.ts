import { inboundConcentration, riskProfile, shortfallAbsorption } from "./risk";
import type { NodeStatus, SupplyLink, SupplyNetwork, SupplyNode } from "./types";

export interface BufferDepletion {
  daysLeft: number;
  urgency: "critical" | "warning" | "stable";
  upstreamShortfall: number;
}

export interface SimulationResult {
  statuses: Record<string, NodeStatus>;
  /** 0-1 share of nominal output each node can still deliver under the scenario. */
  capability: Record<string, number>;
  impactedVolume: number;
  bottlenecks: string[];
  financialImpactWeeklyM: number;
  dailyDowntimeCostK: number;
  bufferDepletion: Record<string, BufferDepletion>;
}

/** Below this fulfilment level a node cannot run a line at all. */
const FAIL_THRESHOLD = 0.2;
/** Above this it is operating within normal tolerance. */
const HEALTHY_THRESHOLD = 0.97;

const inboundMap = (links: SupplyLink[]) => {
  const map = new Map<string, SupplyLink[]>();
  for (const l of links) {
    const list = map.get(l.target) ?? [];
    list.push(l);
    map.set(l.target, list);
  }
  return map;
};

export function statusFromCapability(capability: number): NodeStatus {
  if (capability < FAIL_THRESHOLD) return "failed";
  if (capability < HEALTHY_THRESHOLD) return "at-risk";
  return "healthy";
}

/**
 * Quantitative ripple propagation.
 *
 * Each node's fulfilment capability is the volume-weighted average capability of its
 * inbound flows. The resulting shortfall is then partially absorbed by that node's own
 * inventory buffer (bufferDays vs. recoveryDays + leadTimeDays), so a well-buffered
 * plant degrades where a lean one stops. Status is read off the surviving capability,
 * not a binary "all suppliers dead" rule.
 */
export function propagateFailures(
  network: SupplyNetwork,
  offline: ReadonlySet<string>,
): SimulationResult {
  const inbound = inboundMap(network.links);
  const capability: Record<string, number> = {};
  for (const n of network.nodes) capability[n.id] = offline.has(n.id) ? 0 : 1;

  // The graph is a DAG, so a bounded number of relaxation passes converges.
  for (let pass = 0; pass < network.nodes.length; pass++) {
    let changed = false;
    for (const n of network.nodes) {
      if (offline.has(n.id)) continue;
      const links = inbound.get(n.id) ?? [];
      if (links.length === 0) continue;

      const totalIn = links.reduce((s, l) => s + l.volume, 0);
      if (totalIn <= 0) continue;
      const supplied = links.reduce((s, l) => s + l.volume * (capability[l.source] ?? 1), 0);

      const shortfall = Math.max(0, 1 - supplied / totalIn);
      const absorbed = shortfall * shortfallAbsorption(n);
      const next = Math.min(1, Math.max(0, 1 - (shortfall - absorbed)));

      if (Math.abs((capability[n.id] ?? 1) - next) > 1e-4) {
        capability[n.id] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const statuses: Record<string, NodeStatus> = {};
  const bufferDepletion: Record<string, BufferDepletion> = {};

  for (const n of network.nodes) {
    const cap = capability[n.id] ?? 1;
    statuses[n.id] = offline.has(n.id) ? "failed" : statusFromCapability(cap);

    const links = inbound.get(n.id) ?? [];
    const totalIn = links.reduce((s, l) => s + l.volume, 0);
    const supplied = links.reduce((s, l) => s + l.volume * (capability[l.source] ?? 1), 0);
    const upstreamShortfall = totalIn > 0 ? Math.max(0, 1 - supplied / totalIn) : 0;

    // Days until buffer runs dry if shortfall continues
    const daysLeft = offline.has(n.id)
      ? 0
      : upstreamShortfall > 0.05
        ? Math.max(0, Math.round(n.bufferDays / upstreamShortfall))
        : n.bufferDays;

    const urgency: "critical" | "warning" | "stable" =
      daysLeft <= 4 || offline.has(n.id) ? "critical" : daysLeft <= 12 ? "warning" : "stable";

    bufferDepletion[n.id] = {
      daysLeft,
      urgency,
      upstreamShortfall: Math.round(upstreamShortfall * 100),
    };
  }

  const impactedVolume = network.nodes.reduce(
    (sum, n) => sum + n.volume * (1 - (capability[n.id] ?? 1)),
    0,
  );

  // Financial impact: Factory & distribution output at ~$1,250/unit, components at ~$250/unit
  const financialImpactWeeklyM = network.nodes.reduce((sum, n) => {
    const lostVolume = n.volume * (1 - (capability[n.id] ?? 1));
    const unitPrice = n.type === "factory" || n.type === "distribution" ? 1250 : 250;
    return sum + (lostVolume * unitPrice) / 1_000_000;
  }, 0);

  const dailyDowntimeCostK = Math.round((financialImpactWeeklyM * 1000) / 7);

  return {
    statuses,
    capability,
    impactedVolume: Math.round(impactedVolume),
    bottlenecks: findBottlenecks(network),
    financialImpactWeeklyM: Math.round(financialImpactWeeklyM * 10) / 10,
    dailyDowntimeCostK,
    bufferDepletion,
  };
}

export interface TimeHorizonResult extends SimulationResult {
  currentDay: number;
  cumulativeFinancialLossM: number;
  starvingNodes: string[];
  daysRemainingByNode: Record<string, number>;
}

/**
 * Simulates cascading failure propagation over time (Day 0 to Day 60).
 *
 * Intermediate facilities consume safety buffers during upstream disruptions.
 * As days pass, on-hand inventory buffers deplete. Once depleted (daysRemaining === 0),
 * lines starve and output halts, accelerating cumulative financial loss.
 */
export function propagateFailuresOverTime(
  network: SupplyNetwork,
  offline: ReadonlySet<string>,
  currentDay: number,
): TimeHorizonResult {
  const base = propagateFailures(network, offline);
  if (offline.size === 0 || currentDay === 0) {
    const daysRemainingByNode: Record<string, number> = {};
    for (const n of network.nodes) {
      daysRemainingByNode[n.id] = n.bufferDays;
    }
    return {
      ...base,
      currentDay,
      cumulativeFinancialLossM: 0,
      starvingNodes: [],
      daysRemainingByNode,
    };
  }

  const inbound = inboundMap(network.links);
  const daysRemainingByNode: Record<string, number> = {};
  const starvingNodes: string[] = [];
  const timedCapability: Record<string, number> = {};
  const timedStatuses: Record<string, NodeStatus> = {};

  // Compute buffer countdown & timed line survival
  for (const n of network.nodes) {
    if (offline.has(n.id)) {
      daysRemainingByNode[n.id] = 0;
      starvingNodes.push(n.id);
      timedCapability[n.id] = 0;
      timedStatuses[n.id] = "failed";
      continue;
    }

    const links = inbound.get(n.id) ?? [];
    if (links.length === 0) {
      // Raw nodes with no inbound suppliers
      daysRemainingByNode[n.id] = n.bufferDays;
      timedCapability[n.id] = 1;
      timedStatuses[n.id] = "healthy";
      continue;
    }

    const totalIn = links.reduce((s, l) => s + l.volume, 0);
    const suppliedNominal = links.reduce(
      (s, l) => s + l.volume * (base.capability[l.source] ?? 1),
      0,
    );
    const hasShortfall = totalIn > 0 && suppliedNominal < totalIn * 0.95;

    if (!hasShortfall) {
      daysRemainingByNode[n.id] = n.bufferDays;
      timedCapability[n.id] = 1;
      timedStatuses[n.id] = "healthy";
    } else {
      // Depleting safety buffer over time
      const daysLeft = Math.max(0, n.bufferDays - currentDay);
      daysRemainingByNode[n.id] = daysLeft;

      if (daysLeft > 0) {
        // Line still operating on on-hand buffer stock
        timedCapability[n.id] = Math.max(0.7, base.capability[n.id] ?? 0.8);
        timedStatuses[n.id] = daysLeft <= 4 ? "at-risk" : "healthy";
      } else {
        // Buffer exhausted: Line starves
        starvingNodes.push(n.id);
        timedCapability[n.id] = base.capability[n.id] ?? 0;
        timedStatuses[n.id] = base.statuses[n.id] ?? "failed";
      }
    }
  }

  // Calculate cumulative loss from Day 0 to currentDay ($M)
  let cumulativeLoss = 0;
  for (let d = 1; d <= currentDay; d++) {
    // Loss incurred on day d across all nodes
    let dayLoss = 0;
    for (const n of network.nodes) {
      const unitPrice = n.type === "factory" || n.type === "distribution" ? 1250 : 250;
      const isDown = offline.has(n.id) || (d >= n.bufferDays && (base.capability[n.id] ?? 1) < 0.5);
      if (isDown) {
        dayLoss += (n.volume * unitPrice) / (7 * 1_000_000);
      }
    }
    cumulativeLoss += dayLoss;
  }

  const impactedVol = network.nodes.reduce(
    (sum, n) => sum + n.volume * (1 - (timedCapability[n.id] ?? 1)),
    0,
  );

  return {
    ...base,
    statuses: timedStatuses,
    capability: timedCapability,
    impactedVolume: Math.round(impactedVol),
    currentDay,
    cumulativeFinancialLossM: Math.round(cumulativeLoss * 10) / 10,
    starvingNodes,
    daysRemainingByNode,
  };
}

/**
 * Structural bottlenecks: a node whose inbound flow is effectively sole-sourced
 * (Herfindahl index >= 0.6) while carrying a material share of downstream volume.
 */
export function findBottlenecks(network: SupplyNetwork): string[] {
  return network.nodes
    .filter((n) => {
      const inboundCount = network.links.filter((l) => l.target === n.id).length;
      if (inboundCount === 0) return false;
      const profile = riskProfile(network, n);
      return inboundConcentration(network.links, n.id) >= 0.6 && profile.impact >= 30;
    })
    .map((n) => n.id);
}

export interface NetworkKpis {
  totalNodes: number;
  activeNodes: number;
  offlineNodes: number;
  atRiskNodes: number;
  healthScore: number;
  bottlenecks: number;
  impactedVolume: number;
  /** Volume-weighted mean risk score across the network, 0-100. */
  averageRisk: number;
  financialImpactWeeklyM: number;
  dailyDowntimeCostK: number;
  criticalBufferNodes: number;
}

export function computeKpis(network: SupplyNetwork, result: SimulationResult): NetworkKpis {
  const totalNodes = network.nodes.length;
  const offlineNodes = network.nodes.filter((n) => result.statuses[n.id] === "failed").length;
  const atRiskNodes = network.nodes.filter((n) => result.statuses[n.id] === "at-risk").length;
  const activeNodes = totalNodes - offlineNodes;

  const totalVolume = network.nodes.reduce((s, n) => s + n.volume, 0);
  // Health = served volume as a share of nominal volume, straight from the model.
  const servedVolume = network.nodes.reduce(
    (s, n) => s + n.volume * (result.capability[n.id] ?? 1),
    0,
  );
  const healthScore =
    totalVolume > 0 ? Math.max(0, Math.round((servedVolume / totalVolume) * 100)) : 0;

  const averageRisk =
    totalVolume > 0
      ? Math.round(network.nodes.reduce((s, n) => s + n.risk_score * n.volume, 0) / totalVolume)
      : 0;

  const criticalBufferNodes = Object.values(result.bufferDepletion).filter(
    (b) => b.urgency === "critical",
  ).length;

  return {
    totalNodes,
    activeNodes,
    offlineNodes,
    atRiskNodes,
    healthScore,
    bottlenecks: result.bottlenecks.length,
    impactedVolume: result.impactedVolume,
    averageRisk,
    financialImpactWeeklyM: result.financialImpactWeeklyM,
    dailyDowntimeCostK: result.dailyDowntimeCostK,
    criticalBufferNodes,
  };
}

export function downstreamOf(network: SupplyNetwork, id: string): SupplyNode[] {
  const byId = new Map(network.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
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
  return [...seen].map((s) => byId.get(s)!).filter(Boolean);
}

export function directNeighbors(network: SupplyNetwork, id: string) {
  const byId = new Map(network.nodes.map((n) => [n.id, n]));
  const suppliers = network.links
    .filter((l) => l.target === id)
    .map((l) => byId.get(l.source)!)
    .filter(Boolean);
  const customers = network.links
    .filter((l) => l.source === id)
    .map((l) => byId.get(l.target)!)
    .filter(Boolean);
  return { suppliers, customers };
}
