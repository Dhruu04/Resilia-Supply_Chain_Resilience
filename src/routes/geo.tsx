import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Compass, Globe2, ShieldAlert, TriangleAlert, Zap } from "lucide-react";

import { Bar as MiniBar, Panel, RiskPill, StatusBadge } from "@/components/supply-chain/Panel";
import { RealWorldMap } from "@/components/supply-chain/RealWorldMap";
import { countryName, regionExposure } from "@/lib/supply-chain/derive";
import { useSupply } from "@/lib/supply-chain/store";
import { TIER_LABEL } from "@/lib/supply-chain/types";

export const Route = createFileRoute("/geo")({
  head: () => ({
    meta: [
      { title: "Geographic Exposure & Real World Map — Nexus Risk" },
      {
        name: "description",
        content:
          "High-precision real world GIS cartography: accurate facility coordinates, genuine world map tiles, maritime trade corridors, and geopolitical instability indices.",
      },
      { property: "og:title", content: "Geographic Exposure & Real World Map — Nexus Risk" },
      {
        property: "og:description",
        content:
          "Explore real-world supply chain facilities on interactive global GIS maps with accurate coordinates and trade arcs.",
      },
    ],
  }),
  component: GeoPage,
});

function GeoPage() {
  const { network, activeChain, risk, result, setOffline, offline, toggleFailure } = useSupply();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [macroFilter, setMacroFilter] = useState<"ALL" | "APAC" | "EMEA" | "Americas">("ALL");

  const regions = useMemo(() => regionExposure(network, risk), [network, risk]);
  const worst = useMemo(() => regions.filter((r) => r.instability >= 60), [regions]);
  const topShare = regions[0];

  // Grouping by macro region
  const macroBreakdown = useMemo(() => {
    const groups: Record<
      "APAC" | "EMEA" | "Americas",
      { volume: number; entities: number; avgInstability: number }
    > = {
      APAC: { volume: 0, entities: 0, avgInstability: 0 },
      EMEA: { volume: 0, entities: 0, avgInstability: 0 },
      Americas: { volume: 0, entities: 0, avgInstability: 0 },
    };

    let apacInst = 0,
      emeaInst = 0,
      amerInst = 0;

    const countryOfRegion = (region: string) => {
      const parts = region.split(",");
      return (parts[parts.length - 1] ?? "").trim().toUpperCase();
    };

    for (const r of regions) {
      const c = r.country;
      const macro: "APAC" | "EMEA" | "Americas" = ["US", "CA", "MX", "BR", "CL"].includes(c)
        ? "Americas"
        : [
              "DE",
              "NL",
              "SE",
              "NO",
              "FI",
              "PL",
              "SK",
              "CZ",
              "AT",
              "CH",
              "FR",
              "GB",
              "UK",
              "IT",
              "ES",
              "PT",
              "BE",
              "DK",
              "IE",
              "CD",
              "MZ",
              "ZA",
              "EG",
              "NG",
            ].includes(c)
          ? "EMEA"
          : "APAC";

      groups[macro].volume += r.volume;
      groups[macro].entities += r.nodes.length;
      if (macro === "APAC") apacInst += r.instability * r.volume;
      if (macro === "EMEA") emeaInst += r.instability * r.volume;
      if (macro === "Americas") amerInst += r.instability * r.volume;
    }

    const totVol = network.nodes.reduce((s, n) => s + n.volume, 0);

    return {
      APAC: {
        ...groups.APAC,
        volumeShare: totVol > 0 ? Math.round((groups.APAC.volume / totVol) * 100) : 0,
        weightedInstability: groups.APAC.volume > 0 ? Math.round(apacInst / groups.APAC.volume) : 0,
      },
      EMEA: {
        ...groups.EMEA,
        volumeShare: totVol > 0 ? Math.round((groups.EMEA.volume / totVol) * 100) : 0,
        weightedInstability: groups.EMEA.volume > 0 ? Math.round(emeaInst / groups.EMEA.volume) : 0,
      },
      Americas: {
        ...groups.Americas,
        volumeShare: totVol > 0 ? Math.round((groups.Americas.volume / totVol) * 100) : 0,
        weightedInstability:
          groups.Americas.volume > 0 ? Math.round(amerInst / groups.Americas.volume) : 0,
      },
    };
  }, [regions, network]);

  const activeCountryData = useMemo(() => {
    if (!selectedCountry) return null;
    return regions.find((r) => r.country === selectedCountry) ?? null;
  }, [selectedCountry, regions]);

  const filteredRegions = useMemo(() => {
    const countryOfMacro = (c: string): "APAC" | "EMEA" | "Americas" =>
      ["US", "CA", "MX", "BR", "CL"].includes(c)
        ? "Americas"
        : [
              "DE",
              "NL",
              "SE",
              "NO",
              "FI",
              "PL",
              "SK",
              "CZ",
              "AT",
              "CH",
              "FR",
              "GB",
              "UK",
              "IT",
              "ES",
              "PT",
              "BE",
              "DK",
              "IE",
              "CD",
              "MZ",
              "ZA",
              "EG",
              "NG",
            ].includes(c)
          ? "EMEA"
          : "APAC";

    if (macroFilter === "ALL") return regions;
    return regions.filter((r) => countryOfMacro(r.country) === macroFilter);
  }, [regions, macroFilter]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Geographic Exposure & Real World Cartography
            </h1>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
              {activeChain.shortName}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeChain.name} &middot; {regions.length} manufacturing territories &middot; exact
            GPS coordinates &middot; active trade flows
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["ALL", "APAC", "EMEA", "Americas"] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => setMacroFilter(tag)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                macroFilter === tag
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-panel">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Globe2 className="size-3.5 text-primary" /> Single Country Peak Share
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-tight">
            {topShare ? `${Math.round(topShare.volumeShare * 100)}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {topShare ? `${countryName(topShare.country)} (${topShare.country})` : "No data"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-panel">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <TriangleAlert className="size-3.5 text-warning" /> High Instability Territories
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-warning">
            {worst.length}{" "}
            <span className="text-xs font-normal text-muted-foreground">countries</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Instability index &ge; 60/100 (e.g. CD, TW, CN)
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-panel">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <ShieldAlert className="size-3.5 text-danger" /> Output at Geopolitical Risk
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
            {Math.round(worst.reduce((s, r) => s + r.volumeShare, 0) * 100)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Share of global weekly volume in unstable regions
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-panel">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Compass className="size-3.5 text-primary" /> Active Cross-Border Flows
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-tight">
            {network.links.length}{" "}
            <span className="text-xs font-normal text-muted-foreground">arteries</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {network.links.filter((l) => offline.has(l.source) || offline.has(l.target)).length}{" "}
            currently interrupted
          </p>
        </div>
      </div>

      {/* Real-World GIS Map with CartoDB Dark Matter tiles & accurate GPS Coordinates */}
      <RealWorldMap
        network={network}
        statuses={result.statuses}
        offline={offline}
        selectedCountry={selectedCountry}
        onSelectCountry={setSelectedCountry}
        onToggleFailure={toggleFailure}
      />

      {/* Active Territory Action Bar if clicked on Map */}
      {activeCountryData && (
        <div className="rounded-xl border border-primary/30 bg-surface p-4 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-primary">
                  {activeCountryData.country}
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {countryName(activeCountryData.country)}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {activeCountryData.nodes.length} facilities &middot;{" "}
                {activeCountryData.regions.join(", ")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Volume Share
                </p>
                <p className="font-mono text-base font-bold text-foreground">
                  {Math.round(activeCountryData.volumeShare * 100)}% (
                  {activeCountryData.volume.toLocaleString()} u/wk)
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Instability
                </p>
                <p className="font-mono text-base font-bold text-rose-500">
                  {activeCountryData.instability}/100
                </p>
              </div>

              <button
                onClick={() => {
                  const allOut = activeCountryData.nodes.every((n) => offline.has(n.id));
                  setOffline(
                    allOut
                      ? [...offline].filter(
                          (id) => !activeCountryData.nodes.some((n) => n.id === id),
                        )
                      : [...new Set([...offline, ...activeCountryData.nodes.map((n) => n.id)])],
                    allOut
                      ? `${countryName(activeCountryData.country)} restored`
                      : `Simulated blackout across ${countryName(activeCountryData.country)}`,
                  );
                }}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-rose-500 transition-colors"
              >
                <Zap className="size-3.5" />
                {activeCountryData.nodes.every((n) => offline.has(n.id))
                  ? "Restore Territory"
                  : "Simulate Country Blackout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regional Resilience Macro Comparison */}
      <div className="grid gap-4 md:grid-cols-3">
        {(["APAC", "EMEA", "Americas"] as const).map((macro) => {
          const data = macroBreakdown[macro];
          return (
            <div
              key={macro}
              className="rounded-xl border border-border bg-surface p-4 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {macro} Region
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  {data.entities} entities
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Volume Share</p>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {data.volumeShare}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Weighted Instability</p>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {data.weightedInstability}/100
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <MiniBar
                  value={data.weightedInstability}
                  tone={
                    data.weightedInstability >= 50
                      ? "danger"
                      : data.weightedInstability >= 30
                        ? "warning"
                        : "healthy"
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Country by Country Detailed Roster */}
      <div className="grid gap-4">
        {filteredRegions.map((r) => {
          const countryOffline = r.nodes.filter((n) => offline.has(n.id)).length;
          const isSelected = selectedCountry === r.country;

          return (
            <Panel
              key={r.country}
              title={`${countryName(r.country)} · ${r.country}`}
              subtitle={`${r.nodes.length} entities · ${r.regions.join(" · ")}`}
              className={isSelected ? "ring-2 ring-primary" : ""}
              actions={
                <button
                  onClick={() =>
                    setOffline(
                      countryOffline === r.nodes.length
                        ? [...offline].filter((id) => !r.nodes.some((n) => n.id === id))
                        : [...new Set([...offline, ...r.nodes.map((n) => n.id)])],
                      countryOffline === r.nodes.length
                        ? `${countryName(r.country)} restored`
                        : `Country-wide disruption simulated: ${countryName(r.country)}`,
                    )
                  }
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    countryOffline === r.nodes.length
                      ? "border-border hover:bg-muted"
                      : "border-danger/40 bg-danger-soft text-danger hover:opacity-90"
                  }`}
                >
                  {countryOffline === r.nodes.length
                    ? "Restore country"
                    : "Simulate country outage"}
                </button>
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Volume share
                  </p>
                  <p className="font-mono text-lg font-semibold">
                    {Math.round(r.volumeShare * 100)}%
                  </p>
                  <MiniBar
                    value={r.volumeShare * 100}
                    tone={
                      r.volumeShare > 0.3 ? "danger" : r.volumeShare > 0.15 ? "warning" : "primary"
                    }
                  />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Country instability
                  </p>
                  <p className="font-mono text-lg font-semibold">{r.instability}/100</p>
                  <MiniBar
                    value={r.instability}
                    tone={
                      r.instability >= 60 ? "danger" : r.instability >= 35 ? "warning" : "healthy"
                    }
                  />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Average risk score
                  </p>
                  <p className="font-mono text-lg font-semibold">{r.avgRisk}</p>
                  <MiniBar
                    value={r.avgRisk}
                    tone={r.avgRisk >= 60 ? "danger" : r.avgRisk >= 40 ? "warning" : "healthy"}
                  />
                </div>
              </div>

              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {r.nodes.map((n) => (
                  <li key={n.id}>
                    <Link
                      to="/suppliers/$id"
                      params={{ id: n.id }}
                      className="block rounded-lg border border-border bg-surface-muted px-2.5 py-2 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-medium">{n.label}</span>
                        <RiskPill band={risk[n.id]!.band} score={n.risk_score} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-muted-foreground">
                          {TIER_LABEL[n.type]}
                        </span>
                        <StatusBadge status={result.statuses[n.id] ?? "healthy"} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
