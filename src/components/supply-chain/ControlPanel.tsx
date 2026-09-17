import { Layers, RotateCcw, Search, Zap } from "lucide-react";
import type { NodeStatus, SupplyNetwork } from "@/lib/supply-chain/types";
import { TIER_LABEL, TIER_ORDER } from "@/lib/supply-chain/types";

interface Props {
  network: SupplyNetwork;
  statuses: Record<string, NodeStatus>;
  offline: ReadonlySet<string>;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (id: string) => void;
  onReset: () => void;
  onStressTest: () => void;
}

const DOT: Record<NodeStatus, string> = {
  healthy: "bg-healthy",
  "at-risk": "bg-warning",
  failed: "bg-danger",
};

export function ControlPanel({
  network,
  statuses,
  offline,
  query,
  onQueryChange,
  onSelect,
  onReset,
  onStressTest,
}: Props) {
  const q = query.trim().toLowerCase();
  const matches = network.nodes.filter(
    (n) => !q || n.label.toLowerCase().includes(q) || n.region.toLowerCase().includes(q),
  );

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-panel">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Scenario controls
        </p>
        <div className="mt-2 space-y-2">
          <button
            onClick={onStressTest}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Zap className="size-4" /> Run stress test
          </button>
          <button
            onClick={onReset}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-4" /> Reset network
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {offline.size === 0
            ? "All entities nominal. Select a node to take it offline."
            : `${offline.size} node${offline.size > 1 ? "s" : ""} forced offline in this scenario.`}
        </p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Layers className="size-3" /> Network tiers
        </p>
        <ul className="space-y-1">
          {TIER_ORDER.map((t) => {
            const tierNodes = network.nodes.filter((n) => n.type === t);
            const bad = tierNodes.filter((n) => statuses[n.id] !== "healthy").length;
            return (
              <li
                key={t}
                className="flex items-center justify-between rounded-md bg-surface-muted px-2.5 py-2 text-xs"
              >
                <span className="text-foreground">{TIER_LABEL[t]}</span>
                <span className="font-mono text-muted-foreground">
                  {tierNodes.length - bad}/{tierNodes.length}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <label htmlFor="control-panel-search" className="relative mb-2 block">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="control-panel-search"
            name="controlPanelSearch"
            aria-label="Search suppliers or regions"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search suppliers or regions"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
        </label>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {matches.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => onSelect(n.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${DOT[statuses[n.id] ?? "healthy"]}`}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{n.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{n.risk_score}</span>
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-2 py-3 text-xs text-muted-foreground">No matching entities.</li>
          )}
        </ul>
      </div>
    </aside>
  );
}
