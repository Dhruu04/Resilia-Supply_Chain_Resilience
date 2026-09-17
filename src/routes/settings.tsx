import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";

import { Panel, RiskPill } from "@/components/supply-chain/Panel";
import { download } from "@/lib/supply-chain/derive";
import { DEFAULT_WEIGHTS, FACTOR_LABEL, type RiskWeights } from "@/lib/supply-chain/risk";
import { useSupply } from "@/lib/supply-chain/store";
import { TIER_LABEL, TIER_ORDER, type NodeTier } from "@/lib/supply-chain/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Risk Model Weights & Network Editor" },
      {
        name: "description",
        content:
          "Tune the likelihood and impact weights behind every risk score, edit entity attributes, add or remove entities and flows, and reset the network to its shipped baseline.",
      },
      { property: "og:title", content: "Settings — Risk Model & Network Editor" },
      {
        property: "og:description",
        content:
          "Re-weight the risk model and edit the network dataset directly. Everything is stored in your browser.",
      },
    ],
  }),
  component: SettingsPage,
});

const LIKELIHOOD_KEYS = ["geopolitical", "financial", "capacity", "leadTime"] as const;
const IMPACT_KEYS = ["concentration", "criticality", "recovery"] as const;

function SettingsPage() {
  const {
    network,
    risk,
    weights,
    setWeights,
    resetWeights,
    updateNode,
    addNode,
    removeNode,
    addLink,
    removeLink,
    resetData,
    resetAll,
    exportState,
  } = useSupply();

  const [editing, setEditing] = useState<string>(network.nodes[0]?.id ?? "");
  const node = useMemo(() => network.nodes.find((n) => n.id === editing), [network, editing]);

  const [newNode, setNewNode] = useState({
    id: "",
    label: "",
    type: "component" as NodeTier,
    region: "",
    volume: 1000,
  });
  const [newLink, setNewLink] = useState({ source: "", target: "", volume: 500 });

  const set = (patch: Partial<RiskWeights>) => setWeights({ ...weights, ...patch });

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Model weights and dataset edits are saved in this browser and applied everywhere
          instantly.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Risk model weights"
          subtitle="Weights are normalised per group, then blended into the final score"
          actions={
            <button
              onClick={resetWeights}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" /> Defaults
            </button>
          }
          bodyClassName="space-y-4"
        >
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Likelihood factors
            </p>
            <div className="space-y-2.5">
              {LIKELIHOOD_KEYS.map((k) => (
                <WeightRow
                  key={k}
                  label={FACTOR_LABEL[k]}
                  value={weights[k]}
                  onChange={(v) => set({ [k]: v } as Partial<RiskWeights>)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Impact factors
            </p>
            <div className="space-y-2.5">
              {IMPACT_KEYS.map((k) => (
                <WeightRow
                  key={k}
                  label={FACTOR_LABEL[k]}
                  value={weights[k]}
                  onChange={(v) => set({ [k]: v } as Partial<RiskWeights>)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Likelihood / impact blend
            </p>
            <WeightRow
              label={`${Math.round(weights.blend * 100)}% likelihood · ${Math.round(
                (1 - weights.blend) * 100,
              )}% impact`}
              value={weights.blend}
              onChange={(v) => set({ blend: v })}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Default blend is {DEFAULT_WEIGHTS.blend}. Raising it favours how likely a disruption
              is; lowering it favours how much a disruption would hurt.
            </p>
          </div>
        </Panel>

        <Panel
          title="Entity editor"
          subtitle="Change observable attributes — scores recompute from them"
          bodyClassName="space-y-3"
        >
          <select
            id="settings-entity-select"
            name="settingsEntitySelect"
            aria-label="Select entity to edit"
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none focus:border-primary"
          >
            {TIER_ORDER.map((tier) => (
              <optgroup key={tier} label={TIER_LABEL[tier]}>
                {network.nodes
                  .filter((n) => n.type === tier)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>

          {node ? (
            <>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2">
                <span className="text-xs font-medium">{node.label}</span>
                <RiskPill band={risk[node.id]!.band} score={node.risk_score} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Display name"
                  value={node.label}
                  onChange={(v) => updateNode(node.id, { label: v })}
                />
                <TextField
                  label="Region (ends with ISO country)"
                  value={node.region}
                  onChange={(v) => updateNode(node.id, { region: v })}
                />
                <NumField
                  label="Volume / week"
                  value={node.volume}
                  step={50}
                  onChange={(v) => updateNode(node.id, { volume: v })}
                />
                <NumField
                  label="Lead time (days)"
                  value={node.leadTimeDays}
                  onChange={(v) => updateNode(node.id, { leadTimeDays: v })}
                />
                <NumField
                  label="Buffer (days)"
                  value={node.bufferDays}
                  onChange={(v) => updateNode(node.id, { bufferDays: v })}
                />
                <NumField
                  label="Recovery (days)"
                  value={node.recoveryDays}
                  onChange={(v) => updateNode(node.id, { recoveryDays: v })}
                />
                <NumField
                  label="Capacity utilisation (0–1)"
                  value={node.capacityUtilization}
                  step={0.01}
                  onChange={(v) => updateNode(node.id, { capacityUtilization: v })}
                />
                <NumField
                  label="Financial health (0–100)"
                  value={node.financialHealth}
                  onChange={(v) => updateNode(node.id, { financialHealth: v })}
                />
                <label htmlFor="settings-edit-node-tier" className="text-[11px] font-medium text-muted-foreground">
                  Tier
                  <select
                    id="settings-edit-node-tier"
                    name="editNodeTier"
                    value={node.type}
                    onChange={(e) => updateNode(node.id, { type: e.target.value as NodeTier })}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                  >
                    {TIER_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {TIER_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                onClick={() => {
                  removeNode(node.id);
                  setEditing(network.nodes.find((n) => n.id !== node.id)?.id ?? "");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-soft px-2.5 py-1.5 text-[11px] font-semibold text-danger transition-opacity hover:opacity-90"
              >
                <Trash2 className="size-3" /> Remove this entity and its flows
              </button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No entity selected.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Add an entity" subtitle="Defaults are applied to unspecified attributes">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="ID (unique)"
              value={newNode.id}
              onChange={(v) => setNewNode({ ...newNode, id: v.toUpperCase() })}
            />
            <TextField
              label="Display name"
              value={newNode.label}
              onChange={(v) => setNewNode({ ...newNode, label: v })}
            />
            <TextField
              label="Region e.g. Bavaria, DE"
              value={newNode.region}
              onChange={(v) => setNewNode({ ...newNode, region: v })}
            />
            <NumField
              label="Volume / week"
              value={newNode.volume}
              step={50}
              onChange={(v) => setNewNode({ ...newNode, volume: v })}
            />
            <label htmlFor="settings-new-node-tier" className="text-[11px] font-medium text-muted-foreground">
              Tier
              <select
                id="settings-new-node-tier"
                name="newNodeTier"
                value={newNode.type}
                onChange={(e) => setNewNode({ ...newNode, type: e.target.value as NodeTier })}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
              >
                {TIER_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            disabled={!newNode.id || !newNode.label}
            onClick={() => {
              addNode({
                id: newNode.id,
                label: newNode.label,
                type: newNode.type,
                region: newNode.region || "Unspecified, DE",
                volume: newNode.volume,
                leadTimeDays: 21,
                bufferDays: 10,
                recoveryDays: 14,
                capacityUtilization: 0.75,
                financialHealth: 70,
                status: "healthy",
                risk_score: 0,
              });
              setNewNode({ id: "", label: "", type: "component", region: "", volume: 1000 });
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <Plus className="size-3.5" /> Add entity
          </button>
        </Panel>

        <Panel title="Flows" subtitle={`${network.links.length} directed supply flows`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label htmlFor="settings-new-link-source" className="text-[11px] font-medium text-muted-foreground">
              From
              <select
                id="settings-new-link-source"
                name="newLinkSource"
                value={newLink.source}
                onChange={(e) => setNewLink({ ...newLink, source: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="">Select…</option>
                {network.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="settings-new-link-target" className="text-[11px] font-medium text-muted-foreground">
              To
              <select
                id="settings-new-link-target"
                name="newLinkTarget"
                value={newLink.target}
                onChange={(e) => setNewLink({ ...newLink, target: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="">Select…</option>
                {network.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <NumField
              label="Volume / week"
              value={newLink.volume}
              step={50}
              onChange={(v) => setNewLink({ ...newLink, volume: v })}
            />
          </div>
          <button
            disabled={!newLink.source || !newLink.target || newLink.source === newLink.target}
            onClick={() => {
              addLink({ ...newLink });
              setNewLink({ source: "", target: "", volume: 500 });
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <Plus className="size-3.5" /> Add flow
          </button>

          <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {network.links.map((l) => (
              <div
                key={`${l.source}->${l.target}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-[11px]"
              >
                <span className="min-w-0 flex-1 truncate">
                  {network.nodes.find((n) => n.id === l.source)?.label ?? l.source} →{" "}
                  {network.nodes.find((n) => n.id === l.target)?.label ?? l.target}
                </span>
                <span className="font-mono text-muted-foreground">{l.volume}</span>
                <button
                  onClick={() => removeLink(l.source, l.target)}
                  aria-label="Remove flow"
                  className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Data management"
        subtitle="All state lives in this browser only — nothing is sent anywhere"
      >
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              download(
                `nexus-risk-state-${new Date().toISOString().slice(0, 10)}.json`,
                exportState(),
                "application/json",
              )
            }
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
          >
            Export state (JSON)
          </button>
          <button
            onClick={resetData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-3.5" /> Restore shipped dataset
          </button>
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger transition-opacity hover:opacity-90"
          >
            <TriangleAlert className="size-3.5" /> Reset everything
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          “Reset everything” clears dataset edits, model weights, watchlist, saved scenarios and the
          incident log.
        </p>
      </Panel>
    </div>
  );
}

function WeightRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const fieldId = `weight-slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="flex items-center justify-between text-[11px] font-medium">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value.toFixed(2)}</span>
      </span>
      <input
        id={fieldId}
        name={fieldId}
        aria-label={label}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[oklch(0.52_0.19_275)]"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const fieldId = `text-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label htmlFor={fieldId} className="text-[11px] font-medium text-muted-foreground">
      {label}
      <input
        id={fieldId}
        name={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
      />
    </label>
  );
}

function NumField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const fieldId = `num-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label htmlFor={fieldId} className="text-[11px] font-medium text-muted-foreground">
      {label}
      <input
        id={fieldId}
        name={fieldId}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 font-mono text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
      />
    </label>
  );
}
