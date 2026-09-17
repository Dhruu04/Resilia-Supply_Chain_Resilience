import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  DollarSign,
  Factory,
  GitBranch,
  Maximize2,
  Minimize2,
  Presentation,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { BottomNavPill } from "@/components/layout/BottomNavPill";
import { FlowGuideModal } from "@/components/supply-chain/FlowGuideModal";
import { NetworkStudioModal } from "@/components/supply-chain/NetworkStudioModal";
import { ExecutiveBoardDeckModal } from "@/components/supply-chain/ExecutiveBoardDeckModal";
import { useSupply } from "@/lib/supply-chain/store";
import { TIER_LABEL } from "@/lib/supply-chain/types";
import { ResiliaLogo } from "@/components/ui/ResiliaLogo";

export function AppShell({ children }: { children: ReactNode }) {
  const { network, kpis, alerts, offline, resetScenario } = useSupply();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);

  const critical = alerts.filter((a) => a.severity === "critical").length;

  const healthTone =
    kpis.healthScore > 85 ? "bg-healthy" : kpis.healthScore > 60 ? "bg-warning" : "bg-danger";

  // Hotkey listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return network.nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.region.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [searchQuery, network]);

  const isNetworkView = currentPath === "/network";

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background text-foreground antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Global Top Status Bar (Spacious & Clean) */}
      <header className="flex h-13 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90 group"
            title="Resilia — Autonomous Supply Chain Resilience Platform"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white shadow-xs border border-slate-200/80 p-0.5 group-hover:scale-105 transition-transform">
              <ResiliaLogo className="size-full" />
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-bold tracking-tight text-foreground">
                Resilia
              </span>
              <span className="hidden sm:block text-[10px] font-medium text-muted-foreground">
                Supply Chain Resilience
              </span>
            </div>
          </Link>

          {/* Quick Search Trigger in Header */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground ml-2"
          >
            <Search className="size-3.5" />
            <span>Quick search...</span>
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {kpis.financialImpactWeeklyM > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600">
              <DollarSign className="size-3" /> ${kpis.financialImpactWeeklyM}M / wk at risk
            </span>
          )}

          {critical > 0 && (
            <Link
              to="/alerts"
              className="hidden items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger sm:flex"
            >
              <AlertTriangle className="size-3" /> {critical} critical
            </Link>
          )}

          {offline.size > 0 && (
            <button
              onClick={() => resetScenario()}
              className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Reset simulation to baseline"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          )}

          <Link
            to="/simulator"
            className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/90 px-3 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs"
            title="Design, configure & simulate your custom enterprise supply chain digital twin"
          >
            <Sparkles className="size-3 text-indigo-600" />
            <span>Digital Twin Studio</span>
          </Link>

          <button
            onClick={() => setStudioOpen(true)}
            className="hidden lg:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Design custom facilities, nodes, and supply links"
          >
            <Factory className="size-3 text-indigo-600" />
            <span>Studio</span>
          </button>

          <button
            onClick={() => setDeckOpen(true)}
            className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            title="Open 5-Slide Executive Board Briefing Presentation"
          >
            <Presentation className="size-3 text-emerald-600" />
            <span>Board Deck</span>
          </button>

          <Link
            to="/analytics"
            search={{ tab: "monte-carlo" }}
            className="hidden xl:flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/90 px-2.5 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100 transition-colors shadow-2xs"
            title="Monte Carlo Probabilistic Risk & Value-at-Risk (VaR) Engine"
          >
            <Activity className="size-3 text-violet-600" />
            <span>Monte Carlo VaR</span>
          </Link>

          <button
            onClick={() => setGuideOpen(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/90 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs"
            title="Learn how the 5-tier network, 7 risk pillars, and failure cascades work"
          >
            <BookOpen className="size-3" />
            <span>How it works</span>
          </button>

          {/* Live Posture Badge */}
          <span className="flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-[11px]">
            <span className={`size-2 rounded-full ${healthTone}`} />
            <span className="font-medium hidden sm:inline">
              {offline.size === 0 ? "Baseline" : "Stress scenario"}
            </span>
            <span className="font-mono font-bold text-foreground">{kpis.healthScore}%</span>
          </span>

          {/* Native Browser Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Viewport Content (Full width & unobstructed) */}
      <main className={`relative min-h-0 flex-1 overflow-y-auto ${isNetworkView ? "" : "pb-24"}`}>
        {children}
      </main>

      {/* Floating Bottom-Center Navigation Pill */}
      <BottomNavPill
        criticalAlertsCount={critical}
        healthScore={kpis.healthScore}
        offlineCount={offline.size}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenGuide={() => setGuideOpen(true)}
        onResetScenario={() => resetScenario()}
        onOpenStudio={() => setStudioOpen(true)}
        onOpenBoardDeck={() => setDeckOpen(true)}
      />

      {/* Global Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                id="global-search-input"
                name="globalSearch"
                aria-label="Search entities, components, or regions"
                autoFocus
                type="text"
                placeholder="Search entities, components, or regions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
              {searchResults.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {searchQuery
                    ? "No matching entities found."
                    : "Type to search suppliers across the network."}
                </p>
              ) : (
                searchResults.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                      navigate({ to: "/suppliers/$id", params: { id: n.id } });
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{n.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {TIER_LABEL[n.type]} · {n.region}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-primary flex items-center gap-1">
                      {n.id} <ArrowRight className="size-3" />
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Flow & Risk Guide Modal */}
      <FlowGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Visual Network Architecture Studio Modal */}
      <NetworkStudioModal isOpen={studioOpen} onClose={() => setStudioOpen(false)} />

      {/* 1-Click Executive Board Deck Modal (5 Slides) */}
      <ExecutiveBoardDeckModal isOpen={deckOpen} onClose={() => setDeckOpen(false)} />
    </div>
  );
}
