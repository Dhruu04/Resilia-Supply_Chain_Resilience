import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileText, Printer, Table2 } from "lucide-react";

import { Metric, Panel } from "@/components/supply-chain/Panel";
import {
  countryName,
  download,
  failureImpacts,
  linksToCsv,
  nodesToCsv,
  regionExposure,
  tierStats,
} from "@/lib/supply-chain/derive";
import { useSupply } from "@/lib/supply-chain/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Export — Executive Risk Briefing" },
      {
        name: "description",
        content:
          "Generate an executive supply chain risk briefing and export the scored entity register, flow table and full application state as CSV or JSON.",
      },
      { property: "og:title", content: "Reports & Export — Executive Risk Briefing" },
      {
        property: "og:description",
        content:
          "A printable briefing plus CSV and JSON exports of the scored network and current scenario.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { network, risk, result, kpis, alerts, offline, exportState, weights } = useSupply();
  const [note, setNote] = useState("");

  const tiers = useMemo(() => tierStats(network, risk, result), [network, risk, result]);
  const regions = useMemo(() => regionExposure(network, risk), [network, risk]);
  const impacts = useMemo(() => failureImpacts(network).slice(0, 5), [network]);
  const critical = alerts.filter((a) => a.severity === "critical");
  const topRisk = useMemo(
    () => [...network.nodes].sort((a, b) => b.risk_score - a.risk_score).slice(0, 8),
    [network],
  );
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Reports & export</h1>
          <p className="text-xs text-muted-foreground">
            Everything below reflects the network exactly as it stands right now.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted print:hidden"
        >
          <Printer className="size-3.5" /> Print briefing
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 print:hidden">
        <button
          onClick={() =>
            download(`entity-register-${stamp}.csv`, nodesToCsv(network, risk, result), "text/csv")
          }
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-panel transition-colors hover:bg-muted"
        >
          <Table2 className="mt-0.5 size-4 text-primary" />
          <span>
            <span className="block text-sm font-semibold">Entity register (CSV)</span>
            <span className="block text-xs text-muted-foreground">
              {network.nodes.length} rows with scores, factors and live status
            </span>
          </span>
        </button>
        <button
          onClick={() => download(`supply-flows-${stamp}.csv`, linksToCsv(network), "text/csv")}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-panel transition-colors hover:bg-muted"
        >
          <Table2 className="mt-0.5 size-4 text-primary" />
          <span>
            <span className="block text-sm font-semibold">Flow table (CSV)</span>
            <span className="block text-xs text-muted-foreground">
              {network.links.length} directed flows with weekly volume
            </span>
          </span>
        </button>
        <button
          onClick={() =>
            download(`nexus-risk-state-${stamp}.json`, exportState(), "application/json")
          }
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left shadow-panel transition-colors hover:bg-muted"
        >
          <Download className="mt-0.5 size-4 text-primary" />
          <span>
            <span className="block text-sm font-semibold">Full state (JSON)</span>
            <span className="block text-xs text-muted-foreground">
              Network, scenario, weights, watchlist and incident log
            </span>
          </span>
        </button>
      </div>

      <Panel
        title="Executive briefing"
        subtitle={`Generated ${new Date().toLocaleString()}`}
        bodyClassName="space-y-5"
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric
            label="Network health"
            value={`${kpis.healthScore}%`}
            sub="Volume-weighted fulfilment"
            tone={kpis.healthScore > 85 ? "healthy" : kpis.healthScore > 60 ? "warning" : "danger"}
          />
          <Metric
            label="Active entities"
            value={`${kpis.activeNodes}`}
            sub={`of ${network.nodes.length}`}
          />
          <Metric
            label="Critical findings"
            value={`${critical.length}`}
            sub="Require escalation"
            tone={critical.length > 0 ? "danger" : "healthy"}
          />
          <Metric
            label="Volume at risk"
            value={kpis.impactedVolume.toLocaleString()}
            sub="Units / week"
            tone={kpis.impactedVolume > 0 ? "danger" : "default"}
          />
        </div>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1 · Posture summary
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed">
            The network comprises {network.nodes.length} entities across five tiers linked by{" "}
            {network.links.length} directed flows, carrying{" "}
            {network.nodes.reduce((s, n) => s + n.volume, 0).toLocaleString()} nominal units per
            week. Weighted risk index stands at {kpis.averageRisk}/100 with {kpis.bottlenecks}{" "}
            structural bottleneck{kpis.bottlenecks === 1 ? "" : "s"} identified.{" "}
            {offline.size > 0
              ? `A disruption scenario is currently applied (${offline.size} entit${offline.size === 1 ? "y" : "ies"} forced offline), degrading ${kpis.offlineNodes + kpis.atRiskNodes} entities in total.`
              : "The network is operating at baseline with no simulated disruption applied."}
          </p>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            2 · Tier posture
          </h2>
          <div className="mt-1.5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-1.5 text-left font-medium">Tier</th>
                  <th className="py-1.5 text-right font-medium">Entities</th>
                  <th className="py-1.5 text-right font-medium">Volume / wk</th>
                  <th className="py-1.5 text-right font-medium">Avg risk</th>
                  <th className="py-1.5 text-right font-medium">Degraded</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.tier} className="border-b border-border last:border-0">
                    <td className="py-1.5">{t.label}</td>
                    <td className="py-1.5 text-right font-mono">{t.nodes}</td>
                    <td className="py-1.5 text-right font-mono">{t.volume.toLocaleString()}</td>
                    <td className="py-1.5 text-right font-mono">{t.avgRisk}</td>
                    <td className="py-1.5 text-right font-mono">{t.offline + t.atRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            3 · Highest-risk entities
          </h2>
          <ol className="mt-1.5 space-y-1 text-sm">
            {topRisk.map((n, i) => (
              <li key={n.id} className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                <span className="font-medium">{n.label}</span>
                <span className="text-xs text-muted-foreground">
                  {countryName(n.region.slice(-2))} · score {n.risk_score} · L{" "}
                  {risk[n.id]?.likelihood ?? 0} / I {risk[n.id]?.impact ?? 0}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            4 · Single points of failure
          </h2>
          <ol className="mt-1.5 space-y-1 text-sm">
            {impacts.map((f) => (
              <li key={f.node.id}>
                <span className="font-medium">{f.node.label}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  — {f.downstreamNodes} downstream entities, {Math.round(f.volumeShare * 100)}% of
                  network volume, {f.suppliers} alternate inbound source
                  {f.suppliers === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            5 · Geographic concentration
          </h2>
          <ol className="mt-1.5 space-y-1 text-sm">
            {regions.slice(0, 6).map((r) => (
              <li key={r.country}>
                <span className="font-medium">{countryName(r.country)}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  — {Math.round(r.volumeShare * 100)}% of volume, instability {r.instability}/100,
                  avg risk {r.avgRisk}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            6 · Critical findings
          </h2>
          {critical.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              No critical findings at the current thresholds.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1 text-sm">
              {critical.map((a) => (
                <li key={a.id}>
                  <span className="font-medium">{a.title}</span>{" "}
                  <span className="text-xs text-muted-foreground">— {a.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            7 · Model configuration
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Likelihood weights — geopolitical {weights.geopolitical}, financial {weights.financial},
            capacity {weights.capacity}, lead time {weights.leadTime}. Impact weights —
            concentration {weights.concentration}, criticality {weights.criticality}, recovery{" "}
            {weights.recovery}. Likelihood / impact blend {weights.blend}.
          </p>
        </section>

        <section className="print:hidden">
          <label htmlFor="analyst-commentary" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Analyst commentary
          </label>
          <textarea
            id="analyst-commentary"
            name="analystCommentary"
            aria-label="Analyst commentary"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add commentary before printing…"
            className="mt-1.5 w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
        </section>
        {note && (
          <section className="hidden print:block">
            <h2 className="text-xs font-semibold uppercase tracking-wider">Analyst commentary</h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm">{note}</p>
          </section>
        )}

        <p className="flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <FileText className="size-3" /> Nexus Risk · derived risk model, self-contained dataset ·
          no external services
        </p>
      </Panel>
    </div>
  );
}
