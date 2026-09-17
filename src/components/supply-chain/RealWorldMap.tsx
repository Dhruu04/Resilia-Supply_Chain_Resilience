import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Compass, Globe2, Layers, Maximize2, Minimize2, RotateCcw, Sparkles } from "lucide-react";

import {
  createGeodesicArc,
  disperseOverlappingPoints,
  geocodeLocation,
} from "@/lib/supply-chain/geo-coords";
import { countryName } from "@/lib/supply-chain/derive";
import type { SupplyNetwork, SupplyNode } from "@/lib/supply-chain/types";
import { TIER_LABEL } from "@/lib/supply-chain/types";

interface RealWorldMapProps {
  network: SupplyNetwork;
  statuses: Record<string, "healthy" | "at-risk" | "failed">;
  offline: ReadonlySet<string>;
  onToggleFailure: (id: string) => void;
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
}

const TILE_LAYERS = {
  esri: {
    name: "Enterprise Canvas",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    maxZoom: 16,
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  },
};

export function RealWorldMap({
  network,
  statuses,
  offline,
  onToggleFailure,
  selectedCountry,
  onSelectCountry,
}: RealWorldMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const corridorsLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeTileKey, setActiveTileKey] = useState<"esri" | "osm">("esri");
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "failed" | "at-risk" | "healthy">(
    "ALL",
  );
  const [showArcs, setShowArcs] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Leaflet map with clean Esri Light Gray Canvas (No watermark, no API key)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [25.0, 10.0],
      zoom: 2.2,
      minZoom: 1.8,
      maxZoom: 14,
      zoomControl: false,
      worldCopyJump: true,
    });

    const currentTileConfig = TILE_LAYERS[activeTileKey];
    const tileLayer = L.tileLayer(currentTileConfig.url, {
      attribution: currentTileConfig.attribution,
      maxZoom: currentTileConfig.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    L.control.zoom({ position: "topright" }).addTo(map);

    const corridorsLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    corridorsLayerRef.current = corridorsLayer;
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch basemap tile layer dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = TILE_LAYERS[activeTileKey];
    const newTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(map);
    newTileLayer.bringToBack();
    tileLayerRef.current = newTileLayer;
  }, [activeTileKey]);

  // Update Markers and Trade Corridor Arcs
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const corridorsLayer = corridorsLayerRef.current;
    if (!map || !markersLayer || !corridorsLayer) return;

    markersLayer.clearLayers();
    corridorsLayer.clearLayers();

    // 1. Calculate geocoded coordinates with collision dispersion so co-located pins don't overlap
    const rawCoords = network.nodes.map((n) => ({
      id: n.id,
      coords: geocodeLocation(n.region, n.id),
    }));
    const nodeCoords = disperseOverlappingPoints(rawCoords, 0.3);

    const countryOfRegion = (region: string) => {
      const parts = region.split(",");
      return (parts[parts.length - 1] ?? "").trim().toUpperCase();
    };

    // Auto-fit all points on initial load or network data change (when no country filter is active)
    if (!selectedCountry) {
      const allCoords: [number, number][] = [];
      nodeCoords.forEach((coords) => allCoords.push(coords));
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 4 });
      }
    }

    // 2. Render curved trade corridors
    if (showArcs) {
      for (const link of network.links) {
        const fromCoord = nodeCoords.get(link.source);
        const toCoord = nodeCoords.get(link.target);
        if (!fromCoord || !toCoord) continue;

        const srcNode = network.nodes.find((n) => n.id === link.source);
        const tgtNode = network.nodes.find((n) => n.id === link.target);
        if (!srcNode || !tgtNode) continue;

        const srcCountry = countryOfRegion(srcNode.region);
        const tgtCountry = countryOfRegion(tgtNode.region);

        const isHighlight =
          !selectedCountry || selectedCountry === srcCountry || selectedCountry === tgtCountry;

        const isDisrupted = offline.has(link.source) || offline.has(link.target);
        const isDegraded =
          statuses[link.source] === "at-risk" || statuses[link.target] === "at-risk";

        const arcPoints = createGeodesicArc(fromCoord, toCoord, 24);

        const strokeColor = isDisrupted
          ? "#dc2626"
          : isDegraded
            ? "#d97706"
            : isHighlight
              ? "#4f46e5"
              : "#94a3b8";

        const polyline = L.polyline(arcPoints, {
          color: strokeColor,
          weight: isHighlight ? (isDisrupted ? 2.5 : 2.0) : 1.0,
          opacity: isHighlight ? 0.9 : 0.25,
          dashArray: isDisrupted ? "6, 6" : undefined,
          lineCap: "round",
        });

        polyline.bindTooltip(
          `<div class="text-xs p-1 font-sans"><b>${srcNode.label}</b> &rarr; <b>${tgtNode.label}</b><br/><span class="text-slate-500 font-mono">${link.volume.toLocaleString()} units/wk</span></div>`,
          { sticky: true },
        );

        corridorsLayer.addLayer(polyline);
      }
    }

    // 3. Render Facilities & Hub Markers
    for (const node of network.nodes) {
      const coord = nodeCoords.get(node.id);
      if (!coord) continue;

      const nodeCountry = countryOfRegion(node.region);
      const status = statuses[node.id] ?? "healthy";
      const isNodeOffline = offline.has(node.id);

      if (filterSeverity !== "ALL" && status !== filterSeverity) continue;

      const isCountrySelected = selectedCountry === nodeCountry;
      const dotColor = isNodeOffline ? "#dc2626" : status === "at-risk" ? "#d97706" : "#4f46e5";
      const radius = 10 + Math.min(14, Math.sqrt(node.volume) / 5);

      const htmlIcon = L.divIcon({
        className: "custom-facility-marker",
        html: `
          <div class="relative group cursor-pointer flex items-center justify-center">
            ${
              isCountrySelected || isNodeOffline || status === "at-risk"
                ? `<div class="absolute -inset-2 rounded-full animate-ping opacity-30" style="background-color: ${dotColor};"></div>`
                : ""
            }
            <div class="relative flex items-center justify-center rounded-full border-2 border-white shadow-md text-white font-bold text-[10px]"
                 style="background-color: ${dotColor}; width: ${radius * 2}px; height: ${radius * 2}px;">
              ${isNodeOffline ? "&times;" : node.id}
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-slate-800 shadow-sm border border-slate-200 pointer-events-none">
              ${node.label.split(" ")[0]}
            </div>
          </div>
        `,
        iconSize: [radius * 2, radius * 2],
        iconAnchor: [radius, radius],
      });

      const marker = L.marker(coord, { icon: htmlIcon });

      // Light Theme Popup
      const popupHtml = `
        <div class="p-3 text-slate-800 bg-white rounded-xl min-w-[220px] font-sans">
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <div>
              <span class="font-mono text-xs font-bold text-indigo-600">${node.id}</span>
              <h4 class="text-xs font-bold text-slate-900">${node.label}</h4>
            </div>
            <span class="px-2 py-0.5 text-[9px] uppercase font-bold rounded ${
              status === "healthy"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : status === "at-risk"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
            }">${status}</span>
          </div>

          <div class="text-[11px] text-slate-600 space-y-1.5 mb-3">
            <div class="flex justify-between">
              <span class="text-slate-400">Tier:</span>
              <span class="font-medium text-slate-700">${TIER_LABEL[node.type]}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Location:</span>
              <span class="font-medium text-slate-700">${node.region}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Throughput:</span>
              <span class="font-mono font-medium text-slate-700">${node.volume.toLocaleString()} u/wk</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Lead Time / Buffer:</span>
              <span class="font-mono font-medium text-slate-700">${node.leadTimeDays}d / ${node.bufferDays}d</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Solvency / Cap:</span>
              <span class="font-mono font-medium text-slate-700">${node.financialHealth}/100 · ${Math.round(node.capacityUtilization * 100)}%</span>
            </div>
          </div>

          <button
            id="pop-toggle-${node.id}"
            class="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-white transition-colors ${
              isNodeOffline
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-rose-600 hover:bg-rose-500"
            }"
          >
            ${isNodeOffline ? "Restore Facility" : "Simulate Outage"}
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: "custom-leaflet-popup" });

      marker.on("popupopen", () => {
        const btn = document.getElementById(`pop-toggle-${node.id}`);
        if (btn) {
          btn.onclick = () => {
            onToggleFailure(node.id);
            marker.closePopup();
          };
        }
      });

      markersLayer.addLayer(marker);
    }
  }, [network, statuses, offline, filterSeverity, showArcs, selectedCountry]);

  // Fly to country when selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedCountry) return;

    const matchedNodes = network.nodes.filter((n) => {
      const parts = n.region.split(",");
      const c = (parts[parts.length - 1] ?? "").trim().toUpperCase();
      return c === selectedCountry;
    });

    if (matchedNodes.length > 0) {
      const coordsList: [number, number][] = matchedNodes.map((n) =>
        geocodeLocation(n.region, n.id),
      );
      const bounds = L.latLngBounds(coordsList);
      map.flyToBounds(bounds.pad(0.65), { maxZoom: 6, duration: 1.2 });
    }
  }, [selectedCountry, network]);

  const fitAllPoints = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    onSelectCountry(null);
    const allCoords: [number, number][] = [];
    for (const node of network.nodes) {
      allCoords.push(geocodeLocation(node.region, node.id));
    }
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.flyToBounds(bounds, { padding: [45, 45], maxZoom: 4, duration: 1.2 });
    }
  };

  const jumpToMacro = (region: "APAC" | "EMEA" | "Americas") => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (region === "APAC") map.flyTo([25.0, 105.0], 3.8, { duration: 1.2 });
    if (region === "EMEA") map.flyTo([48.0, 15.0], 4.2, { duration: 1.2 });
    if (region === "Americas") map.flyTo([32.0, -95.0], 3.5, { duration: 1.2 });
  };

  return (
    <div
      className={`relative w-full rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : "h-[540px]"
      }`}
    >
      <div ref={mapContainerRef} className="h-full w-full select-none" />

      {/* Floating Header HUD Controls (Light Theme) */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-[400] flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 backdrop-blur-md shadow-md">
          <button
            onClick={() => fitAllPoints()}
            title="Fit all facility points on screen"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              !selectedCountry
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Compass className="size-3.5" /> Fit All ({network.nodes.length})
          </button>
          <button
            onClick={() => jumpToMacro("Americas")}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            Americas
          </button>
          <button
            onClick={() => jumpToMacro("EMEA")}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            EMEA
          </button>
          <button
            onClick={() => jumpToMacro("APAC")}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            APAC
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 backdrop-blur-md shadow-md">
          {/* Basemap Switcher */}
          <button
            onClick={() => setActiveTileKey(activeTileKey === "esri" ? "osm" : "esri")}
            title={`Current map: ${TILE_LAYERS[activeTileKey].name}. Click to switch.`}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Layers className="size-3.5 text-indigo-600" />
            <span className="hidden sm:inline">{TILE_LAYERS[activeTileKey].name}</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Trade Arcs Toggle */}
          <button
            onClick={() => setShowArcs(!showArcs)}
            title={showArcs ? "Hide Shipping Arcs" : "Show Shipping Arcs"}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              showArcs
                ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Sparkles className="size-3" /> Arcs
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <button
            onClick={() => fitAllPoints()}
            title="Reset Map Bounds"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="size-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating Bottom Legend (Light Theme) */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 backdrop-blur-md shadow-md text-slate-700 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-indigo-600" /> Nominal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" /> At-risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-600" /> Disrupted
          </span>
          {selectedCountry && (
            <span className="border-l border-slate-200 pl-2.5 text-indigo-600 font-mono font-semibold">
              Filtered: {countryName(selectedCountry)} ({selectedCountry})
            </span>
          )}
        </div>

        <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 font-mono text-[11px] text-slate-500 backdrop-blur-md shadow-md">
          {TILE_LAYERS[activeTileKey].name} &middot; Precision GPS Coordinates
        </div>
      </div>
    </div>
  );
}
