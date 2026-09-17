import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Factory,
  FileText,
  Gauge,
  GitBranch,
  Globe2,
  LayoutDashboard,
  MoreHorizontal,
  Network,
  Plane,
  Presentation,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Table2,
  X,
  Zap,
} from "lucide-react";
import { useSupply } from "@/lib/supply-chain/store";

interface BottomNavPillProps {
  criticalAlertsCount: number;
  healthScore: number;
  offlineCount: number;
  onOpenSearch: () => void;
  onOpenGuide: () => void;
  onResetScenario: () => void;
  onOpenStudio?: () => void;
  onOpenBoardDeck?: () => void;
}

const PRIMARY_NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/network", label: "Topology", icon: Network, exact: false },
  { to: "/simulator", label: "Studio", icon: Sparkles, exact: false },
  { to: "/geo", label: "Map", icon: Globe2, exact: false },
  { to: "/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle, exact: false },
] as const;

function getChainIcon(iconName: string) {
  switch (iconName) {
    case "Cpu":
      return Cpu;
    case "Zap":
      return Zap;
    case "Activity":
      return Activity;
    case "Plane":
      return Plane;
    default:
      return GitBranch;
  }
}

export function BottomNavPill({
  criticalAlertsCount,
  healthScore,
  offlineCount,
  onOpenSearch,
  onOpenGuide,
  onResetScenario,
  onOpenStudio,
  onOpenBoardDeck,
}: BottomNavPillProps) {
  const { activeChain, activeChainId, allChains, setSupplyChain } = useSupply();
  const [isMinimized, setIsMinimized] = useState(false);
  const [chainMenuOpen, setChainMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const chainRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) {
        setChainMenuOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    if (chainMenuOpen || moreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [chainMenuOpen, moreOpen]);

  // Close menus on route change
  useEffect(() => {
    setChainMenuOpen(false);
    setMoreOpen(false);
  }, [currentPath]);

  const ActiveIcon = getChainIcon(activeChain.icon);

  // When minimized: render an ultra-compact distraction-free chip
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xl shadow-slate-900/10 backdrop-blur-md transition-all hover:bg-slate-50 hover:shadow-2xl hover:border-indigo-300"
          title="Expand navigation dock"
        >
          <span className="grid size-5 place-items-center rounded-full bg-indigo-600 text-white shadow-xs">
            <ActiveIcon className="size-3" />
          </span>
          <span className="font-semibold">{activeChain.shortName}</span>
          <span className="size-1 rounded-full bg-slate-300" />
          <span className="font-mono text-indigo-600">{healthScore}%</span>
          <span
            className={`size-2 rounded-full ${
              healthScore > 85
                ? "bg-emerald-500"
                : healthScore > 60
                  ? "bg-amber-500"
                  : "bg-rose-500"
            }`}
          />
          <ChevronUp className="size-3.5 text-slate-400 ml-0.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1rem)] animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="relative flex items-center gap-1 sm:gap-1.5 rounded-full border border-slate-200/90 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl transition-all">
        {/* Real-World Supply Chain Switcher */}
        <div className="relative" ref={chainRef}>
          <button
            onClick={() => {
              setChainMenuOpen(!chainMenuOpen);
              setMoreOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors shadow-2xs border border-slate-200/60"
            title="Switch Real-World Supply Chain"
          >
            <ActiveIcon className="size-3.5 text-indigo-600 shrink-0" />
            <span className="max-w-[110px] truncate hidden md:inline text-slate-900">
              {activeChain.shortName}
            </span>
            <ChevronDown className="size-3 text-slate-500 shrink-0 ml-0.5" />
          </button>

          {/* Supply Chain Dropdown Popover */}
          {chainMenuOpen && (
            <div className="absolute bottom-11 left-0 w-80 max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-50 text-slate-800">
              <div className="px-2 pb-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Real-World Supply Chains</h4>
                  <p className="text-[10.5px] text-slate-500">
                    Switch industry models & live GPS topologies
                  </p>
                </div>
                <button
                  onClick={() => setChainMenuOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
                {allChains.map((chain) => {
                  const IconComp = getChainIcon(chain.icon);
                  const isSelected = chain.id === activeChainId;

                  return (
                    <button
                      key={chain.id}
                      onClick={() => {
                        setSupplyChain(chain.id);
                        setChainMenuOpen(false);
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-all ${
                        isSelected
                          ? "bg-indigo-50 border border-indigo-200/80 text-indigo-950 shadow-2xs"
                          : "hover:bg-slate-50 border border-transparent text-slate-700"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <IconComp className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {chain.name}
                          </span>
                          {isSelected && (
                            <Check className="size-3.5 text-indigo-600 shrink-0 ml-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                          {chain.description}
                        </p>
                        <span className="inline-block mt-1 font-mono text-[9.5px] font-semibold text-slate-400">
                          {chain.nodes.length} entities &middot; {chain.links.length} trade flows
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-200/80 shrink-0 mx-0.5" />

        {/* Primary Route Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 py-0.5 px-0.5">
          {PRIMARY_NAV.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? currentPath === to : currentPath.startsWith(to);

            return (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className={`relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs whitespace-nowrap transition-all duration-150 select-none ${
                  isActive
                    ? "bg-indigo-50 font-bold text-indigo-700 shadow-2xs border border-indigo-200/80"
                    : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                }`}
              >
                <Icon
                  className={`size-3.5 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-500"}`}
                />
                <span className="hidden sm:inline whitespace-nowrap">{label}</span>

                {label === "Alerts" && criticalAlertsCount > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 font-mono text-[9px] font-bold text-white shadow-xs">
                    {criticalAlertsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-slate-200/80 shrink-0 mx-0.5" />

        {/* Right Actions Cluster: More & Minimize */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* More Menu (Additional Views, Deck, Guide, Settings) */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => {
                setMoreOpen(!moreOpen);
                setChainMenuOpen(false);
              }}
              className={`relative flex size-7 items-center justify-center rounded-full transition-colors ${
                moreOpen ||
                currentPath === "/scenarios" ||
                currentPath === "/suppliers" ||
                currentPath === "/reports" ||
                currentPath === "/settings"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              title="More views & enterprise tools"
            >
              <MoreHorizontal className="size-3.5" />
              {(currentPath === "/scenarios" ||
                currentPath === "/suppliers" ||
                currentPath === "/reports" ||
                currentPath === "/settings") && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-indigo-600 ring-2 ring-white" />
              )}
            </button>

            {moreOpen && (
              <div className="absolute bottom-10 right-0 w-72 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-50 text-slate-800">
                <div className="px-2 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Enterprise Workspace Tools
                  </span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>

                <div className="mt-1.5 space-y-0.5">
                  {onOpenBoardDeck && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onOpenBoardDeck();
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-900 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <Presentation className="size-4 text-emerald-600" />
                        <span>Executive Briefing</span>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                        12 Slides
                      </span>
                    </button>
                  )}

                  <Link
                    to="/scenarios"
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                      currentPath === "/scenarios"
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="size-4 text-indigo-600" />
                      <span>Stress Tests & Cascade</span>
                    </div>
                    <span className="text-[10px] text-slate-400">War Room</span>
                  </Link>

                  <Link
                    to="/suppliers"
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                      currentPath === "/suppliers"
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Table2 className="size-4 text-slate-600" />
                      <span>Supplier Registry & BOM</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Directory</span>
                  </Link>

                  {onOpenStudio && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        onOpenStudio();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors text-left"
                    >
                      <Factory className="size-4 text-purple-600" />
                      <span>Network Entity Builder</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onOpenSearch();
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="size-4 text-slate-500" />
                      <span>Search Entities</span>
                    </div>
                    <kbd className="font-mono text-[9px] text-slate-400 border border-slate-200 px-1 rounded">
                      Ctrl K
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onOpenGuide();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors text-left"
                  >
                    <BookOpen className="size-4 text-indigo-600" />
                    <span>Resilience Flow Guide</span>
                  </button>

                  <Link
                    to="/reports"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <FileText className="size-4 text-blue-600" />
                    <span>Audit Briefing & Export</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Settings className="size-4 text-slate-500" />
                    <span>Model Weights & Config</span>
                  </Link>
                </div>

                {/* Health Posture Mini Card */}
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-700">
                      <Gauge className="size-3 text-indigo-600" /> Network Posture
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {healthScore}%
                    </span>
                  </div>

                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {offlineCount === 0
                      ? "All facilities nominal"
                      : `${offlineCount} node(s) disrupted`}
                  </p>

                  {offlineCount > 0 && (
                    <button
                      onClick={() => {
                        onResetScenario();
                        setMoreOpen(false);
                      }}
                      className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                    >
                      <RotateCcw className="size-3" /> Reset Stress Scenario
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Minimize / Full-screen Focus Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="flex size-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="Minimize navigation dock"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
