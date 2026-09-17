import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomTransform } from "d3-zoom";
import {
  Columns3,
  Globe2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Waypoints,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { NodeStatus, SupplyNetwork, SupplyNode } from "@/lib/supply-chain/types";
import { TIER_ORDER } from "@/lib/supply-chain/types";

interface GNode extends SimulationNodeDatum, SupplyNode {
  targetX?: number;
  targetY?: number;
}
type GLink = SimulationLinkDatum<GNode> & { volume: number };

interface Props {
  network: SupplyNetwork;
  statuses: Record<string, NodeStatus>;
  selectedId: string | null;
  offline: ReadonlySet<string>;
  onSelect: (id: string | null) => void;
  onToggleNode?: (id: string) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

const COLORS: Record<NodeStatus, { fill: string; stroke: string; glow: string }> = {
  healthy: { fill: "#ffffff", stroke: "#4f46e5", glow: "rgba(79, 70, 229, 0.15)" },
  "at-risk": { fill: "#ffffff", stroke: "#d97706", glow: "rgba(217, 119, 6, 0.2)" },
  failed: { fill: "#ffffff", stroke: "#dc2626", glow: "rgba(220, 38, 38, 0.25)" },
};

const radiusFor = (n: SupplyNode) => 10 + Math.sqrt(n.volume) / 6.5;

const TIER_HEADERS: Record<string, string> = {
  raw: "Tier 3 · Raw Materials",
  component: "Tier 2 · Components",
  subassembly: "Tier 1 · Sub-Assembly",
  factory: "Assembly Plants",
  distribution: "Regional DCs",
};

export function NetworkGraph({
  network,
  statuses,
  selectedId,
  offline,
  onSelect,
  onToggleNode,
  onToggleFullscreen,
  isFullscreen: externalFullscreen,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const stateRef = useRef({ statuses, selectedId, offline });
  const hoverRef = useRef<string | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const fitRef = useRef<() => void>(() => {});
  const animFrameRef = useRef<number | null>(null);
  const pulseOffsetRef = useRef<number>(0);

  const [layoutMode, setLayoutMode] = useState<"tiered" | "force" | "regional">("tiered");
  const [animateFlow, setAnimateFlow] = useState<boolean>(true);
  const [internalFullscreen, setInternalFullscreen] = useState<boolean>(false);

  const isFullscreen = externalFullscreen ?? internalFullscreen;

  stateRef.current = { statuses, selectedId, offline };

  const graph = useMemo(() => {
    const nodes: GNode[] = network.nodes.map((n) => ({ ...n }));
    const links: GLink[] = network.links.map((l) => ({ ...l }));
    return { nodes, links };
  }, [network]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    nodesRef.current = graph.nodes;
    linksRef.current = graph.links;

    let width = wrap.clientWidth || 1200;
    let height = wrap.clientHeight || 800;

    const tierX = (t: SupplyNode["type"]) => {
      const idx = TIER_ORDER.indexOf(t);
      const padding = 110;
      const available = width - padding * 2;
      return padding + (idx / (TIER_ORDER.length - 1)) * available;
    };

    const regionX = (region: string) => {
      const parts = region.split(",");
      const code = (parts[parts.length - 1] ?? "").trim().toUpperCase();
      if (["US", "CA", "MX", "BR"].includes(code)) return width * 0.18;
      if (["DE", "NL", "SE", "PL", "SK", "PT", "CD"].includes(code)) return width * 0.5;
      return width * 0.82;
    };

    const sim = forceSimulation<GNode, GLink>(graph.nodes)
      .force(
        "link",
        forceLink<GNode, GLink>(graph.links)
          .id((d) => d.id)
          .distance(layoutMode === "force" ? 130 : 90)
          .strength(layoutMode === "force" ? 0.35 : 0.12),
      )
      .force("charge", forceManyBody<GNode>().strength(layoutMode === "force" ? -650 : -220))
      .force(
        "collide",
        forceCollide<GNode>((d) => radiusFor(d) + 18),
      );

    if (layoutMode === "tiered") {
      const tierBuckets: Record<string, GNode[]> = {};
      for (const t of TIER_ORDER) tierBuckets[t] = [];
      for (const n of graph.nodes) tierBuckets[n.type]?.push(n);

      for (const t of TIER_ORDER) {
        const bucket = tierBuckets[t] ?? [];
        const colX = tierX(t);
        const topPadding = 110;
        const bottomPadding = 90;
        const availableHeight = height - topPadding - bottomPadding;

        bucket.forEach((node, idx) => {
          node.targetX = colX;
          node.targetY = topPadding + ((idx + 0.5) / Math.max(1, bucket.length)) * availableHeight;
        });
      }

      sim
        .force("x", forceX<GNode>((d) => d.targetX ?? tierX(d.type)).strength(0.92))
        .force("y", forceY<GNode>((d) => d.targetY ?? height / 2).strength(0.92))
        .force("center", forceCenter(width / 2, height / 2).strength(0.04));
    } else if (layoutMode === "regional") {
      sim
        .force("x", forceX<GNode>((d) => regionX(d.region)).strength(0.85))
        .force("y", forceY<GNode>(() => height / 2).strength(0.2))
        .force("center", forceCenter(width / 2, height / 2).strength(0.05));
    } else {
      sim
        .force("x", forceX<GNode>((d) => tierX(d.type)).strength(0.35))
        .force("y", forceY<GNode>(() => height / 2).strength(0.15))
        .force("center", forceCenter(width / 2, height / 2).strength(0.05));
    }

    simRef.current = sim;
    const ctx = canvas.getContext("2d")!;

    const fitView = () => {
      const pts = nodesRef.current.filter((n) => n.x != null && n.y != null);
      if (!pts.length) return;
      const pad = 60;
      const minX = Math.min(...pts.map((n) => n.x! - radiusFor(n)));
      const maxX = Math.max(...pts.map((n) => n.x! + radiusFor(n)));
      const minY = Math.min(...pts.map((n) => n.y! - radiusFor(n)));
      const maxY = Math.max(...pts.map((n) => n.y! + radiusFor(n)));
      const k = Math.min(
        2.0,
        Math.max(
          0.35,
          Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1)),
        ),
      );
      const tx = width / 2 - ((minX + maxX) / 2) * k;
      const ty = height / 2 - ((minY + maxY) / 2) * k;
      transformRef.current = zoomIdentity.translate(tx, ty).scale(k);
      select(canvas).property("__zoom", transformRef.current);
      drawRef.current();
    };
    fitRef.current = fitView;

    const resize = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim.alpha(0.35).restart();
      fitView();
    };

    const draw = () => {
      const { statuses: st, selectedId: sel, offline: off } = stateRef.current;
      const t = transformRef.current;
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Clean Light Theme Canvas Background
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // Subtle Background Grid
      ctx.strokeStyle = "rgba(203, 213, 225, 0.4)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      // Tier Column Backdrops in Tiered Pipeline Mode
      if (layoutMode === "tiered") {
        for (let i = 0; i < TIER_ORDER.length; i++) {
          const tKey = TIER_ORDER[i]!;
          const x = tierX(tKey);

          // Vertical Lane Line
          ctx.beginPath();
          ctx.moveTo(x, -500);
          ctx.lineTo(x, height + 500);
          ctx.strokeStyle = "rgba(203, 213, 225, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Illuminated Column Header Tag
          ctx.save();
          ctx.font = '700 11px "Inter Tight", sans-serif';
          ctx.textAlign = "center";
          ctx.fillStyle = "#64748b";
          ctx.fillText(TIER_HEADERS[tKey]?.toUpperCase() ?? "", x, 45);
          ctx.restore();
        }
      }

      // 1. Draw Links
      for (const l of linksRef.current) {
        const s = l.source as GNode;
        const tg = l.target as GNode;
        if (!s.x || !tg.x) continue;
        const broken = st[s.id] === "failed" || st[tg.id] === "failed";
        const degraded = st[s.id] === "at-risk" || st[tg.id] === "at-risk";
        const touchesSelected = sel === s.id || sel === tg.id;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y!);
        ctx.lineTo(tg.x, tg.y!);

        ctx.strokeStyle = broken
          ? "#dc2626"
          : degraded
            ? "#d97706"
            : touchesSelected
              ? "#4f46e5"
              : "#94a3b8";

        ctx.globalAlpha = sel && !touchesSelected ? 0.25 : 0.85;
        ctx.lineWidth = (touchesSelected ? 2.8 : 1.4) + l.volume / 2200;

        if (broken) {
          ctx.setLineDash([6, 5]);
        } else if (animateFlow) {
          ctx.setLineDash([10, 6]);
          ctx.lineDashOffset = -pulseOffsetRef.current;
        } else {
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Flow Direction Arrowhead
        if (touchesSelected && !broken) {
          const midX = (s.x + tg.x) / 2;
          const midY = (s.y! + tg.y!) / 2;
          const angle = Math.atan2(tg.y! - s.y!, tg.x - s.x);
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(angle);
          ctx.fillStyle = "#4f46e5";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-7, -4);
          ctx.lineTo(-7, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // 2. Draw Nodes
      for (const n of nodesRef.current) {
        if (n.x == null || n.y == null) continue;
        const status = st[n.id] ?? "healthy";
        const c = COLORS[status];
        const r = radiusFor(n);
        const isSelected = sel === n.id;
        const isHover = hoverRef.current === n.id;

        ctx.globalAlpha = sel && !isSelected ? 0.5 : 1;

        // Outer Glow
        if (isSelected || isHover || status !== "healthy") {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 10, 0, Math.PI * 2);
          ctx.fillStyle = c.glow;
          ctx.fill();
        }

        // Main Node Body (White in light theme)
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = isSelected ? 4.5 : 3;
        ctx.strokeStyle = c.stroke;
        ctx.stroke();

        // Failed Outage Cross
        if (off.has(n.id)) {
          ctx.beginPath();
          ctx.moveTo(n.x - r * 0.45, n.y - r * 0.45);
          ctx.lineTo(n.x + r * 0.45, n.y + r * 0.45);
          ctx.moveTo(n.x + r * 0.45, n.y - r * 0.45);
          ctx.lineTo(n.x - r * 0.45, n.y + r * 0.45);
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#dc2626";
          ctx.stroke();
        } else {
          // Inner ID
          ctx.font = 'bold 11px "IBM Plex Mono", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = c.stroke;
          ctx.fillText(n.id, n.x, n.y);
        }

        // Crisp Label Tag below node
        const labelText = n.label;
        ctx.font = `${isSelected ? 700 : 600} 11.5px "Inter Tight", system-ui, sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        const badgeY = n.y + r + 14;

        // Tag Background
        ctx.fillStyle = isSelected ? "#4f46e5" : "#ffffff";
        ctx.strokeStyle = isSelected ? "#4338ca" : "#cbd5e1";
        ctx.lineWidth = 1;
        const padX = 8;
        const padY = 4;
        ctx.beginPath();
        ctx.roundRect(n.x - textWidth / 2 - padX, badgeY - padY - 8, textWidth + padX * 2, 20, 6);
        ctx.fill();
        ctx.stroke();

        // Tag Text
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isSelected ? "#ffffff" : "#0f172a";
        ctx.fillText(labelText, n.x, badgeY + 1);

        // Additional detail badge when selected or hovered
        if (isSelected || isHover) {
          ctx.font = '600 10px "IBM Plex Mono", monospace';
          ctx.fillStyle = "#64748b";
          ctx.fillText(`${n.volume.toLocaleString()} u/wk · ${n.region}`, n.x, badgeY + 18);
        }

        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };
    drawRef.current = draw;

    sim.on("tick", draw);
    sim.on("end", () => fitRef.current());
    const settleTimer = window.setTimeout(() => fitRef.current(), 1200);

    const stepAnimation = () => {
      if (animateFlow) {
        pulseOffsetRef.current = (pulseOffsetRef.current + 0.35) % 16;
        draw();
      }
      animFrameRef.current = requestAnimationFrame(stepAnimation);
    };
    animFrameRef.current = requestAnimationFrame(stepAnimation);

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.25, 4.5])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        draw();
      });
    select(canvas).call(zoomBehavior).on("dblclick.zoom", null);

    const pick = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const [x, y] = transformRef.current.invert([clientX - rect.left, clientY - rect.top]);
      let found: GNode | null = null;
      for (const n of nodesRef.current) {
        if (n.x == null || n.y == null) continue;
        const r = radiusFor(n) + 8;
        if ((n.x - x) ** 2 + (n.y - y) ** 2 <= r * r) found = n;
      }
      return found;
    };

    const onClick = (e: MouseEvent) => {
      const hit = pick(e.clientX, e.clientY);
      if (hit && onToggleNode) {
        onToggleNode(hit.id);
      }
      onSelect(hit ? hit.id : null);
    };
    const onMove = (e: MouseEvent) => {
      const hit = pick(e.clientX, e.clientY);
      const id = hit ? hit.id : null;
      if (id !== hoverRef.current) {
        hoverRef.current = id;
        canvas.style.cursor = id ? "pointer" : "grab";
        draw();
      }
    };

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMove);
      ro.disconnect();
      window.clearTimeout(settleTimer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      sim.stop();
    };
  }, [graph, layoutMode, animateFlow, onSelect]);

  const handleZoom = (direction: "in" | "out") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const factor = direction === "in" ? 1.3 : 1 / 1.3;
    const zb = zoom<HTMLCanvasElement, unknown>();
    zb.scaleBy(select(canvas), factor);
  };

  const healthyCount = Object.values(statuses).filter((s) => s === "healthy").length;
  const atRiskCount = Object.values(statuses).filter((s) => s === "at-risk").length;
  const failedCount = Object.values(statuses).filter((s) => s === "failed").length;

  const toggleFullscreenMode = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalFullscreen(!internalFullscreen);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full select-none overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""
      }`}
    >
      {/* Top Floating Control Toolbar (Light Theme) */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2">
        {/* Layout Switcher */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 backdrop-blur-md shadow-md">
          <button
            onClick={() => setLayoutMode("tiered")}
            title="Tiered Pipeline (Raw to Distribution)"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              layoutMode === "tiered"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Columns3 className="size-3.5" /> Tiered Pipeline
          </button>
          <button
            onClick={() => setLayoutMode("force")}
            title="Physics Force-Directed Layout"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              layoutMode === "force"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Waypoints className="size-3.5" /> Physics Force
          </button>
          <button
            onClick={() => setLayoutMode("regional")}
            title="Grouped by Geographic Region"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              layoutMode === "regional"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Globe2 className="size-3.5" /> Regional
          </button>
        </div>

        {/* View & Animation Controls */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 backdrop-blur-md shadow-md">
          <button
            onClick={() => setAnimateFlow(!animateFlow)}
            title={animateFlow ? "Pause Flow Animation" : "Resume Flow Animation"}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              animateFlow
                ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">{animateFlow ? "Flow Pulse" : "Static"}</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            onClick={() => handleZoom("in")}
            title="Zoom In"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            onClick={() => handleZoom("out")}
            title="Zoom Out"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            onClick={() => fitRef.current()}
            title="Fit View"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="size-4" />
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            onClick={toggleFullscreenMode}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Control Tower"}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 shadow-sm transition-colors"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            <span>{isFullscreen ? "Exit Fullscreen" : "Full Screen"}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Bottom Status Legend (Light Theme) */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 backdrop-blur-md shadow-md text-slate-700 font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#4f46e5]" /> Nominal ({healthyCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#d97706]" /> At-risk ({atRiskCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#dc2626]" /> Disrupted ({failedCount})
          </span>
        </div>

        <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 font-mono text-[11px] text-slate-500 backdrop-blur-md shadow-md">
          Click entity to inspect &middot; Drag to pan &middot; Scroll to zoom
        </div>
      </div>
    </div>
  );
}
