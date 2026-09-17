import { ArrowDownRight, ArrowUpRight, Power, RotateCcw, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NodeStatus, SupplyNetwork, SupplyNode } from "@/lib/supply-chain/types";
import { TIER_LABEL } from "@/lib/supply-chain/types";
import { FACTOR_LABEL, riskProfile } from "@/lib/supply-chain/risk";
import { directNeighbors, downstreamOf } from "@/lib/supply-chain/simulation";

interface Props {
  network: SupplyNetwork;
  node: SupplyNode | null;
  statuses: Record<string, NodeStatus>;
  capability: Record<string, number>;
  isOffline: boolean;
  onToggleFailure: (id: string) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const STATUS_STYLES: Record<NodeStatus, string> = {
  healthy: "bg-healthy-soft text-healthy",
  "at-risk": "bg-warning-soft text-warning",
  failed: "bg-danger-soft text-danger",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  healthy: "Operational",
  "at-risk": "At risk",
  failed: "Offline",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

const BAND_LABEL = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  severe: "Severe",
} as const;

export function NodeDetailPanel({
  network,
  node,
  statuses,
  capability,
  isOffline,
  onToggleFailure,
  onClose,
  onSelect,
}: Props) {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface p-6 text-center">
        <p className="text-sm font-semibold text-foreground">No node selected</p>
        <p className="max-w-[220px] text-xs text-muted-foreground">
          Click any entity in the network to inspect its risk profile and run a failure simulation.
        </p>
      </div>
    );
  }

  const status = statuses[node.id] ?? "healthy";
  const { suppliers, customers } = directNeighbors(network, node.id);
  const downstream = downstreamOf(network, node.id);
  const impacted = downstream.filter((d) => statuses[d.id] !== "healthy");
  const profile = riskProfile(network, node);
  const fulfilment = Math.round((capability[node.id] ?? 1) * 100);

  const chartData = (Object.keys(FACTOR_LABEL) as (keyof typeof FACTOR_LABEL)[]).map((key) => ({
    name: FACTOR_LABEL[key],
    value: Math.round(profile.factors[key] * 100),
  }));

  return (
    <div className="flex h-full flex-col overflow-y-auto rounded-xl border border-border bg-surface shadow-panel">
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {TIER_LABEL[node.type]}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">
            {node.label}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {node.id} · {node.region}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close details"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4">
        <Stat label="Risk score" value={`${profile.score} / 100 · ${BAND_LABEL[profile.band]}`} />
        <Stat label="Fulfilment now" value={`${fulfilment}%`} />
        <Stat label="Likelihood" value={`${profile.likelihood} / 100`} />
        <Stat label="Impact" value={`${profile.impact} / 100`} />
        <Stat label="Weekly volume" value={node.volume.toLocaleString()} />
        <Stat label="Lead time" value={`${node.leadTimeDays} days`} />
        <Stat label="Buffer / recovery" value={`${node.bufferDays}d / ${node.recoveryDays}d`} />
        <Stat
          label="Sourcing"
          value={suppliers.length <= 1 ? "Single source" : `${suppliers.length} sources`}
        />
      </div>

      <div className="px-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Risk factors · 0-100
        </p>
        <div className="h-36 rounded-lg border border-border bg-surface-muted p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 255)" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-35}
                textAnchor="end"
                height={44}
                tick={{ fontSize: 8, fill: "oklch(0.55 0.03 257)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "oklch(0.55 0.03 257)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid oklch(0.92 0.01 255)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={d.value > 70 ? "#c0322b" : d.value > 45 ? "#e08300" : "#6366f1"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <ArrowUpRight className="size-3" /> Upstream suppliers ({suppliers.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suppliers.length === 0 && (
              <span className="text-xs text-muted-foreground">
                Origin node — raw material source
              </span>
            )}
            {suppliers.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`rounded-md border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:border-primary ${STATUS_STYLES[statuses[s.id] ?? "healthy"]}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <ArrowDownRight className="size-3" /> Direct customers ({customers.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {customers.length === 0 && (
              <span className="text-xs text-muted-foreground">Terminal node — serves demand</span>
            )}
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`rounded-md border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:border-primary ${STATUS_STYLES[statuses[c.id] ?? "healthy"]}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-2 border-t border-border p-4">
        <p className="text-xs text-muted-foreground">
          {isOffline
            ? `${impacted.length} of ${downstream.length} downstream nodes are impacted by this outage.`
            : `${downstream.length} downstream nodes depend on this entity.`}
        </p>
        <button
          onClick={() => onToggleFailure(node.id)}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
            isOffline
              ? "border border-border bg-surface text-foreground hover:bg-muted"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }`}
        >
          {isOffline ? <RotateCcw className="size-4" /> : <Power className="size-4" />}
          {isOffline ? "Restore this node" : "Simulate failure"}
        </button>
      </div>
    </div>
  );
}
