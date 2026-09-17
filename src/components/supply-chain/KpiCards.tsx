import {
  Activity,
  AlertTriangle,
  DollarSign,
  Gauge,
  Hourglass,
  Network,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import type { NetworkKpis } from "@/lib/supply-chain/simulation";

interface Props {
  kpis: NetworkKpis;
}

function Card({
  label,
  value,
  sub,
  icon,
  tone = "default",
  tooltip,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone?: "default" | "healthy" | "warning" | "danger";
  tooltip?: string;
}) {
  const toneClass =
    tone === "healthy"
      ? "text-healthy bg-healthy-soft"
      : tone === "warning"
        ? "text-warning bg-warning-soft"
        : tone === "danger"
          ? "text-danger bg-danger-soft"
          : "text-primary bg-accent";

  return (
    <div
      title={tooltip}
      className="group relative rounded-xl border border-border bg-surface p-4 shadow-panel transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <span
          className={`grid size-9 place-items-center rounded-lg ${toneClass} transition-transform group-hover:scale-110`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{sub}</span>
      </p>
    </div>
  );
}

export function KpiCards({ kpis }: Props) {
  const hasOutage = kpis.offlineNodes > 0 || kpis.impactedVolume > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card
          label="Active nodes"
          value={`${kpis.activeNodes} / ${kpis.totalNodes}`}
          sub={`${kpis.offlineNodes} offline · ${kpis.atRiskNodes} at risk`}
          icon={<Network className="size-4" />}
          tone={kpis.offlineNodes > 0 ? "warning" : "default"}
          tooltip="Entities currently transmitting nominal or degraded supply volume"
        />
        <Card
          label="Network health"
          value={`${kpis.healthScore}%`}
          sub="Volume-weighted fulfilment"
          tone={kpis.healthScore > 85 ? "healthy" : kpis.healthScore > 60 ? "warning" : "danger"}
          icon={<Activity className="size-4" />}
          tooltip="Overall network capability to deliver finished goods volume under current constraints"
        />
        <Card
          label="Critical bottlenecks"
          value={`${kpis.bottlenecks}`}
          sub="HHI >= 0.6 single-sourced links"
          tone="warning"
          icon={<ShieldAlert className="size-4" />}
          tooltip="Entities with high inbound concentration that feed critical downstream volume"
        />
        <Card
          label="Financial exposure"
          value={kpis.financialImpactWeeklyM > 0 ? `$${kpis.financialImpactWeeklyM}M` : "$0.0M"}
          sub={
            kpis.dailyDowntimeCostK > 0
              ? `~$${kpis.dailyDowntimeCostK}k / day burn`
              : "Baseline — nominal run-rate"
          }
          tone={kpis.financialImpactWeeklyM > 0 ? "danger" : "default"}
          icon={<DollarSign className="size-4" />}
          tooltip="Estimated gross revenue and input value exposed per week based on finished goods impact"
        />
        <Card
          label="Weighted risk index"
          value={`${kpis.averageRisk}`}
          sub="Composite likelihood & impact"
          tone={kpis.averageRisk > 60 ? "danger" : kpis.averageRisk > 40 ? "warning" : "healthy"}
          icon={<Gauge className="size-4" />}
          tooltip="Network-wide average risk score computed across all 7 operational and geopolitical pillars"
        />
        <Card
          label="Volume at risk"
          value={kpis.impactedVolume.toLocaleString()}
          sub="Units / week shortfall"
          tone={kpis.impactedVolume > 0 ? "danger" : "default"}
          icon={<TrendingDown className="size-4" />}
          tooltip="Total weekly unit shortfall across components, sub-assemblies, and final assembly lines"
        />
      </div>

      {hasOutage && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Hourglass className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold">Supply Shortfall Active:</span>
            <span>
              {kpis.criticalBufferNodes} entities have under 5 days of safety stock remaining before
              line shutdown.
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span>Weekly Loss: ${kpis.financialImpactWeeklyM}M</span>
            <span>·</span>
            <span>Run-rate burn: ${kpis.dailyDowntimeCostK}k/day</span>
          </div>
        </div>
      )}
    </div>
  );
}
