import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Globe,
  HelpCircle,
  Layers,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Panel } from "@/components/supply-chain/Panel";
import {
  type MonteCarloConfig,
  type MonteCarloResult,
  runMonteCarloSimulation,
} from "@/lib/supply-chain/monte-carlo";
import { useSupply } from "@/lib/supply-chain/store";
import { TIER_LABEL } from "@/lib/supply-chain/types";

const AXIS_COLOR = "#64748b";
const GRID_COLOR = "oklch(0.92 0.01 255)";
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid oklch(0.925 0.01 255)",
  backgroundColor: "oklch(1 0 0)",
  color: "oklch(0.23 0.03 264)",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
};

export function MonteCarloView() {
  const { network, updateNode } = useSupply();

  // Simulation Controls State
  const [iterations, setIterations] = useState<number>(1000);
  const [correlation, setCorrelation] = useState<"none" | "regional" | "systematic">("regional");
  const [timeHorizonDays, setTimeHorizonDays] = useState<number>(365);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"distribution" | "exceedance" | "tornado">("distribution");

  // What-If Mitigation Sandbox State
  const [mitigationNodeId, setMitigationNodeId] = useState<string>("");
  const [mitigationBufferBoost, setMitigationBufferBoost] = useState<number>(14);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Run Baseline Monte Carlo Simulation
  const baselineResult: MonteCarloResult = useMemo(() => {
    return runMonteCarloSimulation(network, {
      iterations,
      correlation,
      timeHorizonDays,
    });
  }, [network, iterations, correlation, timeHorizonDays]);

  // Run What-If Mitigated Simulation
  const mitigatedNetwork = useMemo(() => {
    if (!mitigationNodeId) return null;
    return {
      ...network,
      nodes: network.nodes.map((n) =>
        n.id === mitigationNodeId
          ? {
              ...n,
              bufferDays: n.bufferDays + mitigationBufferBoost,
              risk_score: Math.max(10, n.risk_score - 20),
            }
          : n,
      ),
    };
  }, [network, mitigationNodeId, mitigationBufferBoost]);

  const mitigatedResult = useMemo(() => {
    if (!mitigatedNetwork) return null;
    return runMonteCarloSimulation(mitigatedNetwork, {
      iterations,
      correlation,
      timeHorizonDays,
    });
  }, [mitigatedNetwork, iterations, correlation, timeHorizonDays]);

  // Preset scenarios handler
  const handleApplyPreset = (preset: "baseline" | "regional" | "blackswan") => {
    if (preset === "baseline") {
      setIterations(1000);
      setCorrelation("none");
      setTimeHorizonDays(90);
    } else if (preset === "regional") {
      setIterations(2500);
      setCorrelation("regional");
      setTimeHorizonDays(180);
    } else {
      setIterations(5000);
      setCorrelation("systematic");
      setTimeHorizonDays(365);
    }
  };

  // Re-run handler with micro-animation
  const handleRerun = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 240);
  };

  // Commit mitigation to live network digital twin
  const handleCommitMitigation = () => {
    if (!mitigationNodeId) return;
    const targetNode = network.nodes.find((n) => n.id === mitigationNodeId);
    if (!targetNode) return;

    updateNode(mitigationNodeId, {
      bufferDays: targetNode.bufferDays + mitigationBufferBoost,
    });

    setAppliedNotification(
      `Updated ${targetNode.label}: Safety buffer expanded to ${targetNode.bufferDays + mitigationBufferBoost} days.`,
    );
    setTimeout(() => setAppliedNotification(null), 4000);
  };

  // Export JSON Report
  const handleExportReport = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            platform: "Resilia Autonomous Supply Chain Resilience",
            config: baselineResult.config,
            metrics: {
              expectedAnnualLossM: baselineResult.meanLossM,
              valueAtRisk90M: baselineResult.var90M,
              valueAtRisk95M: baselineResult.var95M,
              valueAtRisk99M: baselineResult.var99M,
              conditionalVaR95M: baselineResult.cvar95M,
              lossProbability: baselineResult.lossProbability,
              severeLossProbability: baselineResult.severeLossProbability,
            },
            topRiskDrivers: baselineResult.topDrivers,
            lossHistogram: baselineResult.histogram,
          },
          null,
          2,
        ),
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `resilia-monte-carlo-var-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Header Card Matching Resilia's Clean Theme */}
      <Panel
        bodyClassName="p-4 sm:p-5"
        className="border border-border bg-surface"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <Activity className="size-3 text-primary animate-pulse" />
                Stochastic Risk Engine
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground">·</span>
              <span className="hidden sm:inline text-xs text-muted-foreground">
                Gaussian Copula Correlation Model
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Monte Carlo Probabilistic Risk & Value-at-Risk (VaR)
            </h1>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Samples thousands of stochastic failure states across geographic clusters and echelon tiers.
              Quantifies tail financial exposure, Value at Risk, and provides interactive mitigation ROI testing.
            </p>
          </div>

          {/* Action Buttons & Performance Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
              <span className="text-foreground font-semibold">{baselineResult.executionTimeMs} ms</span> · {baselineResult.totalTrials.toLocaleString()} trials
            </div>

            <button
              onClick={handleRerun}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isSimulating ? "animate-spin" : ""}`} />
              <span>{isSimulating ? "Simulating..." : "Re-sample"}</span>
            </button>

            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
              title="Download full Monte Carlo distribution as JSON"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export Model</span>
            </button>
          </div>
        </div>

        {/* Preset Stress Scenarios Bar */}
        <div className="mt-4 pt-3.5 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Stress Presets:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset("baseline")}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                correlation === "none" && iterations === 1000 && timeHorizonDays === 90
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface hover:bg-muted text-muted-foreground"
              }`}
            >
              <Zap className="size-3 text-amber-500" />
              <span>Normal Drift (1k / Indep / 90d)</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("regional")}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                correlation === "regional" && iterations === 2500 && timeHorizonDays === 180
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface hover:bg-muted text-muted-foreground"
              }`}
            >
              <Globe className="size-3 text-indigo-500" />
              <span>Regional Hub Cluster (2.5k / Copula / 180d)</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("blackswan")}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                correlation === "systematic" && iterations === 5000 && timeHorizonDays === 365
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface hover:bg-muted text-muted-foreground"
              }`}
            >
              <ShieldAlert className="size-3 text-rose-500" />
              <span>Global Contagion (5k / Systematic / 1y)</span>
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Seed: <span className="font-mono text-foreground font-medium">Stochastic-Vectorized</span>
          </div>
        </div>

        {/* Refined Parameter Configuration Form */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3.5 border-t border-border/80">
          {/* Parameter 1: Number of Iterations */}
          <div>
            <label htmlFor="mc-iterations-select" className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Trials (Iterations)
            </label>
            <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-surface-muted p-1">
              {[500, 1000, 2500, 5000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setIterations(count)}
                  className={`rounded-md py-1 text-xs transition-all ${
                    iterations === count
                      ? "bg-surface text-foreground font-bold shadow-2xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {count >= 1000 ? `${count / 1000}k` : count}
                </button>
              ))}
            </div>
          </div>

          {/* Parameter 2: Correlation Copula */}
          <div>
            <label htmlFor="mc-correlation-select" className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Correlation Structure
            </label>
            <select
              id="mc-correlation-select"
              name="mcCorrelation"
              aria-label="Correlation Structure"
              value={correlation}
              onChange={(e) => setCorrelation(e.target.value as "none" | "regional" | "systematic")}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring/20 transition-colors"
            >
              <option value="none">Independent (Idiosyncratic)</option>
              <option value="regional">Regional Copula (Geopolitical / Weather)</option>
              <option value="systematic">Systematic Contagion (Global Shock)</option>
            </select>
          </div>

          {/* Parameter 3: Time Horizon */}
          <div>
            <label htmlFor="mc-horizon-select" className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Exposure Window
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface-muted p-1">
              {[
                { days: 30, label: "30 Days" },
                { days: 90, label: "90 Days" },
                { days: 365, label: "1 Year" },
              ].map((h) => (
                <button
                  key={h.days}
                  type="button"
                  onClick={() => setTimeHorizonDays(h.days)}
                  className={`rounded-md py-1 text-xs transition-all ${
                    timeHorizonDays === h.days
                      ? "bg-surface text-foreground font-bold shadow-2xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* 2. Executive Key Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: 95% VaR */}
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-panel transition-all hover:border-primary/40">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Value at Risk (95%)</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary font-mono">
              1-in-20 Yr
            </span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tracking-tight text-primary">
            ${baselineResult.var95M.toFixed(1)}M
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            Max weekly loss with 95% confidence.
          </p>
        </div>

        {/* Card 2: 99% VaR */}
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-panel transition-all hover:border-danger/40">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Tail Risk (99% VaR)</span>
            <span className="rounded bg-danger-soft px-1.5 py-0.2 text-[10px] font-bold text-danger font-mono">
              1-in-100 Yr
            </span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tracking-tight text-danger">
            ${baselineResult.var99M.toFixed(1)}M
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            Extreme tail Black Swan threshold.
          </p>
        </div>

        {/* Card 3: Conditional VaR */}
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-panel transition-all hover:border-warning/40">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Expected Shortfall</span>
            <span className="rounded bg-warning-soft px-1.5 py-0.2 text-[10px] font-bold text-warning font-mono">
              CVaR
            </span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tracking-tight text-warning">
            ${baselineResult.cvar95M.toFixed(1)}M
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            Average loss in the worst 5% tail scenarios.
          </p>
        </div>

        {/* Card 4: Expected Annual Loss */}
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-panel">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Expected Loss</span>
            <span className="text-[10px] font-mono text-muted-foreground font-semibold">Mean (EAL)</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tracking-tight text-foreground">
            ${baselineResult.meanLossM.toFixed(1)}M
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            Annualized baseline actuarial exposure.
          </p>
        </div>

        {/* Card 5: Disruption Likelihood */}
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-panel">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Outage Frequency</span>
            <span className="text-[10px] font-mono text-muted-foreground">P(Loss &gt; 0)</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono tracking-tight text-foreground">
            {baselineResult.lossProbability.toFixed(1)}%
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            Trials with buffer depletion & downtime.
          </p>
        </div>
      </div>

      {/* 3. Main Chart Panel with Sub-Tabs */}
      <Panel
        title="Stochastic Exposure Visualizations"
        subtitle="Analyze loss probability density, exceedance thresholds, and marginal sensitivity drivers"
        actions={
          <div className="flex items-center rounded-lg border border-border bg-surface-muted p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("distribution")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                activeTab === "distribution"
                  ? "bg-surface font-semibold text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Loss Histogram & Density
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("exceedance")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                activeTab === "exceedance"
                  ? "bg-surface font-semibold text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Loss Exceedance Curve (LEC)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tornado")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                activeTab === "tornado"
                  ? "bg-surface font-semibold text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tornado Sensitivity Drivers
            </button>
          </div>
        }
      >
        {/* VIEW 1: Histogram & Probability Density */}
        {activeTab === "distribution" && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-muted-foreground">
                Frequency distribution across{" "}
                <span className="font-semibold text-foreground">{baselineResult.totalTrials.toLocaleString()} trials</span>.
                Bars transition to violet/crimson beyond the 95th and 99th percentiles.
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="size-2 rounded-full bg-slate-400" />
                  Mean: ${baselineResult.meanLossM.toFixed(1)}M
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-primary">
                  <span className="size-2 rounded-full bg-primary" />
                  VaR 95%: ${baselineResult.var95M.toFixed(1)}M
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-danger">
                  <span className="size-2 rounded-full bg-danger" />
                  VaR 99%: ${baselineResult.var99M.toFixed(1)}M
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={baselineResult.histogram}
                  margin={{ top: 15, right: 20, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                  <XAxis
                    dataKey="rangeLabel"
                    stroke={AXIS_COLOR}
                    fontSize={10.5}
                    angle={-20}
                    textAnchor="end"
                    interval={1}
                  />
                  <YAxis
                    stroke={AXIS_COLOR}
                    fontSize={11}
                    unit="%"
                    label={{
                      value: "Frequency (% of trials)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 11,
                      fill: AXIS_COLOR,
                    }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val: number, name: string) => [
                      name === "frequency" ? `${val}% of trials` : `${val} runs`,
                      name === "frequency" ? "Likelihood" : "Count",
                    ]}
                    labelFormatter={(label) => `Loss Interval: ${label}`}
                  />
                  <Bar dataKey="frequency" fill="oklch(0.51 0.19 271)" radius={[3, 3, 0, 0]}>
                    {baselineResult.histogram.map((entry, index) => {
                      const isPast99 = entry.minLoss >= baselineResult.var99M;
                      const isPast95 = entry.minLoss >= baselineResult.var95M;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isPast99 ? "#dc2626" : isPast95 ? "#4f46e5" : "oklch(0.7 0.12 271)"}
                        />
                      );
                    })}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="frequency"
                    stroke="oklch(0.35 0.16 271)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 2: Loss Exceedance Curve (LEC) */}
        {activeTab === "exceedance" && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-muted-foreground">
                <span className="font-semibold text-foreground">Loss Exceedance Curve (LEC):</span> Shows the probability{" "}
                <span className="font-mono font-medium">P(Loss &ge; X)</span> that an outage exceeds a given financial dollar threshold.
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="size-2 rounded-full bg-primary" />
                Empirical Exceedance
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={baselineResult.exceedanceCurve}
                  margin={{ top: 15, right: 20, left: 0, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis
                    dataKey="lossM"
                    stroke={AXIS_COLOR}
                    fontSize={11}
                    unit="M"
                    label={{
                      value: "Financial Loss ($ Millions)",
                      position: "insideBottom",
                      offset: -10,
                      fontSize: 11,
                      fill: AXIS_COLOR,
                    }}
                  />
                  <YAxis
                    stroke={AXIS_COLOR}
                    fontSize={11}
                    unit="%"
                    domain={[0, 100]}
                    label={{
                      value: "Exceedance Probability (%)",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 11,
                      fill: AXIS_COLOR,
                    }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val: number) => [`${val}% probability`, "P(Loss ≥ Threshold)"]}
                    labelFormatter={(label) => `Loss Threshold: $${label}M`}
                  />
                  <ReferenceLine
                    x={baselineResult.var95M}
                    stroke="#4f46e5"
                    strokeDasharray="4 4"
                    label={{
                      value: `VaR 95%: $${baselineResult.var95M}M`,
                      position: "top",
                      fontSize: 10.5,
                      fill: "#4f46e5",
                      fontWeight: 600,
                    }}
                  />
                  <ReferenceLine
                    x={baselineResult.var99M}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    label={{
                      value: `VaR 99%: $${baselineResult.var99M}M`,
                      position: "top",
                      fontSize: 10.5,
                      fill: "#dc2626",
                      fontWeight: 600,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="exceedanceProbability"
                    stroke="oklch(0.51 0.19 271)"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: "oklch(0.51 0.19 271)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 3: Tornado Sensitivity Drivers */}
        {activeTab === "tornado" && (
          <div>
            <div className="mb-3 text-xs text-muted-foreground">
              Marginal Value-at-Risk contribution: ranks the facilities whose outages create the largest cascade multiplier onto tail loss.
            </div>

            <div className="space-y-2">
              {baselineResult.topDrivers.map((driver, idx) => {
                const maxImpact = Math.max(1, baselineResult.topDrivers[0]?.marginalVarImpactM ?? 1);
                const barWidthPct = Math.min(100, Math.max(10, (driver.marginalVarImpactM / maxImpact) * 100));

                return (
                  <div
                    key={driver.nodeId}
                    className="rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <div className="size-7 rounded-lg bg-surface-muted border border-border flex items-center justify-center font-bold font-mono text-xs text-foreground shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <span>{driver.label}</span>
                          <span className="rounded bg-surface-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                            {driver.nodeId}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {driver.region} · {TIER_LABEL[driver.tier as keyof typeof TIER_LABEL] ?? driver.tier}
                        </div>
                      </div>
                    </div>

                    {/* Relative Impact Progress Bar */}
                    <div className="flex-1 max-w-xs hidden md:block">
                      <div className="flex justify-between text-[10.5px] text-muted-foreground mb-1">
                        <span>Relative Tail Exposure</span>
                        <span className="font-mono font-medium">+{driver.marginalVarImpactM}M</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${barWidthPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Sim Failure Rate</div>
                        <div className="font-mono font-semibold text-foreground">{driver.failureRateInSim}%</div>
                      </div>
                      <div className="text-right min-w-24">
                        <div className="text-[10px] text-muted-foreground">Marginal VaR</div>
                        <div className="font-mono font-bold text-danger">+${driver.marginalVarImpactM}M</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMitigationNodeId(driver.nodeId);
                        }}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                      >
                        Mitigate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      {/* 4. Interactive "What-If" Stress Mitigation Tester */}
      <Panel
        title="Interactive Mitigation ROI Sandbox"
        subtitle="Simulate inventory buffer fortification to quantify the reduction in 95% VaR and Expected Annual Loss"
        bodyClassName="p-4"
      >
        {appliedNotification && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{appliedNotification}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Mitigation Form Column */}
          <div className="space-y-3">
            <div>
              <label htmlFor="mitigation-target-select" className="block text-xs font-semibold text-foreground mb-1">
                Target Bottleneck Supplier
              </label>
              <select
                id="mitigation-target-select"
                name="mitigationTarget"
                aria-label="Target Bottleneck Supplier"
                value={mitigationNodeId}
                onChange={(e) => setMitigationNodeId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-colors"
              >
                <option value="">Select a supplier to mitigate...</option>
                {baselineResult.topDrivers.map((d) => (
                  <option key={d.nodeId} value={d.nodeId}>
                    [{d.nodeId}] {d.label} (+${d.marginalVarImpactM}M VaR)
                  </option>
                ))}
              </select>
            </div>

            {mitigationNodeId && (
              <>
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
                    <span>Safety Buffer Expansion</span>
                    <span className="font-mono text-primary font-bold">+{mitigationBufferBoost} Days</span>
                  </div>
                  <input
                    id="mitigation-buffer-boost-slider"
                    name="mitigationBufferBoost"
                    aria-label="Safety buffer expansion days"
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={mitigationBufferBoost}
                    onChange={(e) => setMitigationBufferBoost(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>+5 Days</span>
                    <span>+30 Days</span>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-primary">
                    <Sparkles className="size-3.5" />
                    Proposed Mitigation Package
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Expands safety stock from{" "}
                    <span className="font-semibold text-foreground">
                      {network.nodes.find((n) => n.id === mitigationNodeId)?.bufferDays ?? 10} days
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-foreground">
                      {(network.nodes.find((n) => n.id === mitigationNodeId)?.bufferDays ?? 10) +
                        mitigationBufferBoost}{" "}
                      days
                    </span>
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCommitMitigation}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Apply Buffer to Digital Twin</span>
                </button>
              </>
            )}
          </div>

          {/* Results Comparison Column */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-surface-muted p-3.5">
            {mitigatedResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="font-bold text-xs text-foreground">
                    Mitigation Impact on Value-at-Risk
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-healthy bg-healthy-soft px-2 py-0.5 rounded-full border border-healthy/20 font-mono">
                    <TrendingDown className="size-3.5" />
                    <span>
                      {(
                        ((baselineResult.var95M - mitigatedResult.var95M) /
                          Math.max(0.1, baselineResult.var95M)) *
                        100
                      ).toFixed(1)}
                      % VaR Reduction
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="rounded-lg bg-surface border border-border p-2.5">
                    <div className="text-[10px] text-muted-foreground">Baseline 95% VaR</div>
                    <div className="text-lg font-bold text-foreground font-mono">
                      ${baselineResult.var95M.toFixed(1)}M
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface border border-border p-2.5">
                    <div className="text-[10px] text-muted-foreground">Mitigated 95% VaR</div>
                    <div className="text-lg font-bold text-healthy font-mono">
                      ${mitigatedResult.var95M.toFixed(1)}M
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface border border-border p-2.5">
                    <div className="text-[10px] text-muted-foreground">Net VaR Saved</div>
                    <div className="text-lg font-bold text-primary font-mono">
                      -${Math.max(0, baselineResult.var95M - mitigatedResult.var95M).toFixed(1)}M
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="flex justify-between border-b border-border/60 pb-1">
                    <span className="text-muted-foreground">Expected Annual Loss:</span>
                    <span className="font-mono font-semibold text-foreground">
                      ${baselineResult.meanLossM.toFixed(1)}M &rarr; ${mitigatedResult.meanLossM.toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 pb-1">
                    <span className="text-muted-foreground">Conditional VaR (CVaR):</span>
                    <span className="font-mono font-semibold text-foreground">
                      ${baselineResult.cvar95M.toFixed(1)}M &rarr; ${mitigatedResult.cvar95M.toFixed(1)}M
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <Sliders className="size-7 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-semibold text-foreground">No mitigation target selected</p>
                <p className="text-[11px] max-w-sm mt-0.5 text-muted-foreground">
                  Pick any supplier on the left to test buffer fortification and quantify the return on risk reduction.
                </p>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
