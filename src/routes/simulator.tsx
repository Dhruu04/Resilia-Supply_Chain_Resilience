import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
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
  Download,
  Upload,
  Play,
  Pause,
  Sliders,
  DollarSign,
  TrendingDown,
  Activity,
  Shield,
  Sparkles,
  ArrowUpRight,
  Clock,
  Compass,
  Check,
  Zap,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  FileText,
  Printer,
  Bell,
  AlertTriangle,
  Move,
  Share2,
} from "lucide-react";
import { useSupply } from "@/lib/supply-chain/store";
import { resolveNodeCoordinates } from "@/lib/supply-chain/geo-coords";
import { countryOf } from "@/lib/supply-chain/risk";
import {
  STARTER_TEMPLATES,
  createBlankCompany,
  exportCompanyJson,
  importCompanyJson,
  toSupplyChainDefinition,
  type CompanySupplyChainConfig,
} from "@/lib/supply-chain/simulator-templates";
import { CompanySimulatorCanvas } from "@/components/supply-chain/CompanySimulatorCanvas";
import {
  propagateFailuresOverTime,
  computeKpis,
  type TimeHorizonResult,
} from "@/lib/supply-chain/simulation";
import {
  TIER_LABEL,
  TIER_ORDER,
  type SupplyNode,
  type SupplyLink,
  type NodeTier,
} from "@/lib/supply-chain/types";

export const Route = createFileRoute("/simulator")({
  component: SimulatorPage,
});

const STORAGE_KEY = "nexus_company_simulator_custom";

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
  "Austin, US",
  "Fremont, US",
  "Detroit, US",
  "Boston, US",
  "Nevada, US",
  "Houston, US",
  "Chicago, US",
  "Memphis, US",
  "Berlin, DE",
  "Dresden, DE",
  "Munich, DE",
  "Frankfurt, DE",
  "Rotterdam, NL",
  "Veldhoven, NL",
  "Basel, CH",
  "Zurich, CH",
  "Dublin, IE",
  "Wroclaw, PL",
  "Tokyo, JP",
  "Kyoto, JP",
  "Hsinchu, TW",
  "Seoul, KR",
  "Shenzhen, CN",
  "Zhengzhou, CN",
  "Singapore, SG",
  "Penang, MY",
];

function SimulatorPage() {
  const { loadCustomSupplyChain } = useSupply();

  // Load custom company from localStorage or default to Clean Energy template
  const [company, setCompany] = useState<CompanySupplyChainConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.nodes)) return parsed;
      }
    } catch {
      // ignore
    }
    return STARTER_TEMPLATES["clean-energy"]!;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(company));
    } catch {
      // ignore
    }
  }, [company]);

  // Active Simulation & Canvas Mode States
  const [offline, setOffline] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "add-node" | "connect-link" | "registry" | "impact" | "alerts" | "report"
  >("add-node");
  const [searchQuery, setSearchQuery] = useState("");
  const [promotedToast, setPromotedToast] = useState(false);

  // Full-screen & Distraction-free Viewport Controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Time scrubber state
  const [timeDay, setTimeDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);

  // Form states for new node
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeType, setNodeType] = useState<NodeTier>("component");
  const [nodeRegion, setNodeRegion] = useState("Austin, US");
  const [nodeVolume, setNodeVolume] = useState("8500");
  const [nodeBufferDays, setNodeBufferDays] = useState("21");
  const [nodeRecoveryDays, setNodeRecoveryDays] = useState("30");
  const [nodeDailyImpact, setNodeDailyImpact] = useState("1.5");

  // Form states for new link
  const [linkSource, setLinkSource] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  const [linkMaterial, setLinkMaterial] = useState("");
  const [linkVolume, setLinkVolume] = useState("5000");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-play timer for scrubber
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(
      () => {
        setTimeDay((prev) => {
          if (prev >= 60) {
            setIsPlaying(false);
            return 60;
          }
          return prev + 1;
        });
      },
      1000 / (playbackSpeed * 2),
    );
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Keyboard shortcuts for full-screen and zen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === "f" || e.key === "F") {
        setIsFullscreen((prev) => !prev);
      } else if (e.key === "z" || e.key === "Z" || e.key === "h" || e.key === "H") {
        setIsZenMode((prev) => !prev);
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "Escape") {
        if (isFullscreen) setIsFullscreen(false);
        if (isZenMode) setIsZenMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, isZenMode]);

  // Dynamic simulation evaluation
  const network = useMemo(
    () => ({ nodes: company.nodes, links: company.links }),
    [company.nodes, company.links],
  );

  const simulation: TimeHorizonResult = useMemo(() => {
    return propagateFailuresOverTime(network, offline, timeDay);
  }, [network, offline, timeDay]);

  const kpis = useMemo(() => {
    return computeKpis(network, simulation);
  }, [network, simulation]);

  const atRiskSet = useMemo(() => {
    const s = new Set<string>();
    Object.entries(simulation.statuses).forEach(([id, st]) => {
      if (st === "at-risk" || st === "failed") {
        if (!offline.has(id)) s.add(id);
      }
    });
    return s;
  }, [simulation.statuses, offline]);

  // Derive custom alerts tailored directly for the user's custom network
  const customAlerts = useMemo(() => {
    const alerts: {
      id: string;
      severity: "critical" | "warning" | "info";
      title: string;
      desc: string;
    }[] = [];

    // 1. Check for single-source bottlenecks
    const inboundMap = new Map<string, string[]>();
    company.links.forEach((l) => {
      const existing = inboundMap.get(l.target) ?? [];
      existing.push(l.source);
      inboundMap.set(l.target, existing);
    });

    company.nodes.forEach((n) => {
      const inbounds = inboundMap.get(n.id) ?? [];
      if (n.type !== "raw" && inbounds.length === 1) {
        const sourceNode = company.nodes.find((x) => x.id === inbounds[0]);
        alerts.push({
          id: `single-${n.id}`,
          severity: "warning",
          title: `Sole-Source Dependency: ${n.label}`,
          desc: `Relies entirely on single upstream facility ${sourceNode?.label ?? inbounds[0]} with no redundant second source.`,
        });
      }
      if (n.bufferDays <= 7) {
        alerts.push({
          id: `buffer-${n.id}`,
          severity: "critical",
          title: `Ultra-Low Buffer: ${n.label} (${n.bufferDays}d)`,
          desc: `Safety stock buffer is under 7 days. Vulnerable to immediate line shutdown if transit or output is delayed.`,
        });
      }
      if (offline.has(n.id)) {
        alerts.push({
          id: `off-${n.id}`,
          severity: "critical",
          title: `Active Outage: ${n.label}`,
          desc: `Facility is completely offline. Upstream flow severed, inducing starvation downstream.`,
        });
      }
    });

    if (simulation.starvingNodes.length > 0) {
      alerts.push({
        id: `starve-${simulation.starvingNodes.length}`,
        severity: "critical",
        title: `Cascading Starvation Alert (${simulation.starvingNodes.length} nodes)`,
        desc: `${simulation.starvingNodes.length} facility lines have fully exhausted buffer inventory and halted production on Day ${timeDay}.`,
      });
    }

    return alerts;
  }, [company.nodes, company.links, offline, simulation.starvingNodes, timeDay]);

  const EMPTY_POSITIONS = useMemo<Record<string, { x: number; y: number }>>(() => ({}), []);

  // Handlers for nodes and links
  const handleToggleOffline = useCallback((id: string) => {
    setOffline((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleResetDisruptions = useCallback(() => {
    setOffline(new Set());
    setTimeDay(0);
    setIsPlaying(false);
  }, []);

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeLabel.trim()) return;

    const id = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newNode: SupplyNode = {
      id,
      label: nodeLabel.trim(),
      type: nodeType,
      region: nodeRegion,
      volume: Math.max(100, Number(nodeVolume) || 5000),
      leadTimeDays: 14,
      bufferDays: Math.max(1, Number(nodeBufferDays) || 14),
      recoveryDays: Math.max(1, Number(nodeRecoveryDays) || 28),
      capacityUtilization: 0.85,
      financialHealth: 85,
      status: "healthy",
      risk_score: 0,
    };

    setCompany((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updatedAt: Date.now(),
    }));

    setNodeLabel("");
    setSelectedNodeId(id);
  };

  const handleDeleteNode = useCallback((id: string) => {
    setCompany((prev) => {
      const nextPositions = { ...(prev.positions ?? {}) };
      delete nextPositions[id];
      return {
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== id),
        links: prev.links.filter((l) => l.source !== id && l.target !== id),
        positions: nextPositions,
        updatedAt: Date.now(),
      };
    });
    setOffline((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedNodeId((cur) => (cur === id ? null : cur));
  }, []);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSource || !linkTarget || linkSource === linkTarget) return;

    const exists = company.links.some((l) => l.source === linkSource && l.target === linkTarget);
    if (exists) return;

    const newLink: SupplyLink = {
      source: linkSource,
      target: linkTarget,
      volume: Math.max(100, Number(linkVolume) || 1000),
    };

    setCompany((prev) => ({
      ...prev,
      links: [...prev.links, newLink],
      updatedAt: Date.now(),
    }));

    setLinkMaterial("");
  };

  const handleDeleteLink = useCallback((source: string, target: string) => {
    setCompany((prev) => ({
      ...prev,
      links: prev.links.filter((l) => !(l.source === source && l.target === target)),
      updatedAt: Date.now(),
    }));
  }, []);

  const handleUpdateNodeBuffer = (id: string, bufferDays: number) => {
    setCompany((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, bufferDays } : n)),
      updatedAt: Date.now(),
    }));
  };

  const handleUpdatePositions = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      setCompany((prev) => ({
        ...prev,
        positions,
        updatedAt: Date.now(),
      }));
    },
    [],
  );

  const handleLoadTemplate = (templateKey: string) => {
    if (templateKey === "blank") {
      setCompany(createBlankCompany());
    } else if (STARTER_TEMPLATES[templateKey]) {
      setCompany(STARTER_TEMPLATES[templateKey]!);
    }
    handleResetDisruptions();
    setSelectedNodeId(null);
  };

  const handleExportJson = () => {
    const json = exportCompanyJson(company);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.name.toLowerCase().replace(/\s+/g, "-")}-supply-chain.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = importCompanyJson(content);
      if (imported) {
        setCompany(imported);
        handleResetDisruptions();
        setSelectedNodeId(null);
      } else {
        alert("Invalid supply chain JSON format. Please verify the file schema.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePromoteToGlobal = () => {
    const def = toSupplyChainDefinition(company);
    loadCustomSupplyChain(def);
    setPromotedToast(true);
    setTimeout(() => setPromotedToast(false), 5000);
  };

  // Coords preview for current location input
  const resolvedCoords = useMemo(() => {
    const coords = resolveNodeCoordinates(nodeRegion, nodeRegion);
    return {
      lat: typeof coords?.[0] === "number" ? coords[0] : 20.0,
      lng: typeof coords?.[1] === "number" ? coords[1] : 0.0,
      country: countryOf(nodeRegion),
    };
  }, [nodeRegion]);

  return (
    <div
      className={`flex flex-col bg-slate-50 text-slate-900 select-none transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen overflow-hidden"
          : "h-[calc(100vh-3.5rem)] overflow-hidden"
      }`}
    >
      {/* Top Header Bar (Collapsible in Zen Mode) */}
      {!isZenMode && (
        <header className="border-b border-slate-200/90 bg-white px-4 sm:px-6 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs z-30 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Factory className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <input
                  id="sim-company-name"
                  name="companyName"
                  aria-label="Company name"
                  type="text"
                  value={company.name}
                  onChange={(e) =>
                    setCompany((prev) => ({
                      ...prev,
                      name: e.target.value,
                      updatedAt: Date.now(),
                    }))
                  }
                  className="text-xs sm:text-sm font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded px-1.5 py-0.5 outline-none transition-all truncate max-w-[260px] sm:max-w-xs"
                  title="Click to rename your company"
                />
                <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 shrink-0">
                  Self-Simulator
                </span>
              </div>
              <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5 truncate">
                <span className="truncate">{company.industry}</span>
                <span>•</span>
                <span>{company.nodes.length} Facilities</span>
                <span>•</span>
                <span>{company.links.length} Trade Arcs</span>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Template Switcher Dropdown */}
            <select
              id="sim-template-switcher"
              name="templateSwitcher"
              aria-label="Load Company Starter Template"
              onChange={(e) => handleLoadTemplate(e.target.value)}
              defaultValue=""
              className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs outline-none transition-colors hidden md:inline-block"
            >
              <option value="" disabled>
                Load Starter Template...
              </option>
              <option value="clean-energy">NextGen Clean Energy & Storage</option>
              <option value="medtech">Precision Robotics & MedTech</option>
              <option value="consumer-electronics">Smart Consumer Hardware OEM</option>
              <option value="blank">Blank Canvas (Start from Scratch)</option>
            </select>

            {/* Import / Export JSON */}
            <input
              id="sim-import-json"
              name="importCompanyJson"
              aria-label="Import company JSON file"
              type="file"
              ref={fileInputRef}
              onChange={handleImportJson}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs font-medium border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              title="Import company JSON"
            >
              <Upload className="size-3.5 text-slate-500" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1 text-xs font-medium border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              title="Export company JSON"
            >
              <Download className="size-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Promote to Global Active Session */}
            <button
              type="button"
              onClick={handlePromoteToGlobal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
              title="Activate across Geo Map, Analytics and Board Deck"
            >
              <Sparkles className="size-3.5" />
              <span className="hidden sm:inline">Promote to Global Session</span>
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            {/* Distraction-Free / Zen Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsZenMode(true)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Enter Distraction-Free Zen Mode (Hide Controls, Key: Z)"
            >
              <EyeOff className="size-4" />
            </button>

            {/* Full-Screen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen (Key: F)"}
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </button>
          </div>
        </header>
      )}

      {/* Floating Zen Mode Restore Pill (when controls are hidden) */}
      {isZenMode && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/90 shadow-lg text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-slate-800">{company.name}</span>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-1 text-indigo-700 font-bold hover:underline"
            title="Restore controls (Key: Z)"
          >
            <Eye className="size-3.5" />
            <span>Show Controls</span>
          </button>
          {isFullscreen && (
            <>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="text-slate-500 hover:text-slate-800"
                title="Exit Fullscreen (Esc)"
              >
                Exit
              </button>
            </>
          )}
        </div>
      )}

      {/* Promoted Confirmation Banner */}
      {promotedToast && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-900 flex items-center justify-between animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>
              <strong>Success!</strong> "{company.name}" has been promoted to your active supply
              chain session. You can now view its real-world geospatial paths on the Geo Map and
              examine it inside the Executive Board Deck.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPromotedToast(false)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Stage: Interactive Topology Canvas & Scrubber */}
        <div className="flex-1 flex flex-col p-2.5 sm:p-3 overflow-hidden relative">
          {/* Canvas Component with Drag & Drop */}
          <CompanySimulatorCanvas
            nodes={company.nodes}
            links={company.links}
            offline={offline}
            atRiskNodes={atRiskSet}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onToggleOffline={handleToggleOffline}
            onDeleteNode={handleDeleteNode}
            onDeleteLink={handleDeleteLink}
            timeScrubDay={timeDay}
            customPositions={company.positions ?? EMPTY_POSITIONS}
            onUpdatePositions={handleUpdatePositions}
          />

          {/* Floating Time-Horizon Scrubber & Live KPI Card (Collapsible in Zen Mode) */}
          {!isZenMode && (
            <div className="mt-2 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Left Scrubber Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`size-7 rounded-lg flex items-center justify-center font-bold text-white transition-colors shadow-2xs ${
                      isPlaying
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                    title={isPlaying ? "Pause Simulation (Space)" : "Play Cascade (Space)"}
                  >
                    {isPlaying ? (
                      <Pause className="size-3.5" />
                    ) : (
                      <Play className="size-3.5 ml-0.5" />
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono text-slate-800 min-w-16">
                      Day {timeDay} <span className="text-slate-400 font-normal">/ 60</span>
                    </span>
                    <input
                      id="sim-time-scrubber"
                      name="simulationTimeScrubber"
                      aria-label="Simulation day progress"
                      type="range"
                      min="0"
                      max="60"
                      value={timeDay}
                      onChange={(e) => setTimeDay(Number(e.target.value))}
                      className="w-28 sm:w-48 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Speed Toggle */}
                  <div className="flex items-center rounded-lg border border-slate-200 p-0.5 text-[10.5px] font-mono hidden sm:flex">
                    {([1, 2, 5] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPlaybackSpeed(s)}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          playbackSpeed === s
                            ? "bg-indigo-600 text-white font-bold"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleResetDisruptions}
                    className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                    title="Reset all outages"
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>

                {/* Right Live Simulation Impact KPIs */}
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Resilience
                    </span>
                    <span
                      className={`font-mono font-bold text-xs sm:text-sm ${
                        kpis.healthScore >= 75
                          ? "text-emerald-600"
                          : kpis.healthScore >= 50
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {kpis.healthScore}/100
                    </span>
                  </div>

                  <div className="h-5 w-px bg-slate-200" />

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Daily Loss
                    </span>
                    <span className="font-mono font-bold text-rose-600 text-xs sm:text-sm">
                      ${((simulation?.dailyDowntimeCostK ?? 0) / 1000 || 0).toFixed(2)}M
                    </span>
                  </div>

                  <div className="h-5 w-px bg-slate-200" />

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Starving Lines
                    </span>
                    <span className="font-mono font-bold text-amber-600 text-xs sm:text-sm">
                      {simulation.starvingNodes.length} nodes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Toggle Handle for Right Drawer */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center size-6 rounded-l-md border-y border-l border-slate-300 bg-white text-slate-600 shadow-md hover:text-indigo-600 transition-all ${
            isDrawerOpen ? "translate-x-0" : "translate-x-0"
          }`}
          title={isDrawerOpen ? "Collapse Drawer" : "Expand Workbench Drawer"}
        >
          {isDrawerOpen ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>

        {/* Right Workbench Panel (Collapsible) */}
        {isDrawerOpen && (
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200/90 bg-white flex flex-col shrink-0 overflow-hidden shadow-xs animate-in slide-in-from-right duration-200">
            {/* Workbench Tabs */}
            <div className="flex items-center border-b border-slate-200/90 bg-slate-50 px-2.5 py-1.5 gap-1 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("add-node")}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === "add-node"
                    ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Facility
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("connect-link")}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === "connect-link"
                    ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Connect Flow
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("registry")}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === "registry"
                    ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Directory ({company.nodes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === "alerts"
                    ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Bell className="size-3 text-amber-500" />
                <span>Alerts ({customAlerts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("report")}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === "report"
                    ? "bg-white text-indigo-700 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="size-3 text-indigo-600" />
                <span>Audit Report</span>
              </button>
            </div>

            {/* Panel Content Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs scrollbar-thin">
              {/* TAB 1: ADD FACILITY */}
              {activeTab === "add-node" && (
                <form onSubmit={handleAddNode} className="space-y-3">
                  <div>
                    <label htmlFor="sim-node-name" className="block font-semibold text-slate-700 mb-1">
                      Facility Name / Entity Label *
                    </label>
                    <input
                      id="sim-node-name"
                      name="nodeLabel"
                      type="text"
                      required
                      placeholder="e.g. Austin Clean Energy Gigafab"
                      value={nodeLabel}
                      onChange={(e) => setNodeLabel(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="sim-node-tier" className="block font-semibold text-slate-700 mb-1">
                      Supply Chain Echelon Tier *
                    </label>
                    <select
                      id="sim-node-tier"
                      name="nodeType"
                      value={nodeType}
                      onChange={(e) => setNodeType(e.target.value as NodeTier)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white focus:border-indigo-500 outline-none"
                    >
                      {TIERS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sim-node-location" className="block font-semibold text-slate-700 mb-1">
                      Geographic City & Country *
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="sim-node-location"
                        name="nodeRegion"
                        type="text"
                        list="city-suggestions"
                        placeholder="e.g. Austin, US"
                        value={nodeRegion}
                        onChange={(e) => setNodeRegion(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 outline-none"
                      />
                      <datalist id="city-suggestions">
                        {COMMON_CITIES.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                    <div className="mt-1 text-[10.5px] text-slate-500 flex items-center justify-between">
                      <span>Geocoded: {resolvedCoords.country}</span>
                      <span className="font-mono">
                        {(resolvedCoords.lat ?? 0).toFixed(2)},{" "}
                        {(resolvedCoords.lng ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="sim-node-output" className="block font-semibold text-slate-700 mb-1">
                        Weekly Output (Units)
                      </label>
                      <input
                        id="sim-node-output"
                        name="nodeVolume"
                        type="number"
                        min="100"
                        value={nodeVolume}
                        onChange={(e) => setNodeVolume(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="sim-node-buffer-stock" className="block font-semibold text-slate-700 mb-1">
                        Buffer Stock (Days)
                      </label>
                      <input
                        id="sim-node-buffer-stock"
                        name="nodeBufferDays"
                        type="number"
                        min="1"
                        max="120"
                        value={nodeBufferDays}
                        onChange={(e) => setNodeBufferDays(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="sim-node-recovery-mttr" className="block font-semibold text-slate-700 mb-1">
                        MTTR Recovery (Days)
                      </label>
                      <input
                        id="sim-node-recovery-mttr"
                        name="nodeRecoveryDays"
                        type="number"
                        min="1"
                        max="180"
                        value={nodeRecoveryDays}
                        onChange={(e) => setNodeRecoveryDays(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="sim-node-downtime-cost" className="block font-semibold text-slate-700 mb-1">
                        Downtime Cost ($M/d)
                      </label>
                      <input
                        id="sim-node-downtime-cost"
                        name="nodeDailyImpact"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={nodeDailyImpact}
                        onChange={(e) => setNodeDailyImpact(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 py-2 font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="size-4" />
                    <span>Add Facility to Canvas</span>
                  </button>
                </form>
              )}

              {/* TAB 2: CONNECT TRADE FLOW */}
              {activeTab === "connect-link" && (
                <form onSubmit={handleAddLink} className="space-y-3">
                  <div>
                    <label htmlFor="sim-link-supplier" className="block font-semibold text-slate-700 mb-1">
                      Source Facility (Supplier) *
                    </label>
                    <select
                      id="sim-link-supplier"
                      name="linkSource"
                      required
                      value={linkSource}
                      onChange={(e) => setLinkSource(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white outline-none"
                    >
                      <option value="">Select upstream supplier...</option>
                      {company.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          [{TIER_LABEL[n.type].split("·")[0]}] {n.label} ({n.region})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sim-link-consumer" className="block font-semibold text-slate-700 mb-1">
                      Target Facility (Customer / Assembly) *
                    </label>
                    <select
                      id="sim-link-consumer"
                      name="linkTarget"
                      required
                      value={linkTarget}
                      onChange={(e) => setLinkTarget(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white outline-none"
                    >
                      <option value="">Select downstream consumer...</option>
                      {company.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          [{TIER_LABEL[n.type].split("·")[0]}] {n.label} ({n.region})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sim-link-transferred-material" className="block font-semibold text-slate-700 mb-1">
                      Transferred Material / Subsystem
                    </label>
                    <input
                      id="sim-link-transferred-material"
                      name="linkMaterial"
                      type="text"
                      placeholder="e.g. Battery Cell Module"
                      value={linkMaterial}
                      onChange={(e) => setLinkMaterial(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="sim-link-weekly-volume" className="block font-semibold text-slate-700 mb-1">
                      Weekly Transfer Volume (Units)
                    </label>
                    <input
                      id="sim-link-weekly-volume"
                      name="linkVolume"
                      type="number"
                      min="100"
                      value={linkVolume}
                      onChange={(e) => setLinkVolume(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!linkSource || !linkTarget || linkSource === linkTarget}
                    className="w-full rounded-lg bg-indigo-600 py-2 font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <ArrowRight className="size-4" />
                    <span>Connect Trade Flow</span>
                  </button>
                </form>
              )}

              {/* TAB 3: ENTITY DIRECTORY & BUFFER TUNER */}
              {activeTab === "registry" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="size-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      id="sim-search-facilities"
                      name="searchCustomFacilities"
                      aria-label="Search custom facilities"
                      type="text"
                      placeholder="Search custom facilities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 pl-8 p-2 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {company.nodes
                      .filter(
                        (n) =>
                          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.region.toLowerCase().includes(searchQuery.toLowerCase()),
                      )
                      .map((n) => {
                        const isOff = offline.has(n.id);
                        return (
                          <div
                            key={n.id}
                            className={`rounded-xl border p-2.5 transition-all ${
                              isOff ? "border-rose-300 bg-rose-50/50" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-slate-900">{n.label}</div>
                                <div className="text-[10.5px] text-slate-500">
                                  {n.region} • {TIER_LABEL[n.type]}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteNode(n.id)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Delete facility"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>

                            {/* Interactive Buffer Slider */}
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <label htmlFor={`sim-buffer-${n.id}`} className="flex justify-between text-[10.5px] mb-1">
                                <span className="text-slate-500">Safety Buffer:</span>
                                <span className="font-mono font-bold text-indigo-700">
                                  {n.bufferDays} Days
                                </span>
                              </label>
                              <input
                                id={`sim-buffer-${n.id}`}
                                name={`buffer_${n.id}`}
                                aria-label={`Safety buffer for ${n.label}`}
                                type="range"
                                min="1"
                                max="60"
                                value={n.bufferDays}
                                onChange={(e) =>
                                  handleUpdateNodeBuffer(n.id, Number(e.target.value))
                                }
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 4: ACTIVE ALERTS & CHOKEPOINTS */}
              {activeTab === "alerts" && (
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Bell className="size-3.5 text-amber-500" />
                      <span>Custom Network Risk Alerts ({customAlerts.length})</span>
                    </h4>
                    <p className="text-[10.5px] text-slate-600 mt-0.5">
                      Evaluated in real-time across your defined facilities and supply flows.
                    </p>
                  </div>

                  {customAlerts.length === 0 ? (
                    <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-xs">
                      <CheckCircle2 className="size-6 text-emerald-500 mx-auto mb-1.5" />
                      <span>
                        No active vulnerability alerts. All facilities adequately buffered.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customAlerts.map((a) => (
                        <div
                          key={a.id}
                          className={`rounded-xl border p-2.5 text-xs ${
                            a.severity === "critical"
                              ? "border-rose-200 bg-rose-50/60 text-rose-900"
                              : "border-amber-200 bg-amber-50/60 text-amber-900"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            <span>{a.title}</span>
                          </div>
                          <p className="mt-1 text-[11px] opacity-90 leading-relaxed">{a.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: EXECUTIVE AUDIT REPORT */}
              {activeTab === "report" && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950">
                        Executive Resilience Briefing
                      </span>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 rounded px-2 py-0.5 shadow-2xs hover:bg-indigo-50"
                      >
                        <Printer className="size-3" />
                        Print / PDF
                      </button>
                    </div>
                    <p className="text-[11px] text-indigo-800 mt-1 leading-relaxed">
                      Custom resilience audit generated for <strong>{company.name}</strong>.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-500">Composite Health Score:</span>
                      <span className="font-mono font-bold text-indigo-700 text-sm">
                        {kpis.healthScore} / 100
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-500">30-Day Value at Risk:</span>
                      <span className="font-mono font-bold text-rose-600">
                        ${((simulation.dailyDowntimeCostK * 30) / 1000 || 0).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-500">Total Weekly Throughput:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {company.nodes.reduce((s, n) => s + n.volume, 0).toLocaleString()} units
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-500">Active Facilities:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {company.nodes.length} entities ({offline.size} disrupted)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">Mean Buffer Coverage:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {Math.round(
                          company.nodes.reduce((s, n) => s + n.bufferDays, 0) /
                            (company.nodes.length || 1),
                        )}{" "}
                        Days
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="font-bold text-slate-900 mb-1">Echelon Breakdown:</div>
                    <div className="space-y-1 text-[11px] text-slate-600">
                      {TIER_ORDER.map((t) => {
                        const count = company.nodes.filter((n) => n.type === t).length;
                        return (
                          <div key={t} className="flex justify-between">
                            <span>{TIER_LABEL[t]}:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {count} nodes
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
