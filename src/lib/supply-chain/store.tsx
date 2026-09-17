import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { REAL_WORLD_SUPPLY_CHAINS, type SupplyChainDefinition } from "./real-world-chains";
import { DEFAULT_WEIGHTS, scoreNetwork, type RiskIndex, type RiskWeights } from "./risk";
import { buildAlerts, type RiskAlert } from "./derive";
import {
  computeKpis,
  propagateFailures,
  type NetworkKpis,
  type SimulationResult,
} from "./simulation";
import type { SupplyLink, SupplyNetwork, SupplyNode } from "./types";

const STORAGE_KEY = "nexus-risk-state-v2";

export interface SavedScenario {
  id: string;
  name: string;
  note: string;
  offline: string[];
  createdAt: number;
  healthScore: number;
  impactedVolume: number;
  offlineNodes: number;
  atRiskNodes: number;
}

export interface Incident {
  id: string;
  ts: number;
  kind: "failure" | "restore" | "scenario" | "reset" | "data" | "model";
  message: string;
  nodeId?: string | undefined;
}

export type NodeOverride = Partial<Omit<SupplyNode, "id" | "status" | "risk_score">>;

interface Persisted {
  activeChainId: string;
  offline: string[];
  watchlist: string[];
  weights: RiskWeights;
  overrides: Record<string, NodeOverride>;
  addedNodes: SupplyNode[];
  removedNodes: string[];
  addedLinks: SupplyLink[];
  removedLinks: string[];
  scenarios: SavedScenario[];
  incidents: Incident[];
  customChain?: SupplyChainDefinition | undefined;
}

const EMPTY: Persisted = {
  activeChainId: "semiconductor",
  offline: [],
  watchlist: [],
  weights: DEFAULT_WEIGHTS,
  overrides: {},
  addedNodes: [],
  removedNodes: [],
  addedLinks: [],
  removedLinks: [],
  scenarios: [],
  incidents: [],
  customChain: undefined,
};

const linkKey = (source: string, target: string) => `${source}>${target}`;
const uid = () => Math.random().toString(36).slice(2, 10);

export function getChainDefinition(
  id: string = "semiconductor",
  customChain?: SupplyChainDefinition,
): SupplyChainDefinition {
  if (customChain && customChain.id === id) return customChain;
  return REAL_WORLD_SUPPLY_CHAINS.find((c) => c.id === id) ?? REAL_WORLD_SUPPLY_CHAINS[0]!;
}

function buildBaseNetwork(state: Persisted): SupplyNetwork {
  const chain = getChainDefinition(state.activeChainId, state.customChain);
  const removed = new Set(state.removedNodes);
  const nodes: SupplyNode[] = [
    ...chain.nodes
      .filter((n) => !removed.has(n.id))
      .map((n) => ({ ...n, ...(state.overrides[n.id] ?? {}) })),
    ...state.addedNodes.filter((n) => !removed.has(n.id)),
  ];
  const ids = new Set(nodes.map((n) => n.id));
  const removedLinks = new Set(state.removedLinks);
  const links = [...chain.links, ...state.addedLinks].filter(
    (l) => ids.has(l.source) && ids.has(l.target) && !removedLinks.has(linkKey(l.source, l.target)),
  );
  return { nodes, links };
}

export interface SupplyStore {
  hydrated: boolean;
  activeChainId: string;
  activeChain: SupplyChainDefinition;
  allChains: SupplyChainDefinition[];
  setSupplyChain: (id: string) => void;
  loadCustomSupplyChain: (chain: SupplyChainDefinition) => void;
  network: SupplyNetwork;
  risk: RiskIndex;
  result: SimulationResult;
  kpis: NetworkKpis;
  alerts: RiskAlert[];
  offline: ReadonlySet<string>;
  watchlist: ReadonlySet<string>;
  weights: RiskWeights;
  scenarios: SavedScenario[];
  incidents: Incident[];
  nodeById: (id: string) => SupplyNode | undefined;
  toggleFailure: (id: string) => void;
  setOffline: (ids: string[], label?: string) => void;
  resetScenario: () => void;
  toggleWatch: (id: string) => void;
  setWeights: (w: RiskWeights) => void;
  resetWeights: () => void;
  saveScenario: (name: string, note: string) => void;
  deleteScenario: (id: string) => void;
  applyScenario: (id: string) => void;
  clearIncidents: () => void;
  updateNode: (id: string, patch: NodeOverride) => void;
  addNode: (node: SupplyNode) => void;
  removeNode: (id: string) => void;
  addLink: (link: SupplyLink) => void;
  removeLink: (source: string, target: string) => void;
  resetData: () => void;
  resetAll: () => void;
  exportState: () => string;
}

const Ctx = createContext<SupplyStore | null>(null);

export function SupplyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          ...EMPTY,
          ...parsed,
          activeChainId: parsed.activeChainId || "semiconductor",
          weights: { ...DEFAULT_WEIGHTS, ...(parsed.weights ?? {}) },
        });
      }
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist to localStorage on changes (debounced)
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // storage full or blocked
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [state, hydrated]);

  const activeChain = useMemo(
    () => getChainDefinition(state.activeChainId, state.customChain),
    [state.activeChainId, state.customChain],
  );

  const allChains = useMemo(
    () =>
      state.customChain
        ? [...REAL_WORLD_SUPPLY_CHAINS, state.customChain]
        : REAL_WORLD_SUPPLY_CHAINS,
    [state.customChain],
  );

  const baseNetwork = useMemo(() => buildBaseNetwork(state), [state]);

  const scored = useMemo(
    () => scoreNetwork(baseNetwork, state.weights),
    [baseNetwork, state.weights],
  );

  const offlineSet = useMemo(() => new Set(state.offline), [state.offline]);
  const watchlistSet = useMemo(() => new Set(state.watchlist), [state.watchlist]);

  const result = useMemo(
    () => propagateFailures(scored.network, offlineSet),
    [scored.network, offlineSet],
  );

  const kpis = useMemo(() => computeKpis(scored.network, result), [scored.network, result]);

  const alerts = useMemo(
    () => buildAlerts(scored.network, scored.risk, result, watchlistSet),
    [scored.network, scored.risk, result, watchlistSet],
  );

  const nodeById = useCallback(
    (id: string) => scored.network.nodes.find((n) => n.id === id),
    [scored.network.nodes],
  );

  const setSupplyChain = useCallback(
    (id: string) => {
      const chain = getChainDefinition(id, state.customChain);
      setState((prev) => ({
        ...prev,
        activeChainId: id,
        offline: [],
        overrides: {},
        addedNodes: [],
        removedNodes: [],
        addedLinks: [],
        removedLinks: [],
        incidents: [
          {
            id: uid(),
            ts: Date.now(),
            kind: "data",
            message: `Switched active supply chain to "${chain.name}" (${chain.industry})`,
          },
          ...prev.incidents.slice(0, 49),
        ],
      }));
    },
    [state.customChain],
  );

  const loadCustomSupplyChain = useCallback((chain: SupplyChainDefinition) => {
    setState((prev) => ({
      ...prev,
      activeChainId: chain.id,
      customChain: chain,
      offline: [],
      overrides: {},
      addedNodes: [],
      removedNodes: [],
      addedLinks: [],
      removedLinks: [],
      incidents: [
        {
          id: uid(),
          ts: Date.now(),
          kind: "data",
          message: `Loaded custom company supply chain "${chain.name}" into active session`,
        },
        ...prev.incidents.slice(0, 49),
      ],
    }));
  }, []);

  const toggleFailure = useCallback(
    (id: string) => {
      const target = nodeById(id);
      const isOut = offlineSet.has(id);
      const next = isOut ? state.offline.filter((x) => x !== id) : [...state.offline, id];

      const inc: Incident = {
        id: uid(),
        ts: Date.now(),
        kind: isOut ? "restore" : "failure",
        nodeId: id,
        message: isOut
          ? `Restored ${target?.label ?? id} to nominal operation`
          : `Disrupted ${target?.label ?? id} (${target?.region ?? ""})`,
      };

      setState((prev) => ({
        ...prev,
        offline: next,
        incidents: [inc, ...prev.incidents.slice(0, 49)],
      }));
    },
    [nodeById, offlineSet, state.offline],
  );

  const setOffline = useCallback((ids: string[], label?: string) => {
    const inc: Incident = {
      id: uid(),
      ts: Date.now(),
      kind: "scenario",
      message: label ?? `Applied scenario with ${ids.length} entity disruption(s)`,
    };
    setState((prev) => ({
      ...prev,
      offline: Array.from(new Set(ids)),
      incidents: [inc, ...prev.incidents.slice(0, 49)],
    }));
  }, []);

  const resetScenario = useCallback(() => {
    const hadOffline = state.offline.length > 0;
    setState((prev) => ({
      ...prev,
      offline: [],
      incidents: hadOffline
        ? [
            {
              id: uid(),
              ts: Date.now(),
              kind: "reset",
              message: "Reset all entities to baseline operation",
            },
            ...prev.incidents.slice(0, 49),
          ]
        : prev.incidents,
    }));
  }, [state.offline.length]);

  const toggleWatch = useCallback((id: string) => {
    setState((prev) => {
      const set = new Set(prev.watchlist);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, watchlist: Array.from(set) };
    });
  }, []);

  const setWeights = useCallback((w: RiskWeights) => {
    setState((prev) => ({
      ...prev,
      weights: { ...w },
      incidents: [
        {
          id: uid(),
          ts: Date.now(),
          kind: "model",
          message: "Adjusted quantitative risk factor weights",
        },
        ...prev.incidents.slice(0, 49),
      ],
    }));
  }, []);

  const resetWeights = useCallback(() => {
    setState((prev) => ({
      ...prev,
      weights: DEFAULT_WEIGHTS,
      incidents: [
        {
          id: uid(),
          ts: Date.now(),
          kind: "model",
          message: "Reset risk model factor weights to defaults",
        },
        ...prev.incidents.slice(0, 49),
      ],
    }));
  }, []);

  const saveScenario = useCallback(
    (name: string, note: string) => {
      const saved: SavedScenario = {
        id: uid(),
        name: name.trim() || `Scenario ${new Date().toLocaleTimeString()}`,
        note: note.trim(),
        offline: [...state.offline],
        createdAt: Date.now(),
        healthScore: kpis.healthScore,
        impactedVolume: kpis.impactedVolume,
        offlineNodes: kpis.offlineNodes,
        atRiskNodes: kpis.atRiskNodes,
      };
      setState((prev) => ({
        ...prev,
        scenarios: [saved, ...prev.scenarios],
      }));
    },
    [state.offline, kpis],
  );

  const deleteScenario = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      scenarios: prev.scenarios.filter((s) => s.id !== id),
    }));
  }, []);

  const applyScenario = useCallback(
    (id: string) => {
      const target = state.scenarios.find((s) => s.id === id);
      if (!target) return;
      setOffline(target.offline, `Applied saved scenario: "${target.name}"`);
    },
    [state.scenarios, setOffline],
  );

  const clearIncidents = useCallback(() => {
    setState((prev) => ({ ...prev, incidents: [] }));
  }, []);

  const updateNode = useCallback((id: string, patch: NodeOverride) => {
    setState((prev) => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        [id]: { ...(prev.overrides[id] ?? {}), ...patch },
      },
    }));
  }, []);

  const addNode = useCallback((n: SupplyNode) => {
    setState((prev) => ({
      ...prev,
      addedNodes: [...prev.addedNodes.filter((x) => x.id !== n.id), n],
      removedNodes: prev.removedNodes.filter((x) => x !== n.id),
    }));
  }, []);

  const removeNode = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      removedNodes: Array.from(new Set([...prev.removedNodes, id])),
      offline: prev.offline.filter((x) => x !== id),
    }));
  }, []);

  const addLink = useCallback((l: SupplyLink) => {
    setState((prev) => ({
      ...prev,
      addedLinks: [
        ...prev.addedLinks.filter((x) => !(x.source === l.source && x.target === l.target)),
        l,
      ],
      removedLinks: prev.removedLinks.filter((k) => k !== linkKey(l.source, l.target)),
    }));
  }, []);

  const removeLink = useCallback((source: string, target: string) => {
    const k = linkKey(source, target);
    setState((prev) => ({
      ...prev,
      removedLinks: Array.from(new Set([...prev.removedLinks, k])),
      addedLinks: prev.addedLinks.filter((l) => !(l.source === source && l.target === target)),
    }));
  }, []);

  const resetData = useCallback(() => {
    setState((prev) => ({
      ...prev,
      offline: [],
      overrides: {},
      addedNodes: [],
      removedNodes: [],
      addedLinks: [],
      removedLinks: [],
      incidents: [
        {
          id: uid(),
          ts: Date.now(),
          kind: "data",
          message: "Reset network nodes and links to baseline catalog",
        },
        ...prev.incidents.slice(0, 49),
      ],
    }));
  }, []);

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState(EMPTY);
  }, []);

  const exportState = useCallback(() => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        activeChain: activeChain.name,
        state,
        kpis,
      },
      null,
      2,
    );
  }, [state, kpis, activeChain.name]);

  const value: SupplyStore = {
    hydrated,
    activeChainId: state.activeChainId,
    activeChain,
    allChains,
    setSupplyChain,
    loadCustomSupplyChain,
    network: scored.network,
    risk: scored.risk,
    result,
    kpis,
    alerts,
    offline: offlineSet,
    watchlist: watchlistSet,
    weights: state.weights,
    scenarios: state.scenarios,
    incidents: state.incidents,
    nodeById,
    toggleFailure,
    setOffline,
    resetScenario,
    toggleWatch,
    setWeights,
    resetWeights,
    saveScenario,
    deleteScenario,
    applyScenario,
    clearIncidents,
    updateNode,
    addNode,
    removeNode,
    addLink,
    removeLink,
    resetData,
    resetAll,
    exportState,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSupply(): SupplyStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSupply must be used within SupplyProvider");
  return ctx;
}
