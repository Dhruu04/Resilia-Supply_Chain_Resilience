import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Activity,
  Sparkles,
  Power,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Move,
  Layers,
} from "lucide-react";
import {
  TIER_LABEL,
  TIER_ORDER,
  type SupplyNode,
  type SupplyLink,
  type NodeTier,
} from "@/lib/supply-chain/types";

interface Props {
  nodes: SupplyNode[];
  links: SupplyLink[];
  offline: ReadonlySet<string>;
  atRiskNodes?: ReadonlySet<string>;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onToggleOffline: (id: string) => void;
  onDeleteNode?: (id: string) => void;
  onDeleteLink?: (source: string, target: string) => void;
  timeScrubDay?: number;
  customPositions?: Record<string, { x: number; y: number }>;
  onUpdatePositions?: (positions: Record<string, { x: number; y: number }>) => void;
}

const TIER_COLUMNS: { id: NodeTier; label: string; badge: string }[] = [
  {
    id: "raw",
    label: "Tier 3 · Raw Minerals",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "component",
    label: "Tier 2 · Components",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    id: "subassembly",
    label: "Tier 1 · Subsystems",
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  {
    id: "factory",
    label: "Assembly Plants",
    badge: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    id: "distribution",
    label: "Regional Hubs",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
];

const NODE_WIDTH = 220;
const NODE_HEIGHT = 92;
const COL_WIDTH = 280;
const VERTICAL_GAP = 28;
const PADDING_TOP = 80;
const PADDING_LEFT = 40;
const EMPTY_POSITIONS: Record<string, { x: number; y: number }> = {};
const EMPTY_SET: ReadonlySet<string> = new Set();

export function CompanySimulatorCanvas({
  nodes,
  links,
  offline,
  atRiskNodes = EMPTY_SET,
  selectedNodeId,
  onSelectNode,
  onToggleOffline,
  onDeleteNode,
  onDeleteLink,
  timeScrubDay = 0,
  customPositions = EMPTY_POSITIONS,
  onUpdatePositions,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [showParticles, setShowParticles] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [activePositions, setActivePositions] = useState<Record<string, { x: number; y: number }>>(
    customPositions || EMPTY_POSITIONS,
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    nodeId: string;
    startPointerX: number;
    startPointerY: number;
    startNodeX: number;
    startNodeY: number;
    hasMoved: boolean;
  } | null>(null);

  const lastEmittedRef = useRef<Record<string, { x: number; y: number }> | null>(null);

  // Sync external customPositions when they change externally (e.g. loaded a template or imported JSON)
  useEffect(() => {
    if (!customPositions) return;
    if (customPositions === lastEmittedRef.current) return;

    setActivePositions((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(customPositions);
      if (prevKeys.length === nextKeys.length) {
        let isSame = true;
        for (const k of nextKeys) {
          const prevPos = prev[k];
          const nextPos = customPositions[k];
          if (
            !prevPos ||
            !nextPos ||
            prevPos.x !== nextPos.x ||
            prevPos.y !== nextPos.y
          ) {
            isSame = false;
            break;
          }
        }
        if (isSame) return prev;
      }
      return customPositions;
    });
  }, [customPositions]);

  // Compute default echelon column coordinates for any node not yet positioned
  const defaultPositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    TIER_ORDER.forEach((tier, colIndex) => {
      const tierNodes = nodes.filter((n) => n.type === tier);
      tierNodes.forEach((node, rowIndex) => {
        const x = PADDING_LEFT + colIndex * COL_WIDTH;
        const y = PADDING_TOP + rowIndex * (NODE_HEIGHT + VERTICAL_GAP);
        map[node.id] = { x, y };
      });
    });
    return map;
  }, [nodes]);

  // Merge activePositions with defaultPositions
  const resolvedPositions = useMemo(() => {
    const res: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      res[n.id] = activePositions[n.id] ?? defaultPositions[n.id] ?? { x: 50, y: 100 };
    });
    return res;
  }, [nodes, activePositions, defaultPositions]);

  // Dynamic canvas bounds
  const { canvasWidth, canvasHeight } = useMemo(() => {
    let maxX = PADDING_LEFT * 2 + TIER_ORDER.length * COL_WIDTH;
    let maxY = 700;

    Object.values(resolvedPositions).forEach((pos) => {
      if (pos.x + NODE_WIDTH + 80 > maxX) maxX = pos.x + NODE_WIDTH + 80;
      if (pos.y + NODE_HEIGHT + 100 > maxY) maxY = pos.y + NODE_HEIGHT + 100;
    });

    return {
      canvasWidth: Math.max(1400, maxX),
      canvasHeight: Math.max(800, maxY),
    };
  }, [resolvedPositions]);

  // Selected node upstream/downstream relationships
  const { upstreamIds, downstreamIds } = useMemo(() => {
    if (!selectedNodeId)
      return { upstreamIds: new Set<string>(), downstreamIds: new Set<string>() };
    const up = new Set<string>();
    const down = new Set<string>();

    links.forEach((l) => {
      if (l.target === selectedNodeId) up.add(l.source);
      if (l.source === selectedNodeId) down.add(l.target);
    });

    return { upstreamIds: up, downstreamIds: down };
  }, [selectedNodeId, links]);

  // Pointer down on a node to begin drag or click
  const handlePointerDownNode = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const pos = resolvedPositions[nodeId];
    if (!pos) return;

    dragStartRef.current = {
      nodeId,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startNodeX: pos.x,
      startNodeY: pos.y,
      hasMoved: false,
    };
    setDraggingId(nodeId);
  };

  // Window pointer move and up handlers for 60fps drag
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;

      const dx = (e.clientX - dragStartRef.current.startPointerX) / zoom;
      const dy = (e.clientY - dragStartRef.current.startPointerY) / zoom;

      if (!dragStartRef.current.hasMoved && Math.hypot(dx, dy) > 4) {
        dragStartRef.current.hasMoved = true;
      }

      if (dragStartRef.current.hasMoved) {
        const newX = Math.max(10, Math.round(dragStartRef.current.startNodeX + dx));
        const newY = Math.max(10, Math.round(dragStartRef.current.startNodeY + dy));

        setActivePositions((prev) => ({
          ...prev,
          [dragStartRef.current!.nodeId]: { x: newX, y: newY },
        }));
      }
    };

    const handlePointerUp = () => {
      if (!dragStartRef.current) return;

      const { nodeId, hasMoved } = dragStartRef.current;
      if (!hasMoved) {
        // Was a simple click
        onSelectNode(nodeId);
      } else {
        // Was a drag: save positions to parent
        setActivePositions((latest) => {
          lastEmittedRef.current = latest;
          onUpdatePositions?.(latest);
          return latest;
        });
      }

      dragStartRef.current = null;
      setDraggingId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [zoom, onSelectNode, onUpdatePositions]);

  // Reset to echelon columns layout
  const handleAutoAlign = useCallback(() => {
    const map: Record<string, { x: number; y: number }> = {};
    TIER_ORDER.forEach((tier, colIndex) => {
      const tierNodes = nodes.filter((n) => n.type === tier);
      tierNodes.forEach((node, rowIndex) => {
        map[node.id] = {
          x: PADDING_LEFT + colIndex * COL_WIDTH,
          y: PADDING_TOP + rowIndex * (NODE_HEIGHT + VERTICAL_GAP),
        };
      });
    });
    lastEmittedRef.current = map;
    setActivePositions(map);
    onUpdatePositions?.(map);
  }, [nodes, onUpdatePositions]);

  // Adaptive Bezier curve routing between nodes
  const linkPaths = useMemo(() => {
    return links
      .map((link) => {
        const srcPos = resolvedPositions[link.source];
        const tgtPos = resolvedPositions[link.target];
        if (!srcPos || !tgtPos) return null;

        // Centers
        const srcCx = srcPos.x + NODE_WIDTH / 2;
        const srcCy = srcPos.y + NODE_HEIGHT / 2;
        const tgtCx = tgtPos.x + NODE_WIDTH / 2;
        const tgtCy = tgtPos.y + NODE_HEIGHT / 2;

        const dx = tgtCx - srcCx;
        const dy = tgtCy - srcCy;

        let x1: number;
        let y1: number;
        let x2: number;
        let y2: number;
        let cx1: number;
        let cy1: number;
        let cx2: number;
        let cy2: number;

        // Determine dominant direction
        if (Math.abs(dx) >= Math.abs(dy)) {
          // Primarily horizontal
          if (dx >= 0) {
            // Left to Right
            x1 = srcPos.x + NODE_WIDTH;
            y1 = srcCy;
            x2 = tgtPos.x;
            y2 = tgtCy;
          } else {
            // Right to Left
            x1 = srcPos.x;
            y1 = srcCy;
            x2 = tgtPos.x + NODE_WIDTH;
            y2 = tgtCy;
          }
          const curveX = Math.max(40, Math.abs(x2 - x1) * 0.45);
          cx1 = dx >= 0 ? x1 + curveX : x1 - curveX;
          cy1 = y1;
          cx2 = dx >= 0 ? x2 - curveX : x2 + curveX;
          cy2 = y2;
        } else {
          // Primarily vertical
          if (dy >= 0) {
            // Top to Bottom
            x1 = srcCx;
            y1 = srcPos.y + NODE_HEIGHT;
            x2 = tgtCx;
            y2 = tgtPos.y;
          } else {
            // Bottom to Top
            x1 = srcCx;
            y1 = srcPos.y;
            x2 = tgtCx;
            y2 = tgtPos.y + NODE_HEIGHT;
          }
          const curveY = Math.max(40, Math.abs(y2 - y1) * 0.45);
          cx1 = x1;
          cy1 = dy >= 0 ? y1 + curveY : y1 - curveY;
          cx2 = x2;
          cy2 = dy >= 0 ? y2 - curveY : y2 + curveY;
        }

        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

        const isUpstream = upstreamIds.has(link.source);
        const isDownstream = downstreamIds.has(link.target);
        const isSelected = selectedNodeId === link.source || selectedNodeId === link.target;
        const isSevered = offline.has(link.source);

        return {
          link,
          path,
          x1,
          y1,
          x2,
          y2,
          isSelected,
          isUpstream,
          isDownstream,
          isSevered,
        };
      })
      .filter(Boolean);
  }, [links, resolvedPositions, selectedNodeId, upstreamIds, downstreamIds, offline]);

  return (
    <div className="relative flex-1 w-full h-full min-h-[580px] bg-slate-50/70 rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col select-none">
      {/* Floating Canvas Controls HUD */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-xs text-xs text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-900">{nodes.length}</span>
            <span className="text-slate-500">Entities</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-900">{links.length}</span>
            <span className="text-slate-500">Connections</span>
          </div>
          {offline.size > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 text-rose-600 font-bold">
                <Power className="size-3.5" />
                <span>{offline.size} Disrupted</span>
              </div>
            </>
          )}
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1 text-indigo-700 font-medium">
            <Move className="size-3" />
            <span className="hidden sm:inline">Drag any facility to customize layout</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200/90 shadow-xs">
          <button
            type="button"
            onClick={handleAutoAlign}
            className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-1"
            title="Auto-align facilities back to neat echelon columns"
          >
            <Grid className="size-3.5 text-indigo-600" />
            <span>Auto-Align</span>
          </button>
          <div className="h-4 w-px bg-slate-200 my-auto" />
          <button
            type="button"
            onClick={() => setShowParticles(!showParticles)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
              showParticles
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Toggle animated flow particles"
          >
            <Sparkles className="size-3.5" />
            <span>Flows</span>
          </button>
          <div className="h-4 w-px bg-slate-200 my-auto" />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="size-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-500 min-w-9 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Reset 100% Zoom"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scrollable Area */}
      <div
        ref={containerRef}
        onClick={(e) => {
          if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
            onSelectNode(null);
          }
        }}
        className="flex-1 w-full h-full overflow-auto relative p-4 scrollbar-thin bg-radial from-slate-50 to-slate-100/60"
      >
        <div
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
            transformOrigin: "top left",
          }}
          className="relative transition-transform duration-75 ease-out"
        >
          {/* Echelon Column Header Guides */}
          {showGuides && (
            <div className="absolute top-4 left-0 right-0 flex z-0 pointer-events-none opacity-80">
              {TIER_COLUMNS.map((col, idx) => (
                <div
                  key={col.id}
                  style={{
                    left: (PADDING_LEFT + idx * COL_WIDTH) * zoom,
                    width: NODE_WIDTH * zoom,
                  }}
                  className="absolute text-center"
                >
                  <span
                    className={`inline-block rounded-lg px-3 py-1 text-[11px] font-bold border shadow-2xs ${col.badge}`}
                  >
                    {col.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* SVG Canvas for Links & Particle Flows */}
          <svg
            className="absolute inset-0 pointer-events-none z-0"
            width={canvasWidth * zoom}
            height={canvasHeight * zoom}
          >
            <defs>
              <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Connection Arcs */}
            {linkPaths.map((lp, i) => {
              if (!lp) return null;
              const scaledPath = lp.path;

              return (
                <g key={`${lp.link.source}-${lp.link.target}-${i}`} transform={`scale(${zoom})`}>
                  {/* Background link path */}
                  <path
                    d={scaledPath}
                    fill="none"
                    stroke={
                      lp.isSevered
                        ? "#fecdd3"
                        : lp.isSelected
                          ? "#818cf8"
                          : lp.isUpstream || lp.isDownstream
                            ? "#a5b4fc"
                            : "#cbd5e1"
                    }
                    strokeWidth={lp.isSelected ? 3.5 : 2}
                    strokeDasharray={lp.isSevered ? "4 4" : undefined}
                    className="transition-colors duration-150"
                  />

                  {/* Animated flow particle overlay */}
                  {showParticles && !lp.isSevered && (
                    <path
                      d={scaledPath}
                      fill="none"
                      stroke="url(#flow-gradient)"
                      strokeWidth={lp.isSelected ? 3 : 1.8}
                      strokeDasharray="6 14"
                      className="animate-flow-dash"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Render Interactive Draggable Node Cards */}
          {nodes.map((node) => {
            const pos = resolvedPositions[node.id] ?? { x: 50, y: 100 };
            const isOff = offline.has(node.id);
            const isAtRisk = !isOff && atRiskNodes.has(node.id);
            const isSelected = selectedNodeId === node.id;
            const isDragging = draggingId === node.id;
            const isUpstream = upstreamIds.has(node.id);
            const isDownstream = downstreamIds.has(node.id);

            // Depletion calculation for scrubber
            const effectiveBufferRemaining = Math.max(0, node.bufferDays - timeScrubDay);
            const isDepleted = isAtRisk && effectiveBufferRemaining === 0;

            return (
              <div
                key={node.id}
                onPointerDown={(e) => handlePointerDownNode(e, node.id)}
                style={{
                  left: pos.x * zoom,
                  top: pos.y * zoom,
                  width: NODE_WIDTH * zoom,
                  minHeight: NODE_HEIGHT * zoom,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  zIndex: isDragging ? 40 : isSelected ? 30 : 10,
                }}
                className={`absolute rounded-xl border p-3 cursor-grab active:cursor-grabbing select-none transition-shadow duration-150 group ${
                  isDragging
                    ? "shadow-2xl ring-2 ring-indigo-500 bg-white scale-[1.03]"
                    : isOff
                      ? "bg-rose-50/95 border-rose-400 shadow-md ring-2 ring-rose-300/60"
                      : isDepleted
                        ? "bg-rose-50/80 border-rose-300 shadow-sm"
                        : isAtRisk
                          ? "bg-amber-50/80 border-amber-300 shadow-sm ring-1 ring-amber-300/50"
                          : isSelected
                            ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-400/40"
                            : isUpstream || isDownstream
                              ? "bg-white border-indigo-300 shadow-xs"
                              : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                {/* Top header row */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`size-2.5 rounded-full shrink-0 ${
                        isOff
                          ? "bg-rose-600 animate-pulse"
                          : isDepleted
                            ? "bg-rose-500"
                            : isAtRisk
                              ? "bg-amber-500 animate-pulse"
                              : "bg-emerald-500"
                      }`}
                    />
                    <h4 className="text-xs font-bold text-slate-900 truncate" title={node.label}>
                      {node.label}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleOffline(node.id);
                    }}
                    className={`rounded p-1 text-[10px] font-semibold transition-colors shrink-0 ${
                      isOff
                        ? "bg-rose-200 text-rose-800 hover:bg-rose-300"
                        : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    }`}
                    title={isOff ? "Restore Facility" : "Disrupt Facility"}
                  >
                    <Power className="size-3.5" />
                  </button>
                </div>

                {/* Subtitle & Region */}
                <div className="mt-1 flex items-center justify-between text-[10.5px] text-slate-500">
                  <span className="truncate">{node.region}</span>
                  <span className="font-mono font-medium text-slate-700">
                    {node.volume.toLocaleString()} u/w
                  </span>
                </div>

                {/* Buffer Bar & Condition */}
                <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-400">Buffer:</span>
                  <span
                    className={`font-mono font-bold ${
                      isOff
                        ? "text-rose-700"
                        : isDepleted
                          ? "text-rose-700 font-extrabold"
                          : isAtRisk
                            ? "text-amber-700"
                            : "text-slate-700"
                    }`}
                  >
                    {isOff
                      ? "Offline (0d)"
                      : isAtRisk
                        ? `${effectiveBufferRemaining}d left`
                        : `${node.bufferDays}d`}
                  </span>
                </div>

                {/* Hover Delete Action */}
                {onDeleteNode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                    className="absolute -top-2 -right-2 size-5 rounded-full bg-white border border-rose-200 text-rose-600 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-50 transition-all"
                    title="Delete Facility"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Empty state placeholder when no nodes exist */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="size-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
                <Layers className="size-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Your Canvas is Ready</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Insert your first company facility using the <strong>Add Facility</strong> form, or
                pick a <strong>Starter Template</strong> above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CSS for animated particles */}
      <style>{`
        @keyframes flowDash {
          to {
            stroke-dashoffset: -40;
          }
        }
        .animate-flow-dash {
          animation: flowDash 1.4s linear infinite;
        }
      `}</style>
    </div>
  );
}
