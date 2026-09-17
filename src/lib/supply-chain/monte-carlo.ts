import { propagateFailures } from "./simulation";
import type { SupplyNetwork, SupplyNode } from "./types";

export interface MonteCarloTrial {
  trialIndex: number;
  failedNodeIds: string[];
  financialLossM: number;
  impactedVolume: number;
  durationDays: number;
}

export interface LossHistogramBin {
  rangeLabel: string;
  minLoss: number;
  maxLoss: number;
  count: number;
  frequency: number;
  cumulativeProbability: number;
}

export interface LossExceedancePoint {
  lossM: number;
  exceedanceProbability: number; // P(Loss >= lossM)
}

export interface SensitivityDriver {
  nodeId: string;
  label: string;
  region: string;
  tier: string;
  baseRiskScore: number;
  marginalVarImpactM: number; // how much VaR drops if this node is made resilient
  failureRateInSim: number; // % of trials where this node failed
}

export interface MonteCarloConfig {
  iterations: number; // 500, 1000, 2500, 5000
  correlation: "none" | "regional" | "systematic"; // Copula correlation structure
  correlationStrength: number; // 0 to 0.8
  timeHorizonDays: number; // 30, 90, 365
  seed?: number;
}

export interface MonteCarloResult {
  config: MonteCarloConfig;
  executionTimeMs: number;
  totalTrials: number;
  
  // Key Actuarial & Financial Metrics
  meanLossM: number; // Expected Annual Loss (EAL)
  medianLossM: number;
  stdDevLossM: number;
  maxLossM: number;
  minLossM: number;
  
  var90M: number; // Value at Risk 90%
  var95M: number; // Value at Risk 95% (1-in-20 year shock)
  var99M: number; // Value at Risk 99% (1-in-100 year Black Swan)
  cvar95M: number; // Conditional VaR / Expected Shortfall in worst 5%
  
  lossProbability: number; // % of trials with loss > 0
  severeLossProbability: number; // % of trials with loss >= var95M
  
  // Visual Data Structures
  histogram: LossHistogramBin[];
  exceedanceCurve: LossExceedancePoint[];
  topDrivers: SensitivityDriver[];
}

/**
 * Standard Normal pseudo-random generator using Box-Muller transform
 */
function randomNormal(mean = 0, stdDev = 1): number {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Standard normal cumulative distribution function (CDF approximation)
 */
function standardNormalCDF(x: number): number {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2.0);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1.0 - p : p;
}

/**
 * Maps a supplier's composite risk score (0-100) into an annual disruption probability P_i in [0.015, 0.48]
 */
export function calculateAnnualFailureProbability(
  node: SupplyNode,
  horizonDays = 365,
): number {
  // Base annualized probability calibrated from 7 risk pillars
  // Healthy (0-35): 1.5% - 5%
  // Moderate (36-65): 6% - 18%
  // Critical (66-100): 19% - 48%
  const normalized = node.risk_score / 100;
  const annualP = 0.015 + 0.465 * Math.pow(normalized, 1.6);
  
  // Scale by time horizon (Poisson arrival probability for horizon t)
  const timeFactor = horizonDays / 365;
  return 1 - Math.exp(-annualP * timeFactor);
}

/**
 * Runs the Monte Carlo Simulation across the supply chain digital twin.
 */
export function runMonteCarloSimulation(
  network: SupplyNetwork,
  config: Partial<MonteCarloConfig> = {},
): MonteCarloResult {
  const startTime = performance.now();

  const fullConfig: MonteCarloConfig = {
    iterations: config.iterations ?? 1000,
    correlation: config.correlation ?? "regional",
    correlationStrength:
      config.correlationStrength ??
      (config.correlation === "systematic"
        ? 0.65
        : config.correlation === "regional"
          ? 0.4
          : 0),
    timeHorizonDays: config.timeHorizonDays ?? 365,
  };

  const { iterations, correlation, correlationStrength, timeHorizonDays } = fullConfig;

  // 1. Group nodes by region to support Gaussian copula correlation
  const regions = Array.from(new Set(network.nodes.map((n) => n.region)));
  const regionIndexMap = new Map<string, number>();
  regions.forEach((r, idx) => regionIndexMap.set(r, idx));

  // Precompute failure thresholds for each node (inverse normal threshold)
  const nodeThresholds = new Map<string, number>();
  for (const node of network.nodes) {
    const p = calculateAnnualFailureProbability(node, timeHorizonDays);
    // Threshold in standard normal: fail if Z > threshold
    // Using rational approximation for standard normal inverse CDF
    const zCrit = approximateNormInv(1 - p);
    nodeThresholds.set(node.id, zCrit);
  }

  // Pre-calculate baseline offline node set
  const baseOffline = new Set(
    network.nodes.filter((n) => n.status === "failed").map((n) => n.id),
  );

  const trials: MonteCarloTrial[] = [];
  const nodeFailureCounts = new Map<string, number>();
  for (const n of network.nodes) nodeFailureCounts.set(n.id, 0);

  const rho = correlationStrength;
  const sqrtRho = Math.sqrt(rho);
  const sqrtOneMinusRho = Math.sqrt(1 - rho);

  // 2. Execute stochastic trials
  for (let t = 0; t < iterations; t++) {
    // Systematic common market shock factor
    const systematicShock = randomNormal();

    // Regional common shock factors
    const regionalShocks = new Float64Array(regions.length);
    for (let r = 0; r < regions.length; r++) {
      if (correlation === "systematic") {
        regionalShocks[r] =
          sqrtRho * systematicShock + sqrtOneMinusRho * randomNormal();
      } else if (correlation === "regional") {
        regionalShocks[r] = randomNormal();
      } else {
        regionalShocks[r] = 0;
      }
    }

    // Determine node disruptions in trial
    const trialFailedNodes = new Set<string>(baseOffline);

    for (const node of network.nodes) {
      if (baseOffline.has(node.id)) continue;

      const regIdx = regionIndexMap.get(node.region) ?? 0;
      const commonFactor = regionalShocks[regIdx] ?? 0;
      const idiosyncraticShock = randomNormal();

      let z: number;
      if (correlation === "none") {
        z = idiosyncraticShock;
      } else {
        z = sqrtRho * commonFactor + sqrtOneMinusRho * idiosyncraticShock;
      }

      const threshold = nodeThresholds.get(node.id) ?? 2.5;
      if (z >= threshold) {
        trialFailedNodes.add(node.id);
        nodeFailureCounts.set(node.id, (nodeFailureCounts.get(node.id) ?? 0) + 1);
      }
    }

    // Evaluate cascade propagation and financial loss
    let trialLossM = 0;
    let impactedVol = 0;

    if (trialFailedNodes.size > 0) {
      const sim = propagateFailures(network, trialFailedNodes);
      trialLossM = sim.financialImpactWeeklyM;
      impactedVol = sim.impactedVolume;
    }

    // Randomize outage duration based on recovery days
    const durationDays =
      trialFailedNodes.size > 0
        ? Math.max(7, Math.round(randomNormal(21, 6)))
        : 0;

    trials.push({
      trialIndex: t,
      failedNodeIds: Array.from(trialFailedNodes),
      financialLossM: trialLossM,
      impactedVolume: impactedVol,
      durationDays,
    });
  }

  // 3. Statistical Analysis & Percentiles
  const losses = trials.map((t) => t.financialLossM).sort((a, b) => a - b);
  const totalTrials = losses.length;

  const sumLoss = losses.reduce((a, b) => a + b, 0);
  const meanLossM = Math.round((sumLoss / totalTrials) * 100) / 100;
  const medianLossM =
    Math.round(losses[Math.floor(totalTrials * 0.5)]! * 100) / 100;

  const variance =
    losses.reduce((s, x) => s + Math.pow(x - meanLossM, 2), 0) / totalTrials;
  const stdDevLossM = Math.round(Math.sqrt(variance) * 100) / 100;

  const minLossM = losses[0]!;
  const maxLossM = losses[totalTrials - 1]!;

  const getPercentile = (p: number) => {
    const idx = Math.min(
      totalTrials - 1,
      Math.max(0, Math.floor(p * totalTrials)),
    );
    return Math.round(losses[idx]! * 100) / 100;
  };

  const var90M = getPercentile(0.9);
  const var95M = getPercentile(0.95);
  const var99M = getPercentile(0.99);

  // Conditional VaR (Expected Shortfall): Mean of worst (1 - 0.95) = 5%
  const tail95 = losses.slice(Math.floor(0.95 * totalTrials));
  const cvar95M =
    tail95.length > 0
      ? Math.round(
          (tail95.reduce((a, b) => a + b, 0) / tail95.length) * 100,
        ) / 100
      : var95M;

  const lossCount = losses.filter((l) => l > 0.05).length;
  const lossProbability = Math.round((lossCount / totalTrials) * 1000) / 10;
  const severeLossCount = losses.filter((l) => l >= var95M && l > 0).length;
  const severeLossProbability =
    Math.round((severeLossCount / totalTrials) * 1000) / 10;

  // 4. Histogram Construction (20 bins)
  const numBins = 18;
  const maxRange = Math.max(maxLossM, var99M * 1.1, 10);
  const binWidth = maxRange / numBins;
  const histogram: LossHistogramBin[] = [];

  for (let i = 0; i < numBins; i++) {
    const minLoss = Math.round(i * binWidth * 10) / 10;
    const maxLoss = Math.round((i + 1) * binWidth * 10) / 10;
    const rangeLabel = `$${minLoss.toFixed(1)}M–$${maxLoss.toFixed(1)}M`;
    const count = losses.filter(
      (l) => l >= minLoss && (i === numBins - 1 ? l <= maxLoss : l < maxLoss),
    ).length;
    const frequency = Math.round((count / totalTrials) * 1000) / 10;
    histogram.push({
      rangeLabel,
      minLoss,
      maxLoss,
      count,
      frequency,
      cumulativeProbability: 0, // computed below
    });
  }

  let runningCount = 0;
  for (const bin of histogram) {
    runningCount += bin.count;
    bin.cumulativeProbability =
      Math.round((runningCount / totalTrials) * 1000) / 10;
  }

  // 5. Loss Exceedance Curve (LEC) Data Points (e.g. 25 points from $0 to MaxLoss)
  const exceedanceCurve: LossExceedancePoint[] = [];
  const stepCount = 24;
  for (let i = 0; i <= stepCount; i++) {
    const threshold = (maxRange / stepCount) * i;
    const countExceed = losses.filter((l) => l >= threshold).length;
    exceedanceCurve.push({
      lossM: Math.round(threshold * 10) / 10,
      exceedanceProbability:
        Math.round((countExceed / totalTrials) * 1000) / 10,
    });
  }

  // 6. Sensitivity / Tornado Analysis: Top 5 Nodes Driving Tail Risk
  const topDrivers: SensitivityDriver[] = network.nodes
    .map((node) => {
      const failCount = nodeFailureCounts.get(node.id) ?? 0;
      const failureRateInSim =
        Math.round((failCount / totalTrials) * 1000) / 10;

      // Marginal VaR estimate: average loss in trials where this node specifically failed
      // minus overall mean loss
      const trialsWithNode = trials.filter((t) =>
        t.failedNodeIds.includes(node.id),
      );
      const avgLossWithNode =
        trialsWithNode.length > 0
          ? trialsWithNode.reduce((s, t) => s + t.financialLossM, 0) /
            trialsWithNode.length
          : 0;

      const marginalVarImpactM =
        Math.round(Math.max(0, avgLossWithNode - meanLossM) * 100) / 100;

      return {
        nodeId: node.id,
        label: node.label,
        region: node.region,
        tier: node.type,
        baseRiskScore: node.risk_score,
        marginalVarImpactM,
        failureRateInSim,
      };
    })
    .sort((a, b) => b.marginalVarImpactM - a.marginalVarImpactM)
    .slice(0, 6);

  const endTime = performance.now();
  const executionTimeMs = Math.round((endTime - startTime) * 10) / 10;

  return {
    config: fullConfig,
    executionTimeMs,
    totalTrials,
    meanLossM,
    medianLossM,
    stdDevLossM,
    maxLossM,
    minLossM,
    var90M,
    var95M,
    var99M,
    cvar95M,
    lossProbability,
    severeLossProbability,
    histogram,
    exceedanceCurve,
    topDrivers,
  };
}

/**
 * High-accuracy rational approximation of the inverse standard normal CDF (probit function)
 */
function approximateNormInv(p: number): number {
  if (p <= 0) return -6.0;
  if (p >= 1) return 6.0;
  if (p === 0.5) return 0.0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const q = p < 0.5 ? p : 1 - p;
  let r: number;

  if (q > 0.02425) {
    const u = q - 0.5;
    const u2 = u * u;
    r =
      (u *
        (((((a[0]! * u2 + a[1]!) * u2 + a[2]!) * u2 + a[3]!) * u2 + a[4]!) * u2 +
          a[5]!)) /
      (((((b[0]! * u2 + b[1]!) * u2 + b[2]!) * u2 + b[3]!) * u2 + b[4]!) * u2 +
        1.0);
  } else {
    const v = Math.sqrt(-2.0 * Math.log(q));
    r =
      (((((c[0]! * v + c[1]!) * v + c[2]!) * v + c[3]!) * v + c[4]!) * v +
        c[5]!) /
      ((((d[0]! * v + d[1]!) * v + d[2]!) * v + d[3]!) * v + 1.0);
  }

  return p < 0.5 ? -r : r;
}
