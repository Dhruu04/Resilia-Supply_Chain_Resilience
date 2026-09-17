export type NodeTier = "raw" | "component" | "subassembly" | "factory" | "distribution";

export type NodeStatus = "healthy" | "at-risk" | "failed";

/** Raw, observable attributes of an entity. Risk is derived from these — never hand-typed. */
export interface SupplyNode {
  id: string;
  label: string;
  type: NodeTier;
  region: string;
  /** units / week produced, drives node size */
  volume: number;
  /** replenishment lead time in days */
  leadTimeDays: number;
  /** days of on-hand inventory buffer downstream can draw on */
  bufferDays: number;
  /** days to restore output after a disruption */
  recoveryDays: number;
  /** 0-1 share of nameplate capacity currently consumed */
  capacityUtilization: number;
  /** 0-100 supplier financial strength (higher = stronger) */
  financialHealth: number;
  status: NodeStatus;
  /** derived 0-100 composite risk score (see risk.ts) */
  risk_score: number;
}

export interface SupplyLink {
  source: string;
  target: string;
  volume: number;
}

export interface SupplyNetwork {
  nodes: SupplyNode[];
  links: SupplyLink[];
}

export const TIER_LABEL: Record<NodeTier, string> = {
  raw: "Tier 3 · Raw Material",
  component: "Tier 2 · Component Mfg",
  subassembly: "Tier 1 · Sub-Assembly",
  factory: "Assembly Plant",
  distribution: "Distribution Center",
};

export const TIER_ORDER: NodeTier[] = [
  "raw",
  "component",
  "subassembly",
  "factory",
  "distribution",
];
