import { scoreNetwork } from "./risk";
import type { SupplyLink, SupplyNetwork, SupplyNode } from "./types";

export interface SupplyChainDefinition {
  id: string;
  name: string;
  shortName: string;
  industry: string;
  description: string;
  icon: string; // lucide icon name
  badgeColor: string;
  nodes: SupplyNode[];
  links: SupplyLink[];
  presetScenarios: {
    name: string;
    note: string;
    ids: string[];
  }[];
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
  capacityUtilization: number,
  financialHealth: number,
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

/* =========================================================================
   1. ADVANCED SEMICONDUCTORS & AI COMPUTE HARDWARE (TSMC, ASML, NVIDIA, FOXCONN)
   ========================================================================= */
const semiNodes: SupplyNode[] = [
  // Tier 3 — Raw minerals & chemical precursors
  mkNode("R1", "Shin-Etsu Electronic Silicon", "raw", "Niigata, JP", 4800, 30, 10, 24, 0.94, 91),
  mkNode("R2", "Katanga Gallium & Germanium", "raw", "Kolwezi, CD", 1900, 48, 5, 42, 0.96, 46),
  mkNode("R3", "Linde High-Purity Neon", "raw", "Leuna, DE", 3400, 26, 8, 30, 0.91, 88),
  mkNode("R4", "Sumitomo High-Purity Copper", "raw", "Ehime, JP", 3900, 18, 14, 15, 0.72, 85),
  mkNode("R5", "Posco Electronic Chemical", "raw", "Pohang, KR", 2900, 22, 11, 18, 0.79, 82),

  // Tier 2 — Core components & wafer fabrication
  mkNode("C1", "ASML EUV Photolithography", "component", "Veldhoven, NL", 850, 45, 6, 50, 0.98, 95),
  mkNode(
    "C2",
    "TSMC Fab 18 (3nm/4nm AI Foundries)",
    "component",
    "Tainan, TW",
    5200,
    38,
    5,
    36,
    0.97,
    93,
  ),
  mkNode("C3", "SK Hynix HBM3e Memory Fab", "component", "Icheon, KR", 3800, 25, 9, 20, 0.88, 86),
  mkNode(
    "C4",
    "ASE CoWoS Advanced Packaging",
    "component",
    "Kaohsiung, TW",
    3400,
    28,
    7,
    26,
    0.93,
    84,
  ),
  mkNode("C5", "Intel Fab 34 Logic Campus", "component", "Leixlip, IE", 2600, 32, 12, 22, 0.76, 80),
  mkNode("C6", "Kyocera Ceramic Substrates", "component", "Kyoto, JP", 2200, 19, 13, 14, 0.74, 87),

  // Tier 1 — Sub-assemblies & accelerator boards
  mkNode(
    "S1",
    "Quanta High-Density AI Server Racks",
    "subassembly",
    "Taoyuan, TW",
    3100,
    16,
    9,
    14,
    0.89,
    88,
  ),
  mkNode(
    "S2",
    "Foxconn Precision Compute Boards",
    "subassembly",
    "Zhengzhou, CN",
    3600,
    18,
    8,
    16,
    0.92,
    79,
  ),
  mkNode(
    "S3",
    "Celestica Enterprise Logic Modules",
    "subassembly",
    "Monterrey, MX",
    2100,
    12,
    14,
    10,
    0.68,
    83,
  ),
  mkNode(
    "S4",
    "Wistron Power Delivery Units",
    "subassembly",
    "Hsinchu, TW",
    2500,
    14,
    11,
    12,
    0.75,
    81,
  ),

  // Assembly Plants — System integration
  mkNode("F1", "Quanta Cloud Computing Plant", "factory", "Fremont, US", 4400, 8, 12, 8, 0.86, 94),
  mkNode(
    "F2",
    "Foxconn Hyper-Scale Facility",
    "factory",
    "Guadalajara, MX",
    3900,
    9,
    10,
    9,
    0.84,
    89,
  ),
  mkNode(
    "F3",
    "Pegatron Enterprise Integration",
    "factory",
    "Suzhou, CN",
    4900,
    8,
    11,
    10,
    0.91,
    88,
  ),

  // Distribution — Hyperscale Cloud Regions
  mkNode(
    "D1",
    "Ashburn Hyperscale DC Alley",
    "distribution",
    "Ashburn, US",
    3800,
    3,
    22,
    4,
    0.65,
    96,
  ),
  mkNode(
    "D2",
    "Frankfurt Cloud Gateway",
    "distribution",
    "Frankfurt, DE",
    3400,
    4,
    20,
    5,
    0.68,
    93,
  ),
  mkNode(
    "D3",
    "Singapore Asia-Pac DC Hub",
    "distribution",
    "Singapore, SG",
    4100,
    3,
    24,
    4,
    0.62,
    95,
  ),
];

const semiLinks: SupplyLink[] = [
  // raw -> component
  { source: "R1", target: "C2", volume: 3200 },
  { source: "R1", target: "C5", volume: 1600 },
  { source: "R2", target: "C2", volume: 1100 },
  { source: "R2", target: "C4", volume: 800 },
  { source: "R3", target: "C1", volume: 850 },
  { source: "R3", target: "C2", volume: 2100 },
  { source: "R4", target: "C3", volume: 1900 },
  { source: "R4", target: "C6", volume: 1500 },
  { source: "R5", target: "C3", volume: 1800 },
  { source: "R5", target: "C4", volume: 1100 },

  // component -> sub-assembly
  { source: "C1", target: "C2", volume: 800 }, // photolithography feeding foundry
  { source: "C2", target: "C4", volume: 3200 }, // wafers to packaging
  { source: "C3", target: "C4", volume: 2600 }, // HBM to CoWoS
  { source: "C4", target: "S1", volume: 2200 },
  { source: "C4", target: "S2", volume: 2100 },
  { source: "C5", target: "S3", volume: 1700 },
  { source: "C6", target: "S1", volume: 1200 },
  { source: "C6", target: "S4", volume: 1000 },

  // sub-assembly -> factory
  { source: "S1", target: "F1", volume: 2100 },
  { source: "S3", target: "F1", volume: 1500 },
  { source: "S1", target: "F2", volume: 1600 },
  { source: "S3", target: "F2", volume: 1400 },
  { source: "S2", target: "F3", volume: 2600 },
  { source: "S4", target: "F3", volume: 1800 },

  // factory -> distribution
  { source: "F1", target: "D1", volume: 2600 },
  { source: "F1", target: "D2", volume: 1200 },
  { source: "F2", target: "D1", volume: 2100 },
  { source: "F3", target: "D3", volume: 3100 },
  { source: "F3", target: "D2", volume: 1400 },
];

/* =========================================================================
   2. ELECTRIC VEHICLES & BATTERY GIGAFACTORIES (TESLA, CATL, PANASONIC)
   ========================================================================= */
const evNodes: SupplyNode[] = [
  // Tier 3 — Critical battery minerals
  mkNode("R1", "Albemarle Atacama Lithium Brine", "raw", "Atacama, CL", 4600, 35, 7, 32, 0.94, 88),
  mkNode("R2", "Glencore Katanga Cobalt Works", "raw", "Kolwezi, CD", 2400, 46, 5, 44, 0.95, 45),
  mkNode("R3", "Vale Sulawesi Nickel Pellets", "raw", "Sulawesi, ID", 3900, 31, 8, 28, 0.88, 76),
  mkNode("R4", "Syrah Balama Spherical Graphite", "raw", "Balama, MZ", 2800, 40, 6, 36, 0.91, 58),
  mkNode(
    "R5",
    "Boliden Low-Carbon Copper Smelter",
    "raw",
    "Skellefteå, SE",
    3500,
    16,
    15,
    12,
    0.69,
    89,
  ),

  // Tier 2 — Battery cell chemistry & inverters
  mkNode(
    "C1",
    "CATL Gigafactory LFP/NMC Cells",
    "component",
    "Ningde, CN",
    5800,
    24,
    7,
    22,
    0.95,
    87,
  ),
  mkNode(
    "C2",
    "Panasonic Energy Cylindrical Cells",
    "component",
    "Osaka, JP",
    4100,
    22,
    9,
    18,
    0.86,
    91,
  ),
  mkNode(
    "C3",
    "LG Energy Solution Cheongju Fab",
    "component",
    "Cheongju, KR",
    3600,
    23,
    8,
    19,
    0.85,
    86,
  ),
  mkNode(
    "C4",
    "Infineon Silicon Carbide Inverters",
    "component",
    "Villach, AT",
    2900,
    28,
    10,
    25,
    0.89,
    90,
  ),
  mkNode(
    "C5",
    "Nemak Lightweight Aluminum Castings",
    "component",
    "Monterrey, MX",
    3100,
    12,
    14,
    9,
    0.71,
    82,
  ),

  // Tier 1 — Pack modules & drivetrains
  mkNode(
    "S1",
    "Northvolt Ett Circular Battery Packs",
    "subassembly",
    "Skellefteå, SE",
    2800,
    15,
    10,
    14,
    0.84,
    78,
  ),
  mkNode(
    "S2",
    "Magna Steyr Dual-Motor e-Axles",
    "subassembly",
    "Graz, AT",
    3200,
    13,
    12,
    11,
    0.77,
    86,
  ),
  mkNode(
    "S3",
    "BorgWarner Inverters & Gearboxes",
    "subassembly",
    "Ramos Arizpe, MX",
    3400,
    11,
    14,
    9,
    0.72,
    84,
  ),
  mkNode(
    "S4",
    "Gotion High-Tech Battery Systems",
    "subassembly",
    "Hefei, CN",
    3900,
    14,
    9,
    15,
    0.88,
    80,
  ),

  // Assembly Plants — EV Gigafactories
  mkNode("F1", "Tesla Gigafactory Texas", "factory", "Austin, US", 5600, 7, 10, 8, 0.88, 95),
  mkNode(
    "F2",
    "Gigafactory Berlin-Brandenburg",
    "factory",
    "Grünheide, DE",
    4600,
    8,
    12,
    9,
    0.82,
    92,
  ),
  mkNode("F3", "Tesla Gigafactory Shanghai", "factory", "Shanghai, CN", 6400, 7, 9, 8, 0.94, 94),

  // Distribution — Regional EV delivery networks
  mkNode("D1", "North America Central Hub", "distribution", "Dallas, US", 4200, 3, 20, 4, 0.64, 94),
  mkNode(
    "D2",
    "Western Europe Superhub",
    "distribution",
    "Rotterdam, NL",
    3800,
    4,
    21,
    4,
    0.67,
    92,
  ),
  mkNode("D3", "East Asia Delivery Grid", "distribution", "Yokohama, JP", 4400, 3, 22, 4, 0.65, 93),
];

const evLinks: SupplyLink[] = [
  // raw -> component
  { source: "R1", target: "C1", volume: 2800 },
  { source: "R1", target: "C2", volume: 1800 },
  { source: "R2", target: "C1", volume: 1500 },
  { source: "R2", target: "C3", volume: 900 },
  { source: "R3", target: "C1", volume: 2400 },
  { source: "R3", target: "C3", volume: 1500 },
  { source: "R4", target: "C1", volume: 1800 },
  { source: "R4", target: "C2", volume: 1000 },
  { source: "R5", target: "C4", volume: 1900 },
  { source: "R5", target: "C5", volume: 1600 },

  // component -> sub-assembly
  { source: "C1", target: "S4", volume: 3400 },
  { source: "C2", target: "S3", volume: 2400 },
  { source: "C3", target: "S1", volume: 1800 },
  { source: "C4", target: "S2", volume: 1700 },
  { source: "C4", target: "S3", volume: 1200 },
  { source: "C5", target: "S2", volume: 1500 },
  { source: "C5", target: "S3", volume: 1600 },

  // sub-assembly -> factory
  { source: "S3", target: "F1", volume: 3100 },
  { source: "S2", target: "F1", volume: 1600 },
  { source: "S1", target: "F2", volume: 2400 },
  { source: "S2", target: "F2", volume: 1900 },
  { source: "S4", target: "F3", volume: 3600 },
  { source: "S3", target: "F3", volume: 1200 },

  // factory -> distribution
  { source: "F1", target: "D1", volume: 3800 },
  { source: "F1", target: "D2", volume: 1100 },
  { source: "F2", target: "D2", volume: 3200 },
  { source: "F3", target: "D3", volume: 3900 },
  { source: "F3", target: "D1", volume: 1400 },
];

/* =========================================================================
   3. GLOBAL BIOPHARMA & VACCINES (PFIZER, BIONTECH, LONZA, WHO)
   ========================================================================= */
const bioNodes: SupplyNode[] = [
  // Tier 3 — Active Pharmaceutical Ingredients & Precursors
  mkNode(
    "R1",
    "Divi's Laboratories API Chemical",
    "raw",
    "Hyderabad, IN",
    4500,
    32,
    8,
    25,
    0.89,
    78,
  ),
  mkNode("R2", "Croda High-Purity LNP Lipids", "raw", "Snaith, UK", 1600, 42, 5, 38, 0.96, 88),
  mkNode("R3", "Lonza Specialized Biochemicals", "raw", "Visp, CH", 2800, 24, 11, 20, 0.85, 93),
  mkNode("R4", "Corning Borosilicate Tubing", "raw", "Vineland, US", 3600, 16, 16, 12, 0.71, 90),
  mkNode(
    "R5",
    "Evonik Pharmaceutical Polymers",
    "raw",
    "Darmstadt, DE",
    2400,
    20,
    12,
    16,
    0.77,
    89,
  ),

  // Tier 2 — Bioreactors, Enzymes & Sterile Containers
  mkNode("C1", "BioNTech mRNA Synthesis Lab", "component", "Mainz, DE", 2100, 34, 6, 32, 0.94, 94),
  mkNode(
    "C2",
    "Sartorius Single-Use Bioreactors",
    "component",
    "Göttingen, DE",
    2600,
    28,
    9,
    22,
    0.88,
    91,
  ),
  mkNode(
    "C3",
    "Schott Pharma Cryogenic Vials",
    "component",
    "Müllheim, DE",
    4200,
    18,
    14,
    14,
    0.76,
    87,
  ),
  mkNode(
    "C4",
    "West Pharma Elastomer Stoppers",
    "component",
    "Exton, US",
    3800,
    15,
    15,
    11,
    0.72,
    86,
  ),

  // Tier 1 — Formulation & sterile fill-finish
  mkNode(
    "S1",
    "Lonza Biologics Bulk Formulation",
    "subassembly",
    "Portsmouth, US",
    3100,
    16,
    10,
    15,
    0.86,
    90,
  ),
  mkNode(
    "S2",
    "Catalent Biologics Sterile Fill",
    "subassembly",
    "Bloomington, US",
    3300,
    14,
    12,
    12,
    0.82,
    82,
  ),
  mkNode(
    "S3",
    "Rovi Contract Pharma Packaging",
    "subassembly",
    "Madrid, ES",
    2800,
    15,
    11,
    13,
    0.79,
    85,
  ),

  // Final Packaging & Deep-Freeze Plants
  mkNode("F1", "Pfizer Global Supply Puurs", "factory", "Puurs, BE", 5200, 8, 12, 9, 0.91, 96),
  mkNode(
    "F2",
    "Pfizer Kalamazoo Logistics Campus",
    "factory",
    "Kalamazoo, US",
    4800,
    7,
    13,
    8,
    0.87,
    95,
  ),
  mkNode("F3", "Serum Institute Mega-Plant", "factory", "Pune, IN", 6100, 9, 10, 11, 0.93, 84),

  // Ultra-Cold Distribution Hubs
  mkNode(
    "D1",
    "WHO Humanitarian Medical Depot",
    "distribution",
    "Geneva, CH",
    3600,
    3,
    24,
    4,
    0.58,
    96,
  ),
  mkNode(
    "D2",
    "FedEx SuperHub Cold Chain",
    "distribution",
    "Memphis, US",
    4400,
    2,
    22,
    3,
    0.62,
    94,
  ),
  mkNode(
    "D3",
    "DHL Life Sciences European Hub",
    "distribution",
    "Leipzig, DE",
    4100,
    3,
    25,
    4,
    0.6,
    95,
  ),
];

const bioLinks: SupplyLink[] = [
  // raw -> component
  { source: "R1", target: "C1", volume: 2200 },
  { source: "R2", target: "C1", volume: 1600 },
  { source: "R3", target: "C2", volume: 1800 },
  { source: "R4", target: "C3", volume: 3200 },
  { source: "R5", target: "C4", volume: 2200 },

  // component -> sub-assembly
  { source: "C1", target: "S1", volume: 1800 },
  { source: "C1", target: "S3", volume: 1400 },
  { source: "C2", target: "S1", volume: 1700 },
  { source: "C3", target: "S2", volume: 2100 },
  { source: "C4", target: "S2", volume: 1900 },
  { source: "C3", target: "S3", volume: 1600 },

  // sub-assembly -> factory
  { source: "S1", target: "F2", volume: 2800 },
  { source: "S2", target: "F2", volume: 2400 },
  { source: "S1", target: "F1", volume: 1600 },
  { source: "S3", target: "F1", volume: 2600 },
  { source: "S2", target: "F3", volume: 2200 },
  { source: "R1", target: "F3", volume: 2300 }, // direct API feed to Pune

  // factory -> distribution
  { source: "F1", target: "D1", volume: 2400 },
  { source: "F1", target: "D3", volume: 2800 },
  { source: "F2", target: "D2", volume: 3800 },
  { source: "F3", target: "D1", volume: 2600 },
  { source: "F3", target: "D3", volume: 1800 },
];

/* =========================================================================
   4. AEROSPACE & COMMERCIAL AVIATION (BOEING, AIRBUS, CFM, SAFRAN)
   ========================================================================= */
const aeroNodes: SupplyNode[] = [
  // Tier 3 — Aerospace alloys & composites
  mkNode("R1", "Toray Carbon Fiber Prepreg", "raw", "Mishima, JP", 3400, 36, 12, 28, 0.88, 92),
  mkNode("R2", "Timet Certified Aero-Titanium", "raw", "Henderson, US", 2600, 48, 8, 40, 0.94, 86),
  mkNode(
    "R3",
    "Alcoa 7000-Series Wing Alloys",
    "raw",
    "Pittsburgh, US",
    3800,
    22,
    14,
    18,
    0.74,
    88,
  ),
  mkNode("R4", "Safran Superalloy Discs", "raw", "Gennevilliers, FR", 2100, 40, 9, 34, 0.92, 91),

  // Tier 2 — Turbofans, avionics & flight actuators
  mkNode(
    "C1",
    "CFM International LEAP Turbofans",
    "component",
    "Cincinnati, US",
    1800,
    52,
    6,
    45,
    0.97,
    93,
  ),
  mkNode(
    "C2",
    "Honeywell Integrated Flight Avionics",
    "component",
    "Phoenix, US",
    2400,
    30,
    10,
    24,
    0.85,
    90,
  ),
  mkNode(
    "C3",
    "Collins Aerospace Actuation Systems",
    "component",
    "Wolverhampton, UK",
    2200,
    28,
    11,
    22,
    0.82,
    88,
  ),
  mkNode(
    "C4",
    "Precision Castparts Turbine Blisks",
    "component",
    "Portland, US",
    1900,
    34,
    8,
    30,
    0.9,
    84,
  ),

  // Tier 1 — Aerostructures & Fuselage Barrels
  mkNode(
    "S1",
    "Spirit AeroSystems Forward Fuselages",
    "subassembly",
    "Wichita, US",
    2400,
    24,
    6,
    36,
    0.95,
    68,
  ),
  mkNode(
    "S2",
    "Leonardo Aerostructures Stabilizers",
    "subassembly",
    "Foggia, IT",
    1900,
    20,
    12,
    18,
    0.78,
    80,
  ),
  mkNode(
    "S3",
    "Premium AEROTEC Pressure Bulkheads",
    "subassembly",
    "Augsburg, DE",
    1700,
    18,
    14,
    15,
    0.75,
    87,
  ),

  // Final Assembly Lines (FAL)
  mkNode(
    "F1",
    "Boeing Commercial Airplanes Everett",
    "factory",
    "Seattle, US",
    3600,
    14,
    10,
    16,
    0.89,
    74,
  ),
  mkNode(
    "F2",
    "Airbus Commercial FAL Toulouse",
    "factory",
    "Toulouse, FR",
    3900,
    12,
    13,
    14,
    0.87,
    93,
  ),
  mkNode(
    "F3",
    "Airbus Single-Aisle FAL Hamburg",
    "factory",
    "Hamburg, DE",
    3400,
    11,
    14,
    12,
    0.83,
    92,
  ),

  // Airline Delivery & Acceptance Hubs
  mkNode(
    "D1",
    "Boeing Seattle Delivery Center",
    "distribution",
    "Seattle, US",
    2800,
    4,
    18,
    5,
    0.68,
    88,
  ),
  mkNode(
    "D2",
    "Airbus Toulouse Delivery Centre",
    "distribution",
    "Toulouse, FR",
    3200,
    4,
    20,
    5,
    0.64,
    94,
  ),
  mkNode(
    "D3",
    "Changi Aerospace Logistics Park",
    "distribution",
    "Singapore, SG",
    2600,
    5,
    22,
    6,
    0.59,
    92,
  ),
];

const aeroLinks: SupplyLink[] = [
  // raw -> component
  { source: "R1", target: "C4", volume: 1400 },
  { source: "R2", target: "C1", volume: 1600 },
  { source: "R3", target: "C3", volume: 1700 },
  { source: "R4", target: "C1", volume: 1800 },
  { source: "R4", target: "C4", volume: 1200 },

  // component -> sub-assembly
  { source: "R1", target: "S1", volume: 1800 },
  { source: "R3", target: "S1", volume: 1900 },
  { source: "C2", target: "S1", volume: 1500 },
  { source: "C3", target: "S2", volume: 1400 },
  { source: "R1", target: "S3", volume: 1300 },

  // sub-assembly / engines -> factory
  { source: "S1", target: "F1", volume: 2200 },
  { source: "C1", target: "F1", volume: 1700 },
  { source: "C2", target: "F1", volume: 1200 },
  { source: "S2", target: "F2", volume: 1600 },
  { source: "S3", target: "F2", volume: 1500 },
  { source: "C1", target: "F2", volume: 1600 },
  { source: "S3", target: "F3", volume: 1400 },
  { source: "C3", target: "F3", volume: 1300 },

  // factory -> distribution
  { source: "F1", target: "D1", volume: 2600 },
  { source: "F1", target: "D3", volume: 1200 },
  { source: "F2", target: "D2", volume: 2900 },
  { source: "F3", target: "D2", volume: 1900 },
  { source: "F3", target: "D3", volume: 1400 },
];

/* =========================================================================
   EXPORT DICTIONARY & DEFAULT LIST
   ========================================================================= */
export const REAL_WORLD_SUPPLY_CHAINS: SupplyChainDefinition[] = [
  {
    id: "semiconductor",
    name: "Advanced Semiconductors & AI Compute",
    shortName: "AI & Chips",
    industry: "High-Tech & Artificial Intelligence",
    description:
      "Global wafer fabrication, EUV lithography, HBM memory, and hyperscale server integration across Taiwan, Netherlands, Korea, and North America.",
    icon: "Cpu",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    nodes: semiNodes,
    links: semiLinks,
    presetScenarios: [
      {
        name: "Taiwan Strait Maritime Blockade",
        note: "TSMC Fab 18 and ASE packaging halt completely, cutting off 85% of advanced AI compute.",
        ids: ["C2", "C4"],
      },
      {
        name: "ASML Lithography Export Controls",
        note: "EUV tooling shipments frozen, starving sub-3nm node capacity ramps.",
        ids: ["C1"],
      },
      {
        name: "European Neon Gas Shortage",
        note: "Linde excimer laser neon plant halted, stalling photolithography across Asia.",
        ids: ["R3"],
      },
    ],
  },
  {
    id: "ev-battery",
    name: "Electric Vehicles & Clean Energy",
    shortName: "EV & Battery",
    industry: "Clean Tech & Automotive",
    description:
      "Atacama lithium extraction, Katanga cobalt, CATL & Panasonic battery gigafactories, and global Tesla manufacturing hubs.",
    icon: "Zap",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    nodes: evNodes,
    links: evLinks,
    presetScenarios: [
      {
        name: "Indonesian Nickel Export Embargo",
        note: "Sulawesi nickel smelter halts export, creating a catastrophic cathode deficit.",
        ids: ["R3"],
      },
      {
        name: "Red Sea Maritime Interruption",
        note: "Key cell and drive unit shipping rerouted around Africa, depleting assembly buffers.",
        ids: ["C1", "S3"],
      },
      {
        name: "Atacama Lithium Brine Drought",
        note: "Severe environmental quotas curtail South American lithium output by 65%.",
        ids: ["R1"],
      },
    ],
  },
  {
    id: "biopharma",
    name: "Global Biopharma & Critical Vaccines",
    shortName: "Biopharma",
    industry: "Life Sciences & Healthcare",
    description:
      "Indian API synthesis, German mRNA formulation, Swiss bioreactors, and ultra-cold continental vaccine distribution networks.",
    icon: "Activity",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    nodes: bioNodes,
    links: bioLinks,
    presetScenarios: [
      {
        name: "Lipid Nanoparticle (LNP) Facility Fire",
        note: "Croda Snaith chemical lab offline, halting global mRNA formulation immediately.",
        ids: ["R2"],
      },
      {
        name: "Indian API Export Restriction",
        note: "Hyderabad chemical precursor embargo halts worldwide generic drug compounding.",
        ids: ["R1"],
      },
      {
        name: "Cryogenic Cold-Chain Grid Failure",
        note: "Puurs central ultracold storage power disruption endangers 2.5M sterile doses.",
        ids: ["F1"],
      },
    ],
  },
  {
    id: "aerospace",
    name: "Aerospace & Commercial Jetliners",
    shortName: "Aerospace",
    industry: "Commercial Aviation & Defense",
    description:
      "Toray carbon fiber, aerospace titanium, CFM LEAP turbofan engines, Spirit fuselages, and Boeing & Airbus final assembly lines.",
    icon: "Plane",
    badgeColor: "bg-violet-100 text-violet-800 border-violet-200",
    nodes: aeroNodes,
    links: aeroLinks,
    presetScenarios: [
      {
        name: "Spirit Fuselage Quality Standstill",
        note: "Wichita forward fuselage line paused for non-conformance structural inspection.",
        ids: ["S1"],
      },
      {
        name: "Aerospace Titanium Import Ban",
        note: "Henderson titanium refinery embargo creates severe structural wing delays.",
        ids: ["R2"],
      },
      {
        name: "CFM LEAP Engine Delivery Deficit",
        note: "Cincinnati turbine blade casting delay bottlenecks Everett and Toulouse lines.",
        ids: ["C1"],
      },
    ],
  },
];
