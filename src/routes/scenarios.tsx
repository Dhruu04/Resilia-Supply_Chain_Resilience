import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Check,
  Play,
  RotateCcw,
  Save,
  Trash2,
  Zap,
  GitCompare,
  Network,
  LayoutGrid,
  AlertCircle,
  Layers,
} from "lucide-react";

import { Bar as MiniBar, Metric, Panel, StatusBadge } from "@/components/supply-chain/Panel";
import { TimeHorizonScrubber } from "@/components/supply-chain/TimeHorizonScrubber";
import { ScenarioComparisonModal } from "@/components/supply-chain/ScenarioComparisonModal";
import { NetworkGraph } from "@/components/supply-chain/NetworkGraph";
import { countryOf } from "@/lib/supply-chain/risk";
import {
  computeKpis,
  propagateFailures,
  propagateFailuresOverTime,
} from "@/lib/supply-chain/simulation";
import { useSupply } from "@/lib/supply-chain/store";
import { TIER_LABEL, TIER_ORDER } from "@/lib/supply-chain/types";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenarios — What-If Stress Testing & Comparison" },
      {
        name: "description",
        content:
          "Build multi-entity disruption scenarios, run them against the network, save the outcomes and compare network health, volume at risk and cascade depth side by side.",
      },
      { property: "og:title", content: "Scenarios — What-If Stress Testing" },
      {
        property: "og:description",
        content:
          "Compose disruptions, measure the cascade, save the run and compare outcomes across scenarios.",
      },
    ],
  }),
  component: ScenariosPage,
});

function ScenariosPage() {
  const {
    network,
    activeChain,
    result,
    kpis,
    offline,
    setOffline,
    resetScenario,
    scenarios,
    saveScenario,
    deleteScenario,
    applyScenario,
    incidents,
    clearIncidents,
  } = useSupply();

  const [draft, setDraft] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [workbenchView, setWorkbenchView] = useState<"tree" | "grid">("tree");
  const [selectedGraphNode, setSelectedGraphNode] = useState<string | null>(null);

  // Time horizon scrubber state
  const [currentDay, setCurrentDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubberSpeed, setScrubberSpeed] = useState<1 | 2 | 5>(1);

  const draftSet = useMemo(() => new Set(draft), [draft]);
  const preview = useMemo(() => propagateFailures(network, draftSet), [network, draftSet]);
  const previewKpis = useMemo(() => computeKpis(network, preview), [network, preview]);

  // Timed simulation result for active disruptions
  const timedResult = useMemo(
    () => propagateFailuresOverTime(network, offline, currentDay),
    [network, offline, currentDay],
  );

  // Live statuses for graph rendering (reflects draft when drafting, timedResult when scrubbing, or result)
  const displayStatuses = useMemo(() => {
    if (draft.length > 0) return preview.statuses;
    if (currentDay > 0) return timedResult.statuses;
    return result.statuses;
  }, [draft.length, preview.statuses, currentDay, timedResult.statuses, result.statuses]);

  const activeOfflineSet = useMemo(() => {
    if (draft.length > 0) return draftSet;
    return offline;
  }, [draft.length, draftSet, offline]);

  const selectedNodeData = useMemo(() => {
    if (!selectedGraphNode) return null;
    return network.nodes.find((n) => n.id === selectedGraphNode) ?? null;
  }, [network.nodes, selectedGraphNode]);

  const toggleDraft = (id: string) =>
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const run = (ids: string[], label: string) => {
    setDraft(ids);
    setOffline(ids, label);
    setCurrentDay(0);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Scenario Stress Workbench</h1>
          <p className="text-xs text-muted-foreground">
            Select entities to disrupt, preview the cascade, scrub through the 60-day failure
            horizon, or compare scenarios.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCompareOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-xs"
          >
            <GitCompare className="size-3.5 text-indigo-600" />
            Compare Scenarios
          </button>
          <button
            onClick={() => run(draft, `Custom scenario applied — ${draft.length} entities offline`)}
            disabled={draft.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <Play className="size-3.5" /> Apply to network
          </button>
          <button
            onClick={() => {
              setDraft([]);
              resetScenario();
              setCurrentDay(0);
              setIsPlaying(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Time Horizon Simulation Scrubber */}
      <TimeHorizonScrubber
        currentDay={currentDay}
        onChangeDay={setCurrentDay}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        speed={scrubberSpeed}
        onChangeSpeed={setScrubberSpeed}
        cumulativeLossM={timedResult.cumulativeFinancialLossM}
        starvingCount={timedResult.starvingNodes.length}
        offlineCount={offline.size}
        onResetDay={() => {
          setCurrentDay(0);
          setIsPlaying(false);
        }}
      />

      {/* Scenario Comparison Modal */}
      <ScenarioComparisonModal isOpen={isCompareOpen} onClose={() => setIsCompareOpen(false)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Preview health"
          value={`${previewKpis.healthScore}%`}
          sub={`Live network at ${kpis.healthScore}%`}
          tone={
            previewKpis.healthScore > 85
              ? "healthy"
              : previewKpis.healthScore > 60
                ? "warning"
                : "danger"
          }
        />
        <Metric
          label="Volume at risk"
          value={previewKpis.impactedVolume.toLocaleString()}
          sub="Units / week disrupted"
          tone={previewKpis.impactedVolume > 0 ? "danger" : "default"}
        />
        <Metric
          label="Cascade"
          value={`${previewKpis.offlineNodes} / ${previewKpis.atRiskNodes}`}
          sub="Offline / at risk entities"
          tone={previewKpis.offlineNodes > 0 ? "danger" : "default"}
        />
        <Metric label="Selected" value={`${draft.length}`} sub="Entities in this scenario" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Scenario Topology & Entity Disruption
              </h2>
              <p className="text-xs text-muted-foreground">
                {workbenchView === "tree"
                  ? "Click any facility on the interactive tree to toggle it in/out of the disruption. All links & cascades update live."
                  : "Click entity badges to compose the disruption set by supply chain tier."}
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-border bg-surface-muted p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setWorkbenchView("tree")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                  workbenchView === "tree"
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Network className="size-3.5 text-primary" />
                Topology Tree
              </button>
              <button
                type="button"
                onClick={() => setWorkbenchView("grid")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all ${
                  workbenchView === "grid"
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="size-3.5 text-slate-500" />
                Badge Grid
              </button>
            </div>
          </div>

          {workbenchView === "tree" ? (
            <div className="relative flex flex-col rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
              {/* Legend & Stats HUD */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-muted/50 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="flex size-2 rounded-full bg-danger animate-pulse" />
                    Offline ({activeOfflineSet.size})
                  </span>
                  <span className="text-border">|</span>
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <span className="flex size-2 rounded-full bg-amber-500" />
                    Cascading At-Risk (
                    {Object.values(displayStatuses).filter((s) => s === "at-risk").length})
                  </span>
                  <span className="text-border">|</span>
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <span className="flex size-2 rounded-full bg-primary" />
                    Operational (
                    {network.nodes.length -
                      activeOfflineSet.size -
                      Object.values(displayStatuses).filter((s) => s === "at-risk").length}
                    )
                  </span>
                </div>

                <span className="text-[11px] text-muted-foreground italic">
                  Tip: Click a node to toggle disruption
                </span>
              </div>

              <div className="h-[540px] w-full">
                <NetworkGraph
                  network={network}
                  statuses={displayStatuses}
                  selectedId={selectedGraphNode}
                  offline={activeOfflineSet}
                  onSelect={setSelectedGraphNode}
                  onToggleNode={toggleDraft}
                />
              </div>

              {/* Quick Node Inspection & Disruption Toggle Bar */}
              {selectedNodeData && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-muted/80 px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="font-semibold text-foreground">{selectedNodeData.label}</div>
                    <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase border border-border">
                      {TIER_LABEL[selectedNodeData.type]}
                    </span>
                    <span className="text-muted-foreground">{selectedNodeData.region}</span>
                    <span className="font-mono text-muted-foreground">
                      Buffer: {selectedNodeData.bufferDays}d | MTTR: {selectedNodeData.recoveryDays}
                      d
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleDraft(selectedNodeData.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold shadow-xs transition-colors ${
                      draftSet.has(selectedNodeData.id)
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-danger text-white hover:bg-danger/90"
                    }`}
                  >
                    {draftSet.has(selectedNodeData.id) ? "Restore Node" : "Disrupt Node"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Panel
              title="Compose a disruption"
              subtitle="Click entities to add them to the scenario"
              bodyClassName="space-y-4"
            >
              {TIER_ORDER.map((tier) => {
                const nodes = network.nodes.filter((n) => n.type === tier);
                if (nodes.length === 0) return null;
                return (
                  <div key={tier}>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {TIER_LABEL[tier]}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {nodes.map((n) => {
                        const on = draftSet.has(n.id);
                        return (
                          <button
                            key={n.id}
                            onClick={() => toggleDraft(n.id)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                              on
                                ? "border-danger/40 bg-danger-soft text-danger"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            {on && <Check className="size-3" />}
                            {n.label}
                            <span className="font-mono text-[10px] opacity-70">
                              {countryOf(n.region)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel
            title={`Preset scenarios — ${activeChain.shortName}`}
            subtitle="Real-world historical & geopolitical stress tests"
          >
            <ul className="space-y-2">
              {activeChain.presetScenarios.map((p) => (
                <li key={p.name}>
                  <button
                    onClick={() => run(p.ids, `Preset applied: ${p.name}`)}
                    className="w-full rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <Zap className="size-3.5 text-warning" /> {p.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{p.note}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Save this run" subtitle="Stored in your browser for comparison">
            <div className="space-y-2">
              <input
                id="scenario-save-name"
                name="scenarioSaveName"
                aria-label="Scenario name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Scenario name"
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
              <textarea
                id="scenario-save-notes"
                name="scenarioSaveNotes"
                aria-label="Notes and assumptions"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notes / assumptions"
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
              <button
                onClick={() => {
                  saveScenario(name, note);
                  setName("");
                  setNote("");
                }}
                disabled={offline.size === 0}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-40"
              >
                <Save className="size-3.5" /> Save current live scenario
              </button>
              <p className="text-[11px] text-muted-foreground">
                Saves the scenario currently applied to the network ({offline.size} entities
                offline).
              </p>
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Saved scenarios"
        subtitle={`${scenarios.length} stored runs · compare outcomes side by side`}
        bodyClassName="p-0"
      >
        {scenarios.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            No saved scenarios yet. Apply a disruption, then save it to build a comparison set.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="border-b border-border bg-surface-muted text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Scenario</th>
                  <th className="px-3 py-2 text-left font-medium">Entities</th>
                  <th className="px-3 py-2 text-left font-medium">Health</th>
                  <th className="px-3 py-2 text-left font-medium">Volume at risk</th>
                  <th className="px-3 py-2 text-left font-medium">Cascade</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <span className="block font-medium">{s.name}</span>
                      {s.note && (
                        <span className="block text-[11px] text-muted-foreground">{s.note}</span>
                      )}
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{s.offline.length}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono">{s.healthScore}%</span>
                      <MiniBar
                        value={s.healthScore}
                        tone={
                          s.healthScore > 85 ? "healthy" : s.healthScore > 60 ? "warning" : "danger"
                        }
                      />
                    </td>
                    <td className="px-3 py-2 font-mono">{s.impactedVolume.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono">
                      {s.offlineNodes} offline · {s.atRiskNodes} at risk
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => {
                            applyScenario(s.id);
                            setDraft(s.offline);
                          }}
                          className="rounded-md border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteScenario(s.id)}
                          aria-label="Delete scenario"
                          className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Live cascade detail" subtitle="Entities currently degraded on the network">
          {network.nodes.filter((n) => result.statuses[n.id] !== "healthy").length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Network is fully nominal — nothing is degraded right now.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {network.nodes
                .filter((n) => result.statuses[n.id] !== "healthy")
                .sort((a, b) => (result.capability[a.id] ?? 1) - (result.capability[b.id] ?? 1))
                .map((n) => (
                  <li
                    key={n.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{n.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {Math.round((result.capability[n.id] ?? 1) * 100)}%
                    </span>
                    <StatusBadge status={result.statuses[n.id] ?? "healthy"} />
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Incident log"
          subtitle={`${incidents.length} recorded events`}
          actions={
            incidents.length > 0 ? (
              <button
                onClick={clearIncidents}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            ) : undefined
          }
        >
          {incidents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing logged yet. Failures, restores, saves and model changes appear here.
            </p>
          ) : (
            <ol className="space-y-2">
              {incidents.slice(0, 25).map((i) => (
                <li key={i.id} className="flex gap-2.5">
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${
                      i.kind === "failure"
                        ? "bg-danger"
                        : i.kind === "restore"
                          ? "bg-healthy"
                          : i.kind === "scenario"
                            ? "bg-warning"
                            : "bg-primary"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs">{i.message}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {new Date(i.ts).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
