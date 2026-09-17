import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";

import { ControlPanel } from "@/components/supply-chain/ControlPanel";
import { NetworkGraph } from "@/components/supply-chain/NetworkGraph";
import { NodeDetailPanel } from "@/components/supply-chain/NodeDetailPanel";
import { useSupply } from "@/lib/supply-chain/store";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Supply Chain Network Map & Fullscreen Control Tower — Nexus Risk" },
      {
        name: "description",
        content:
          "Full-screen multi-tier supply chain dependency graph. Spacious tiered pipeline visualization, dynamic physics simulation, and real-time failure cascade stress testing.",
      },
      { property: "og:title", content: "Network Map — Fullscreen Control Tower" },
      {
        property: "og:description",
        content:
          "Explore multi-tier supplier dependencies in full-screen clarity with interactive failure simulation.",
      },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  const { network, activeChain, result, offline, toggleFailure, setOffline, resetScenario } =
    useSupply();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [leftHudOpen, setLeftHudOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selected = network.nodes.find((n) => n.id === selectedId) ?? null;
  const handleSelect = useCallback((id: string | null) => setSelectedId(id), []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className={`relative w-full h-[calc(100vh-3.5rem)] min-h-[640px] overflow-hidden bg-slate-50 ${
        isFullscreen ? "fixed inset-0 z-50 h-screen w-screen" : ""
      }`}
    >
      <h1 className="sr-only">Supply chain network map and failure simulation</h1>

      {/* Full-bleed Spacious Canvas in Light Theme */}
      <div className="absolute inset-0">
        <NetworkGraph
          network={network}
          statuses={result.statuses}
          selectedId={selectedId}
          offline={offline}
          onSelect={handleSelect}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />
      </div>

      {/* Left Floating Collapsible HUD (Light Theme) */}
      <div
        className={`pointer-events-auto absolute bottom-4 left-4 top-16 z-30 flex transition-transform duration-300 ${
          leftHudOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full w-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                Control Tower HUD
              </span>
            </div>
            <button
              onClick={() => setLeftHudOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <ControlPanel
              network={network}
              statuses={result.statuses}
              offline={offline}
              query={query}
              onQueryChange={setQuery}
              onSelect={handleSelect}
              onReset={() => {
                resetScenario();
                setSelectedId(null);
              }}
              onStressTest={() => {
                const preset = activeChain.presetScenarios[0];
                const ids = preset ? preset.ids : ["R1", "C2"];
                setOffline(ids, preset?.name ?? "Preset stress test applied");
                setSelectedId(ids[0] ?? null);
              }}
            />
          </div>
        </div>

        {/* HUD Toggle Tab */}
        <button
          onClick={() => setLeftHudOpen(!leftHudOpen)}
          title={leftHudOpen ? "Collapse Control HUD" : "Expand Control HUD"}
          className="pointer-events-auto self-center -mr-8 rounded-r-xl border border-l-0 border-slate-200 bg-white/95 px-1.5 py-3 text-slate-600 shadow-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          {leftHudOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>

      {/* Right Floating Drawer (Contextual Node Details in Light Theme) */}
      {selected && (
        <div className="pointer-events-auto absolute bottom-4 right-4 top-16 z-30 w-84 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-xl animate-in slide-in-from-right duration-200">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 bg-slate-50/70">
              <span className="font-mono text-xs font-bold text-indigo-600">
                INSPECT &middot; {selected.id}
              </span>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <NodeDetailPanel
                network={network}
                node={selected}
                statuses={result.statuses}
                capability={result.capability}
                isOffline={offline.has(selected.id)}
                onToggleFailure={toggleFailure}
                onClose={() => setSelectedId(null)}
                onSelect={handleSelect}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
