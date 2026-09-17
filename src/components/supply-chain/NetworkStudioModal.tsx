import { useState, useMemo } from "react";
import {
  X,
  Factory,
  Plus,
  Trash2,
  ArrowRight,
  Globe2,
  Layers,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
} from "lucide-react";
import { useSupply } from "@/lib/supply-chain/store";
import { resolveNodeCoordinates } from "@/lib/supply-chain/geo-coords";
import { countryOf } from "@/lib/supply-chain/risk";
import {
  TIER_LABEL,
  TIER_ORDER,
  type SupplyNode,
  type SupplyLink,
  type NodeTier,
} from "@/lib/supply-chain/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TIERS: { id: NodeTier; label: string; desc: string }[] = [
  { id: "raw", label: "Tier 3 — Raw Materials", desc: "Mining, ores, chemical feedstocks, ingots" },
  {
    id: "component",
    label: "Tier 2 — Component Fabrication",
    desc: "Precision parts, optics, cells, valves",
  },
  {
    id: "subassembly",
    label: "Tier 1 — Sub-assembly Systems",
    desc: "Major subsystems, avionics, battery packs",
  },
  {
    id: "factory",
    label: "Assembly Plants & Foundries",
    desc: "Final OEM assembly plants, gigafabs, FAL",
  },
  {
    id: "distribution",
    label: "Distribution & Logistics Hubs",
    desc: "Airfreight gateways, logistics centers, DC",
  },
];

const COMMON_CITIES = [
  "Hsinchu, TW",
  "Tainan, TW",
  "Taichung, TW",
  "Tokyo, JP",
  "Kyoto, JP",
  "Seoul, KR",
  "Austin, US",
  "Fremont, US",
  "Detroit, US",
  "Phoenix, US",
  "Seattle, US",
  "Veldhoven, NL",
  "Dresden, DE",
  "Munich, DE",
  "Toulouse, FR",
  "Basel, CH",
  "Shanghai, CN",
  "Shenzhen, CN",
  "Singapore, SG",
  "Penang, MY",
];

export function NetworkStudioModal({ isOpen, onClose }: Props) {
  const { network, addNode, removeNode, addLink, resetData } = useSupply();
  const [activeTab, setActiveTab] = useState<"nodes" | "links" | "registry">("nodes");
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state for new node
  const [nodeId, setNodeId] = useState("");
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeType, setNodeType] = useState<NodeTier>("component");
  const [location, setLocation] = useState("Austin, US");
  const [volume, setVolume] = useState("12000");
  const [bufferDays, setBufferDays] = useState("28");
  const [recoveryDays, setRecoveryDays] = useState("45");
  const [leadTimeDays, setLeadTimeDays] = useState("14");

  // Form state for new link
  const [linkSource, setLinkSource] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  const [flowVolume, setFlowVolume] = useState("8000");

  // Live coordinates preview
  const resolvedCoords = useMemo(() => {
    return resolveNodeCoordinates(location, nodeId || "custom_preview");
  }, [location, nodeId]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    const finalId = nodeId.trim()
      ? nodeId
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "_")
      : nodeLabel
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "_");

    if (!finalId || !nodeLabel.trim()) return;

    const newNode: SupplyNode = {
      id: finalId,
      label: nodeLabel.trim(),
      type: nodeType,
      region: location.trim(),
      volume: Number(volume) || 10000,
      bufferDays: Number(bufferDays) || 30,
      recoveryDays: Number(recoveryDays) || 45,
      leadTimeDays: Number(leadTimeDays) || 14,
      capacityUtilization: 0.85,
      financialHealth: 80,
      status: "healthy",
      risk_score: 25,
    };

    addNode(newNode);
    showNotification(`Facility "${newNode.label}" added to the network.`);
    setNodeId("");
    setNodeLabel("");
  };

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSource || !linkTarget || linkSource === linkTarget) return;

    const newLink: SupplyLink = {
      source: linkSource,
      target: linkTarget,
      volume: Number(flowVolume) || 5000,
    };

    addLink(newLink);
    const sNode = network.nodes.find((n) => n.id === linkSource)?.label ?? linkSource;
    const tNode = network.nodes.find((n) => n.id === linkTarget)?.label ?? linkTarget;
    showNotification(`Flow link created: ${sNode} -> ${tNode}`);
  };

  const filteredNodes = network.nodes.filter(
    (n) =>
      n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.region ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.type ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/75 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Network Architecture Studio
              </h2>
              <p className="text-xs text-slate-500">
                Design custom facilities, link supply routes, or tune inventory buffers live.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch bar */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab("nodes")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-all ${
              activeTab === "nodes"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Plus className="h-4 w-4" />
            Add Facility (Node)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-all ${
              activeTab === "links"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ArrowRight className="h-4 w-4" />
            Connect Trade Flow (Arc)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("registry")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-all ${
              activeTab === "registry"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            Network Registry ({network.nodes.length} Nodes, {network.links.length} Arcs)
          </button>
        </div>

        {/* Notification Banner */}
        {successMsg && (
          <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-6 py-2.5 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-800">
          {activeTab === "nodes" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Form Column */}
              <form onSubmit={handleCreateNode} className="space-y-4 md:col-span-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="studio-node-label" className="block text-xs font-medium text-slate-700">
                      Facility / Entity Name *
                    </label>
                    <input
                      id="studio-node-label"
                      name="nodeLabel"
                      type="text"
                      required
                      placeholder="e.g. Phoenix Gigafab 7"
                      value={nodeLabel}
                      onChange={(e) => setNodeLabel(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="studio-node-id" className="block text-xs font-medium text-slate-700">
                      System Identifier (ID)
                    </label>
                    <input
                      id="studio-node-id"
                      name="nodeId"
                      type="text"
                      placeholder="auto-derived if blank"
                      value={nodeId}
                      onChange={(e) => setNodeId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="studio-node-type" className="block text-xs font-medium text-slate-700">
                      Tier Classification
                    </label>
                    <select
                      id="studio-node-type"
                      name="nodeType"
                      value={nodeType}
                      onChange={(e) => setNodeType(e.target.value as NodeTier)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {TIERS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="studio-node-location" className="block text-xs font-medium text-slate-700">
                      Location (City, Country Code) *
                    </label>
                    <input
                      id="studio-node-location"
                      name="nodeLocation"
                      type="text"
                      required
                      list="city-suggestions"
                      placeholder="e.g. Austin, US"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <datalist id="city-suggestions">
                      {COMMON_CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label htmlFor="studio-node-volume" className="block text-xs font-medium text-slate-700">Weekly Units</label>
                    <input
                      id="studio-node-volume"
                      name="nodeVolume"
                      type="number"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="studio-node-buffer" className="block text-xs font-medium text-slate-700">
                      Buffer (Days)
                    </label>
                    <input
                      id="studio-node-buffer"
                      name="nodeBufferDays"
                      type="number"
                      value={bufferDays}
                      onChange={(e) => setBufferDays(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="studio-node-recovery" className="block text-xs font-medium text-slate-700">
                      MTTR Recovery (Days)
                    </label>
                    <input
                      id="studio-node-recovery"
                      name="nodeRecoveryDays"
                      type="number"
                      value={recoveryDays}
                      onChange={(e) => setRecoveryDays(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="studio-node-leadtime" className="block text-xs font-medium text-slate-700">
                      Transit Lead Time
                    </label>
                    <input
                      id="studio-node-leadtime"
                      name="nodeLeadTimeDays"
                      type="number"
                      value={leadTimeDays}
                      onChange={(e) => setLeadTimeDays(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Commit Facility to Supply Chain
                  </button>
                </div>
              </form>

              {/* Live Preview Card */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                  Live Geolocation Preview
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">
                      {nodeLabel || "New Facility"}
                    </span>
                    <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                      {nodeType}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{TIER_LABEL[nodeType]}</div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Geographic Loc:</span>
                      <span className="font-medium text-slate-800">{location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Country Code:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {countryOf(location)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Resolved GPS:</span>
                      <span className="font-mono text-indigo-600 text-[11px]">
                        {resolvedCoords[0].toFixed(4)}°, {resolvedCoords[1].toFixed(4)}°
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Buffer vs MTTR:</span>
                      <span
                        className={`font-semibold ${
                          Number(bufferDays) >= Number(recoveryDays)
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {bufferDays}d / {recoveryDays}d ({Number(bufferDays) - Number(recoveryDays)}
                        d gap)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg bg-indigo-50/70 p-3 text-[11px] text-indigo-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
                  <span>
                    The map engine will dynamically plot this facility and auto-frame the zoom
                    viewport without any page reloads.
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "links" && (
            <div className="max-w-2xl space-y-6">
              <form onSubmit={handleCreateLink} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="studio-link-source" className="block text-xs font-medium text-slate-700">
                      Upstream Origin (Source Facility) *
                    </label>
                    <select
                      id="studio-link-source"
                      name="linkSource"
                      required
                      value={linkSource}
                      onChange={(e) => setLinkSource(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select Origin Node...</option>
                      {network.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label} ({n.type}, {countryOf(n.region)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="studio-link-target" className="block text-xs font-medium text-slate-700">
                      Downstream Destination (Target Facility) *
                    </label>
                    <select
                      id="studio-link-target"
                      name="linkTarget"
                      required
                      value={linkTarget}
                      onChange={(e) => setLinkTarget(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select Destination Node...</option>
                      {network.nodes
                        .filter((n) => n.id !== linkSource)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label} ({n.type}, {countryOf(n.region)})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="studio-flow-volume" className="block text-xs font-medium text-slate-700">
                    Weekly Flow Quantity (Units / Wk)
                  </label>
                  <input
                    id="studio-flow-volume"
                    name="flowVolume"
                    type="number"
                    value={flowVolume}
                    onChange={(e) => setFlowVolume(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!linkSource || !linkTarget}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Establish Trade Flow Arc
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "registry" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="studio-registry-search"
                    name="studioRegistrySearch"
                    aria-label="Search facilities by name, region, or tier"
                    type="text"
                    placeholder="Search facilities by name, region, or tier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Reset all network customizations back to standard industry baseline?",
                      )
                    ) {
                      resetData();
                      showNotification("Network restored to industry baseline.");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  Reset to Baseline
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Facility</th>
                      <th className="px-3 py-3">Tier</th>
                      <th className="px-3 py-3">Location</th>
                      <th className="px-3 py-3">Buffer</th>
                      <th className="px-3 py-3">MTTR</th>
                      <th className="px-3 py-3">Vol / Wk</th>
                      <th className="px-3 py-3">Loss / Day</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredNodes.map((n) => {
                      const unitPrice =
                        n.type === "factory" || n.type === "distribution" ? 1250 : 250;
                      const dailyLoss = Math.round(((n.volume * unitPrice) / 7_000_000) * 10) / 10;
                      return (
                        <tr key={n.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            <div>{n.label}</div>
                            <div className="font-mono text-[10px] text-slate-400">{n.id}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 uppercase">
                              {TIER_LABEL[n.type] ?? n.type}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{n.region}</td>
                          <td className="px-3 py-2.5 font-mono">{n.bufferDays}d</td>
                          <td className="px-3 py-2.5 font-mono">{n.recoveryDays}d</td>
                          <td className="px-3 py-2.5 font-mono">{n.volume.toLocaleString()}</td>
                          <td className="px-3 py-2.5 font-mono text-rose-600 font-medium">
                            ${dailyLoss}M
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete facility "${n.label}" and its associated trade arcs?`,
                                  )
                                ) {
                                  removeNode(n.id);
                                  showNotification(`Removed facility ${n.label}.`);
                                }
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete Node"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/75 px-6 py-3 text-xs text-slate-500">
          <div>Changes update risk simulations, maps, and financial loss models in real-time.</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
