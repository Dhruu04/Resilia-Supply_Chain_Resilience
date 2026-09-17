import type { SupplyLink, SupplyNode } from "./types";
import type { SupplyChainDefinition } from "./real-world-chains";

export interface CompanySupplyChainConfig {
  id: string;
  name: string;
  shortName: string;
  industry: string;
  description: string;
  targetWeeklyVolume: number;
  nodes: SupplyNode[];
  links: SupplyLink[];
  positions?: Record<string, { x: number; y: number }>;
  updatedAt: number;
}

const mkNode = (
  id: string,
  label: string,
  type: SupplyNode["type"],
  region: string,
  volume: number,
  leadTimeDays: number,
  bufferDays: number,
  recoveryDays: number,
  capacityUtilization = 0.85,
  financialHealth = 85,
): SupplyNode => ({
  id,
  label,
  type,
  region,
  volume,
  leadTimeDays,
  bufferDays,
  recoveryDays,
  capacityUtilization,
  financialHealth,
  status: "healthy",
  risk_score: 0,
});

export const STARTER_TEMPLATES: Record<string, CompanySupplyChainConfig> = {
  "clean-energy": {
    id: "clean-energy",
    name: "Solaris Clean Energy & Battery Systems",
    shortName: "Solaris Energy",
    industry: "Renewable Energy & Battery Storage",
    description:
      "Integrated supply chain spanning lithium extraction to megawatt-scale battery pack assembly and grid distribution.",
    targetWeeklyVolume: 25000,
    updatedAt: Date.now(),
    nodes: [
      // Tier 3
      mkNode("CE-R1", "Silver Peak Lithium Brine", "raw", "Nevada, US", 5000, 21, 14, 30),
      mkNode("CE-R2", "Katanga Refined Cobalt", "raw", "Kolwezi, CD", 2800, 35, 7, 45),
      mkNode("CE-R3", "Queensland Synthetic Graphite", "raw", "Brisbane, AU", 4200, 28, 12, 25),
      mkNode("CE-R4", "Nordic Pure Nickel", "raw", "Harjavalta, FI", 3600, 18, 16, 20),
      // Tier 2
      mkNode(
        "CE-C1",
        "Dresden Cathode Active Material",
        "component",
        "Dresden, DE",
        4500,
        14,
        10,
        24,
      ),
      mkNode("CE-C2", "Kyoto Ceramic Separator Film", "component", "Kyoto, JP", 4000, 20, 8, 30),
      mkNode("CE-C3", "Munich BMS Power Silicon", "component", "Munich, DE", 3200, 15, 12, 18),
      // Tier 1
      mkNode(
        "CE-S1",
        "Wroclaw Battery Cell Giga-Line",
        "subassembly",
        "Wroclaw, PL",
        6500,
        10,
        14,
        21,
      ),
      mkNode(
        "CE-S2",
        "Sparks High-Voltage Enclosures",
        "subassembly",
        "Nevada, US",
        5800,
        8,
        18,
        14,
      ),
      // Assembly Plants
      mkNode(
        "CE-F1",
        "Austin Energy Storage Gigafactory",
        "factory",
        "Austin, US",
        12000,
        5,
        21,
        14,
      ),
      mkNode("CE-F2", "Berlin Clean Energy Plant", "factory", "Berlin, DE", 8500, 6, 18, 15),
      // Distribution
      mkNode(
        "CE-D1",
        "Long Beach Americas Logistics Hub",
        "distribution",
        "Los Angeles, US",
        14000,
        3,
        30,
        7,
      ),
      mkNode(
        "CE-D2",
        "Rotterdam European Grid DC",
        "distribution",
        "Rotterdam, NL",
        9500,
        4,
        28,
        7,
      ),
    ],
    links: [
      { source: "CE-R1", target: "CE-C1", volume: 3800 },
      { source: "CE-R2", target: "CE-C1", volume: 2200 },
      { source: "CE-R3", target: "CE-C2", volume: 3500 },
      { source: "CE-R4", target: "CE-C1", volume: 3000 },
      { source: "CE-C1", target: "CE-S1", volume: 4200 },
      { source: "CE-C2", target: "CE-S1", volume: 3800 },
      { source: "CE-C3", target: "CE-S2", volume: 2900 },
      { source: "CE-S1", target: "CE-F1", volume: 3500 },
      { source: "CE-S1", target: "CE-F2", volume: 3000 },
      { source: "CE-S2", target: "CE-F1", volume: 4000 },
      { source: "CE-S2", target: "CE-F2", volume: 1800 },
      { source: "CE-F1", target: "CE-D1", volume: 11000 },
      { source: "CE-F2", target: "CE-D2", volume: 8000 },
    ],
  },

  medtech: {
    id: "medtech",
    name: "Apex Precision Robotics & MedTech",
    shortName: "Apex MedTech",
    industry: "Medical Robotics & Surgical Devices",
    description:
      "High-reliability medical hardware supply chain spanning bio-grade titanium to sterile surgical robotics assembly.",
    targetWeeklyVolume: 8000,
    updatedAt: Date.now(),
    nodes: [
      // Tier 3
      mkNode("MT-R1", "Swiss Bio-Grade Titanium Bar", "raw", "Biel, CH", 1800, 28, 18, 35),
      mkNode("MT-R2", "Germany Optical Grade Silica", "raw", "Jena, DE", 1400, 30, 15, 30),
      mkNode("MT-R3", "Texas Ultra-Pure PEEK Polymer", "raw", "Houston, US", 2200, 14, 21, 20),
      // Tier 2
      mkNode(
        "MT-C1",
        "Kyoto Precision Micro-Actuators",
        "component",
        "Kyoto, JP",
        2600,
        20,
        12,
        40,
      ),
      mkNode("MT-C2", "Zurich Biosensor Transducers", "component", "Zurich, CH", 2100, 18, 14, 25),
      mkNode(
        "MT-C3",
        "Dublin Cleanroom Micro-Fluidics",
        "component",
        "Dublin, IE",
        1900,
        12,
        16,
        20,
      ),
      // Tier 1
      mkNode(
        "MT-S1",
        "Minneapolis Articulation Core",
        "subassembly",
        "Minneapolis, US",
        3400,
        10,
        14,
        21,
      ),
      mkNode(
        "MT-S2",
        "Stuttgart Vision Guidance Unit",
        "subassembly",
        "Stuttgart, DE",
        2800,
        12,
        16,
        24,
      ),
      // Assembly Plants
      mkNode("MT-F1", "Boston Surgical Robotics Plant", "factory", "Boston, US", 4200, 6, 21, 14),
      mkNode("MT-F2", "Basel Medical Instruments Center", "factory", "Basel, CH", 3200, 7, 24, 15),
      // Distribution
      mkNode(
        "MT-D1",
        "Memphis Global Healthcare Hub",
        "distribution",
        "Memphis, US",
        4500,
        2,
        35,
        7,
      ),
      mkNode(
        "MT-D2",
        "Frankfurt European Hospital DC",
        "distribution",
        "Frankfurt, DE",
        3400,
        2,
        35,
        7,
      ),
    ],
    links: [
      { source: "MT-R1", target: "MT-C1", volume: 1500 },
      { source: "MT-R2", target: "MT-C2", volume: 1200 },
      { source: "MT-R3", target: "MT-C3", volume: 1800 },
      { source: "MT-C1", target: "MT-S1", volume: 2200 },
      { source: "MT-C2", target: "MT-S2", volume: 1700 },
      { source: "MT-C3", target: "MT-S1", volume: 1600 },
      { source: "MT-S1", target: "MT-F1", volume: 2800 },
      { source: "MT-S2", target: "MT-F1", volume: 1800 },
      { source: "MT-S1", target: "MT-F2", volume: 600 },
      { source: "MT-S2", target: "MT-F2", volume: 1000 },
      { source: "MT-F1", target: "MT-D1", volume: 4000 },
      { source: "MT-F2", target: "MT-D2", volume: 3000 },
    ],
  },

  "consumer-electronics": {
    id: "consumer-electronics",
    name: "Nova Smart Consumer Hardware OEM",
    shortName: "Nova Hardware",
    industry: "Consumer Electronics & Edge Compute",
    description:
      "High-velocity global hardware supply chain delivering connected edge devices and smart consumer electronics.",
    targetWeeklyVolume: 50000,
    updatedAt: Date.now(),
    nodes: [
      // Tier 3
      mkNode("NV-R1", "Tokyo Rare Earth Magnets", "raw", "Tokyo, JP", 8500, 25, 14, 30),
      mkNode("NV-R2", "Pohang High-Purity Aluminum", "raw", "Pohang, KR", 12000, 15, 20, 18),
      mkNode("NV-R3", "Arizona Quartz Wafers", "raw", "Phoenix, US", 9500, 20, 16, 25),
      // Tier 2
      mkNode("NV-C1", "Hsinchu 3nm Mobile SoC", "component", "Hsinchu, TW", 18000, 30, 8, 45),
      mkNode("NV-C2", "Seoul Flexible OLED Displays", "component", "Seoul, KR", 14000, 18, 10, 28),
      mkNode("NV-C3", "Veldhoven Camera Optics", "component", "Veldhoven, NL", 11000, 22, 12, 35),
      // Tier 1
      mkNode(
        "NV-S1",
        "Shenzhen SMT Mainboard Assembly",
        "subassembly",
        "Shenzhen, CN",
        24000,
        8,
        12,
        18,
      ),
      mkNode("NV-S2", "Penang Audio & RF Module", "subassembly", "Penang, MY", 16000, 10, 14, 20),
      // Assembly Plants
      mkNode(
        "NV-F1",
        "Zhengzhou Final Device Assembly",
        "factory",
        "Zhengzhou, CN",
        32000,
        4,
        15,
        12,
      ),
      mkNode("NV-F2", "Chennai Device Assembly Campus", "factory", "Chennai, IN", 18000, 5, 16, 14),
      // Distribution
      mkNode("NV-D1", "Chicago North America DC", "distribution", "Chicago, US", 24000, 2, 28, 6),
      mkNode("NV-D2", "Leipzig Central Europe DC", "distribution", "Leipzig, DE", 16000, 3, 28, 6),
      mkNode("NV-D3", "Shenzhen APAC Hub", "distribution", "Shenzhen, CN", 10000, 1, 21, 5),
    ],
    links: [
      { source: "NV-R1", target: "NV-C3", volume: 7500 },
      { source: "NV-R2", target: "NV-S1", volume: 11000 },
      { source: "NV-R3", target: "NV-C1", volume: 9000 },
      { source: "NV-C1", target: "NV-S1", volume: 17000 },
      { source: "NV-C2", target: "NV-S1", volume: 13000 },
      { source: "NV-C3", target: "NV-S2", volume: 10000 },
      { source: "NV-S1", target: "NV-F1", volume: 18000 },
      { source: "NV-S1", target: "NV-F2", volume: 6000 },
      { source: "NV-S2", target: "NV-F1", volume: 11000 },
      { source: "NV-S2", target: "NV-F2", volume: 5000 },
      { source: "NV-F1", target: "NV-D1", volume: 16000 },
      { source: "NV-F1", target: "NV-D2", volume: 10000 },
      { source: "NV-F1", target: "NV-D3", volume: 6000 },
      { source: "NV-F2", target: "NV-D1", volume: 7000 },
      { source: "NV-F2", target: "NV-D2", volume: 6000 },
      { source: "NV-F2", target: "NV-D3", volume: 4000 },
    ],
  },
};

export function createBlankCompany(name = "My Custom Enterprise"): CompanySupplyChainConfig {
  return {
    id: `custom-${Date.now().toString(36)}`,
    name,
    shortName: name.slice(0, 16),
    industry: "Custom Manufacturing",
    description: "User-configured custom company network and supply chain architecture.",
    targetWeeklyVolume: 10000,
    nodes: [],
    links: [],
    updatedAt: Date.now(),
  };
}

export function exportCompanyJson(company: CompanySupplyChainConfig): string {
  return JSON.stringify(
    {
      format: "nexus-risk-company-v1",
      exportedAt: new Date().toISOString(),
      company,
    },
    null,
    2,
  );
}

export function importCompanyJson(jsonStr: string): CompanySupplyChainConfig | null {
  try {
    const parsed = JSON.parse(jsonStr);
    const data = parsed.company || parsed;
    if (!data.name || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
      return null;
    }
    return {
      id: data.id || `custom-${Date.now().toString(36)}`,
      name: data.name || "Imported Custom Company",
      shortName: data.shortName || (data.name ? data.name.slice(0, 16) : "Custom Co"),
      industry: data.industry || "Custom Manufacturing",
      description: data.description || "Imported supply chain architecture.",
      targetWeeklyVolume: Number(data.targetWeeklyVolume) || 10000,
      nodes: data.nodes,
      links: data.links,
      positions: data.positions,
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export function toSupplyChainDefinition(company: CompanySupplyChainConfig): SupplyChainDefinition {
  return {
    id: company.id,
    name: company.name,
    shortName: company.shortName || company.name.slice(0, 16),
    industry: company.industry,
    description: company.description,
    icon: "Factory",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    nodes: company.nodes,
    links: company.links,
    presetScenarios: [
      {
        name: "Single Critical Chokepoint Shock",
        note: "Disrupts primary high-volume upstream component supplier.",
        ids: company.nodes.slice(0, 1).map((n) => n.id),
      },
      {
        name: "Multi-Tier Starvation Test",
        note: "Disrupts two critical upstream tier 2 and tier 3 suppliers.",
        ids: company.nodes.slice(0, 2).map((n) => n.id),
      },
    ],
  };
}
