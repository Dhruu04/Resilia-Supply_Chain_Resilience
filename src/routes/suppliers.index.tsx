import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Search, Star } from "lucide-react";

import { Panel, RiskPill, StatusBadge } from "@/components/supply-chain/Panel";
import { download, nodesToCsv } from "@/lib/supply-chain/derive";
import { useSupply } from "@/lib/supply-chain/store";
import { TIER_LABEL, TIER_ORDER, type NodeStatus, type NodeTier } from "@/lib/supply-chain/types";

export const Route = createFileRoute("/suppliers/")({
  head: () => ({
    meta: [
      { title: "Supplier Directory — Risk-Ranked Entity Register" },
      {
        name: "description",
        content:
          "Searchable, sortable register of every mapped supply chain entity with risk score, band, tier, region, volume and live fulfilment status.",
      },
      { property: "og:title", content: "Supplier Directory — Risk-Ranked Entity Register" },
      {
        property: "og:description",
        content:
          "Filter by tier, status, band and watchlist, then drill into any entity's full risk profile.",
      },
    ],
  }),
  component: SuppliersPage,
});

type SortKey = "label" | "risk_score" | "volume" | "leadTimeDays" | "type" | "region";

function SuppliersPage() {
  const { network, risk, result, watchlist, toggleWatch, offline } = useSupply();
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<NodeTier | "all">("all");
  const [status, setStatus] = useState<NodeStatus | "all">("all");
  const [onlyWatched, setOnlyWatched] = useState(false);
  const [sort, setSort] = useState<SortKey>("risk_score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = network.nodes.filter((n) => {
      if (needle && !`${n.label} ${n.region} ${n.id}`.toLowerCase().includes(needle)) return false;
      if (tier !== "all" && n.type !== tier) return false;
      if (status !== "all" && (result.statuses[n.id] ?? "healthy") !== status) return false;
      if (onlyWatched && !watchlist.has(n.id)) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [network, q, tier, status, onlyWatched, watchlist, result, sort, dir]);

  const toggleSort = (key: SortKey) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "label" || key === "region" || key === "type" ? "asc" : "desc");
    }
  };

  const Th = ({
    k,
    children,
    className = "",
  }: {
    k: SortKey;
    children: string;
    className?: string;
  }) => (
    <th className={`px-3 py-2 text-left font-medium ${className}`}>
      <button
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
        {sort === k &&
          (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Supplier directory</h1>
          <p className="text-xs text-muted-foreground">
            {rows.length} of {network.nodes.length} entities · {watchlist.size} watched ·{" "}
            {offline.size} forced offline
          </p>
        </div>
        <button
          onClick={() =>
            download("nexus-risk-suppliers.csv", nodesToCsv(network, risk, result), "text/csv")
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
        >
          <Download className="size-3.5" /> Export CSV
        </button>
      </div>

      <Panel bodyClassName="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="search-suppliers-input" className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search suppliers by name, region or code</span>
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="search-suppliers-input"
              name="searchSuppliers"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, region or code"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
          </label>
          <select
            id="filter-supplier-tier"
            name="filterSupplierTier"
            aria-label="Filter suppliers by tier"
            value={tier}
            onChange={(e) => setTier(e.target.value as NodeTier | "all")}
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-primary"
          >
            <option value="all">All tiers</option>
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
          <select
            id="filter-supplier-status"
            name="filterSupplierStatus"
            aria-label="Filter suppliers by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as NodeStatus | "all")}
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-primary"
          >
            <option value="all">Any status</option>
            <option value="healthy">Healthy</option>
            <option value="at-risk">At risk</option>
            <option value="failed">Offline</option>
          </select>
          <button
            onClick={() => setOnlyWatched((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
              onlyWatched ? "border-primary bg-accent text-primary" : "border-border hover:bg-muted"
            }`}
          >
            <Star className={`size-3.5 ${onlyWatched ? "fill-current" : ""}`} /> Watchlist
          </button>
        </div>
      </Panel>

      <Panel bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-wider">
              <tr>
                <th className="w-9 px-3 py-2" />
                <Th k="label">Entity</Th>
                <Th k="type">Tier</Th>
                <Th k="region">Region</Th>
                <Th k="risk_score">Risk</Th>
                <Th k="volume">Volume</Th>
                <Th k="leadTimeDays">Lead time</Th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Fulfilment
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const p = risk[n.id]!;
                const fulfil = Math.round((result.capability[n.id] ?? 1) * 100);
                return (
                  <tr key={n.id} className="border-b border-border last:border-0 hover:bg-muted/60">
                    <td className="px-3 py-2">
                      <button
                        aria-label={watchlist.has(n.id) ? "Unwatch" : "Watch"}
                        onClick={() => toggleWatch(n.id)}
                        className={`grid size-6 place-items-center rounded-md transition-colors ${
                          watchlist.has(n.id)
                            ? "text-warning"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Star className={`size-3.5 ${watchlist.has(n.id) ? "fill-current" : ""}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        to="/suppliers/$id"
                        params={{ id: n.id }}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {n.label}
                      </Link>
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        {n.id}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{TIER_LABEL[n.type]}</td>
                    <td className="px-3 py-2 text-muted-foreground">{n.region}</td>
                    <td className="px-3 py-2">
                      <RiskPill band={p.band} score={p.score} />
                    </td>
                    <td className="px-3 py-2 font-mono">{n.volume.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono">{n.leadTimeDays}d</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={result.statuses[n.id] ?? "healthy"} />
                    </td>
                    <td
                      className={`px-3 py-2 font-mono ${
                        fulfil < 60 ? "text-danger" : fulfil < 100 ? "text-warning" : ""
                      }`}
                    >
                      {fulfil}%
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    No entities match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
