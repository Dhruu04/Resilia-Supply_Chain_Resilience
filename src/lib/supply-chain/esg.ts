import { geocodeLocation } from "./geo-coords";
import type { SupplyLink, SupplyNetwork } from "./types";

export interface LinkEsgDetail {
  source: string;
  target: string;
  sourceCity: string;
  targetCity: string;
  distanceKm: number;
  mode: "Maritime Container" | "Air Freight" | "Continental Road / Rail";
  weeklyVolume: number;
  weeklyTonsCO2: number;
  annualTonsCO2: number;
  greenRating: "A" | "B" | "C" | "D";
}

export interface NetworkEsgProfile {
  totalAnnualTonsCO2: number;
  totalWeeklyTonsCO2: number;
  carbonIntensityPerUnitKg: number;
  highEmissionCorridors: LinkEsgDetail[];
  allCorridors: LinkEsgDetail[];
  modeBreakdown: {
    maritime: number;
    air: number;
    road: number;
  };
  sustainabilityScore: number; // 0 to 100
}

/**
 * Calculates great-circle distance in kilometers between two GPS coordinates using Haversine formula
 */
export function haversineDistanceKm(c1: [number, number], c2: [number, number]): number {
  const [lat1, lon1] = c1;
  const [lat2, lon2] = c2;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Computes ESG carbon footprint and Scope 3 transport emissivity across all trade corridors.
 */
export function computeNetworkEsg(network: SupplyNetwork): NetworkEsgProfile {
  const nodeMap = new Map(network.nodes.map((n) => [n.id, n]));
  const allCorridors: LinkEsgDetail[] = [];

  let totalWeeklyTons = 0;
  let maritimeTons = 0;
  let airTons = 0;
  let roadTons = 0;

  for (const link of network.links) {
    const src = nodeMap.get(link.source);
    const tgt = nodeMap.get(link.target);
    if (!src || !tgt) continue;

    const srcCoords = geocodeLocation(src.region, src.id);
    const tgtCoords = geocodeLocation(tgt.region, tgt.id);
    const distanceKm = haversineDistanceKm(srcCoords, tgtCoords);

    // Determine freight transit mode
    let mode: LinkEsgDetail["mode"] = "Continental Road / Rail";
    let emissionFactorKgPerTonKm = 0.075; // Heavy road / electric rail
    const unitWeightKg = src.type === "raw" ? 25 : src.type === "component" ? 8 : 45;

    if (distanceKm > 4000) {
      // Intercontinental: Air freight for urgent components or maritime for bulk
      if (src.type === "component" && link.volume < 2500) {
        mode = "Air Freight";
        emissionFactorKgPerTonKm = 0.55;
      } else {
        mode = "Maritime Container";
        emissionFactorKgPerTonKm = 0.016;
      }
    } else if (distanceKm > 1500) {
      mode = "Continental Road / Rail";
      emissionFactorKgPerTonKm = 0.072;
    }

    // Weekly tonnage
    const cargoTons = (link.volume * unitWeightKg) / 1000;
    const weeklyKgCO2 = cargoTons * distanceKm * emissionFactorKgPerTonKm;
    const weeklyTonsCO2 = Math.round((weeklyKgCO2 / 1000) * 10) / 10;
    const annualTonsCO2 = Math.round(weeklyTonsCO2 * 52);

    // Green efficiency rating
    const greenRating: LinkEsgDetail["greenRating"] =
      weeklyTonsCO2 <= 15 ? "A" : weeklyTonsCO2 <= 40 ? "B" : weeklyTonsCO2 <= 90 ? "C" : "D";

    if (mode === "Maritime Container") maritimeTons += annualTonsCO2;
    else if (mode === "Air Freight") airTons += annualTonsCO2;
    else roadTons += annualTonsCO2;

    totalWeeklyTons += weeklyTonsCO2;

    allCorridors.push({
      source: link.source,
      target: link.target,
      sourceCity: src.region.split(",")[0] ?? src.region,
      targetCity: tgt.region.split(",")[0] ?? tgt.region,
      distanceKm,
      mode,
      weeklyVolume: link.volume,
      weeklyTonsCO2,
      annualTonsCO2,
      greenRating,
    });
  }

  // Sort corridors by carbon emissions descending
  allCorridors.sort((a, b) => b.annualTonsCO2 - a.annualTonsCO2);

  const totalAnnualTonsCO2 = Math.round(totalWeeklyTons * 52);
  const totalWeeklyFinishedGoods = network.nodes
    .filter((n) => n.type === "factory" || n.type === "distribution")
    .reduce((s, n) => s + n.volume, 0);

  const carbonIntensityPerUnitKg =
    totalWeeklyFinishedGoods > 0
      ? Math.round(((totalWeeklyTons * 1000) / totalWeeklyFinishedGoods) * 10) / 10
      : 0;

  // Sustainability score (0 to 100): lower air freight share and lower emission intensity = higher score
  const airShare = totalAnnualTonsCO2 > 0 ? airTons / totalAnnualTonsCO2 : 0;
  const sustainabilityScore = Math.max(
    35,
    Math.min(95, Math.round(100 - airShare * 45 - carbonIntensityPerUnitKg * 0.8)),
  );

  return {
    totalAnnualTonsCO2,
    totalWeeklyTonsCO2: Math.round(totalWeeklyTons * 10) / 10,
    carbonIntensityPerUnitKg,
    highEmissionCorridors: allCorridors
      .filter((c) => c.greenRating === "D" || c.greenRating === "C")
      .slice(0, 8),
    allCorridors,
    modeBreakdown: {
      maritime: maritimeTons,
      air: airTons,
      road: roadTons,
    },
    sustainabilityScore,
  };
}
