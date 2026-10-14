"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, PointerEvent, SetStateAction } from "react";
import type { Project, Workflow } from "@/types";
import { nodeType } from "@/lib/workflows/graph";
import type { Connection, NodeId, NodeType } from "@/lib/workflows/graph";
import { Button } from "@/components/ui/button";
import {
  Database,
  Download,
  FolderOpen,
  Grip,
  LayoutTemplate,
  Minus,
  PanelRightOpen,
  Plus,
  Send,
  FileUp,
} from "lucide-react";

export type { NodeType } from "@/lib/workflows/graph";
export type NodeStatus =
  | "idle"
  | "processing"
  | "complete"
  | "paused"
  | "error";

export const defaultPositions: Record<NodeType, { x: number; y: number }> = {
  source: { x: 60, y: 100 },
  template: { x: 450, y: 100 },
  project: { x: 840, y: 100 },
  export: { x: 1230, y: 100 },
  draft: { x: 1230, y: 260 },
  post: { x: 1230, y: 420 },
};

const nodeOptions = [
  {
    type: "source",
    label: "Source",
    detail: "JSON or AI content",
    icon: Database,
  },
  {
    type: "template",
    label: "Template",
    detail: "Fill slide placeholders",
    icon: LayoutTemplate,
  },
  {
    type: "project",
    label: "Review queue",
    detail: "Pause and adjust slides",
    icon: FolderOpen,
  },
  {
    type: "export",
    label: "Export",
    detail: "Save files to Media",
    icon: Download,
  },
  { type: "draft", label: "TikTok draft", detail: "Send slides to inbox", icon: FileUp },
  { type: "post", label: "TikTok post", detail: "Publish slides", icon: Send },
] as const;

const NODE_WIDTH = 340;
const NODE_HEIGHT = 112;
type Point = { x: number; y: number };
type AlignmentGuide = { position: number; from: number; to: number };

function curvedPath(start: Point, end: Point): string {
  const bend = Math.max(60, Math.abs(end.x - start.x) / 2);
  return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
}

interface WorkflowCanvasProps {
  draft: Workflow;
  nodes: NodeId[];
  connections: Connection[];
  position: (node: NodeId) => { x: number; y: number };
  pan: { x: number; y: number };
  setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
  selectedNode: NodeId | null;
  onSelectNode: (node: NodeId) => void;
  onAddNode: (node: NodeType, at: Point) => void;
  onMoveNode: (node: NodeId, x: number, y: number) => void;
  onConnect: (from: NodeId, to: NodeId) => void;
  onDisconnect: (from: NodeId, to: NodeId) => void;
  statuses: Partial<Record<NodeId, NodeStatus>>;
  templateName?: string;
  reviewProject: Project | null;
  reviewOpen: boolean;
  onOpenReview: () => void;
}

export function WorkflowCanvas({
  draft,
  nodes,
  connections,
  position,
  pan,
  setPan,
  selectedNode,
  onSelectNode,
  onAddNode,
  onMoveNode,
  onConnect,
  onDisconnect,
  statuses,
  templateName,
  reviewProject,
  reviewOpen,
  onOpenReview,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const routedConnections = useMemo(
    () => connections.filter(({ from, to }) => nodes.includes(from) && nodes.includes(to)).map(({ from, to }) => ({
      from, to, path: curvedPath(
        { x: position(from).x + NODE_WIDTH, y: position(from).y + NODE_HEIGHT / 2 },
        { x: position(to).x, y: position(to).y + NODE_HEIGHT / 2 },
      ),
    })),
    [connections, nodes, position],
  );
  const [guides, setGuides] = useState<{ vertical?: AlignmentGuide; horizontal?: AlignmentGuide }>({});
  const drag = useRef<{
    node: NodeId;
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const dragFrame = useRef<number | null>(null);
  const pendingDragPoint = useRef<Point | null>(null);
  const [connecting, setConnecting] = useState<{
    from: NodeId;
    point: Point;
  } | null>(null);
  const panDrag = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const zoomAt = useCallback(
    (nextZoom: number, x: number, y: number) => {
      const clamped = Math.max(0.25, Math.min(2, nextZoom));
      setPan((current) => ({
        x: x - ((x - current.x) * clamped) / zoom,
        y: y - ((y - current.y) * clamped) / zoom,
      }));
      setZoom(clamped);
    },
    [zoom, setPan],
  );
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      if (!event.altKey) return;
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      zoomAt(
        zoom * Math.exp(-event.deltaY * 0.001),
        event.clientX - bounds.left,
        event.clientY - bounds.top,
      );
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [zoom, zoomAt]);
  useEffect(() => () => {
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
  }, []);
  const startDrag = (event: PointerEvent<HTMLDivElement>, node: NodeId) => {
    if (event.button !== 0) return;
    const start = position(node);
    drag.current = {
      node,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: start.x,
      startY: start.y,
    };
    setGuides({});
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const applyDrag = (clientX: number, clientY: number) => {
    const current = drag.current;
    if (!current) return;
    const x = current.startX + (clientX - current.pointerX) / zoom;
    const y = current.startY + (clientY - current.pointerY) / zoom;
    let vertical: AlignmentGuide | undefined;
    let horizontal: AlignmentGuide | undefined;
    let bestX = 8 / zoom;
    let bestY = 8 / zoom;
    let snapX = x;
    let snapY = y;
    for (const node of nodes) {
      if (node === current.node) continue;
      const other = position(node);
      for (const offset of [0, NODE_WIDTH / 2, NODE_WIDTH]) {
        const delta = other.x + offset - (x + offset);
        if (Math.abs(delta) < bestX) {
          bestX = Math.abs(delta);
          vertical = { position: other.x + offset, from: Math.min(y, other.y), to: Math.max(y + NODE_HEIGHT, other.y + NODE_HEIGHT) };
          snapX = x + delta;
        }
      }
      for (const offset of [0, NODE_HEIGHT / 2, NODE_HEIGHT]) {
        const delta = other.y + offset - (y + offset);
        if (Math.abs(delta) < bestY) {
          bestY = Math.abs(delta);
          horizontal = { position: other.y + offset, from: Math.min(x, other.x), to: Math.max(x + NODE_WIDTH, other.x + NODE_WIDTH) };
          snapY = y + delta;
        }
      }
    }
    setGuides({ vertical, horizontal });
    onMoveNode(current.node, Math.round(snapX), Math.round(snapY));
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    pendingDragPoint.current = { x: event.clientX, y: event.clientY };
    if (dragFrame.current !== null) return;
    dragFrame.current = requestAnimationFrame(() => {
      dragFrame.current = null;
      const point = pendingDragPoint.current;
      pendingDragPoint.current = null;
      if (point) applyDrag(point.x, point.y);
    });
  };
  const finishDrag = (event?: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    const point = event ? { x: event.clientX, y: event.clientY } : pendingDragPoint.current;
    pendingDragPoint.current = null;
    if (point && (point.x !== drag.current.pointerX || point.y !== drag.current.pointerY)) applyDrag(point.x, point.y);
    drag.current = null;
    setGuides({});
  };
  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 1) return;
    event.preventDefault();
    panDrag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: pan.x,
      startY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const current = panDrag.current;
    if (current)
      setPan({
        x: current.startX + event.clientX - current.pointerX,
        y: current.startY + event.clientY - current.pointerY,
      });
  };
  const addAtViewportCenter = (type: NodeType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onAddNode(type, {
      x: Math.round((canvas.clientWidth / 2 - pan.x) / zoom - NODE_WIDTH / 2),
      y: Math.round((canvas.clientHeight / 2 - pan.y) / zoom - NODE_HEIGHT / 2),
    });
  };
  const statusLabel = (node: NodeId) => {
    const status = statuses[node] ?? "idle";
    return (
      <span
        className={`ml-auto rounded-full px-2 py-0.5 text-xs font-normal ${status === "processing" ? "bg-primary/15 text-primary" : status === "paused" ? "bg-amber-500/15 text-amber-600" : status === "complete" ? "bg-green-500/15 text-green-600" : status === "error" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
      >
        {status === "paused" ? "Waiting for review" : status}
      </span>
    );
  };
  const summary: Record<NodeType, string> = {
    source: `${draft.sourceType === "ai" ? "AI agent" : "JSON data"} · Click to configure`,
    template: `${templateName ?? "Choose a template"} · Click to configure`,
    project: "Pauses for slide review · Click to configure",
    export: `${draft.exportFormat.toUpperCase()} to Media · Click to configure`,
    draft: "Send to TikTok inbox · Click to configure",
    post: "Publish to TikTok · Click to configure",
  };

  return (
    <>
      <aside className="w-60 shrink-0 overflow-y-auto border-r bg-card p-4">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow
          </p>
          <h2 className="text-lg font-semibold">Node library</h2>
        </div>
        <div className="space-y-2">
          {nodeOptions.map(({ type, label, detail, icon: Icon }) => (
            <button
              key={type}
              type="button"
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/60 hover:bg-accent ${selectedNode === type ? "border-primary bg-primary/5" : "bg-background"}`}
              onClick={() =>
                type === "export" || !nodes.includes(type)
                  ? addAtViewportCenter(type)
                  : onSelectNode(type)
              }
            >
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {type === "export"
                    ? "Add another export"
                    : nodes.includes(type)
                      ? "On canvas · Select"
                      : detail}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>
      <div
        ref={canvasRef}
        className="relative min-w-0 flex-1 select-none overflow-hidden bg-muted/20"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onPointerDown={startPan}
        onPointerMove={(event) => {
          movePan(event);
          if (connecting) {
            const bounds = event.currentTarget.getBoundingClientRect();
            setConnecting({
              ...connecting,
              point: {
                x: (event.clientX - bounds.left - pan.x) / zoom,
                y: (event.clientY - bounds.top - pan.y) / zoom,
              },
            });
          }
        }}
        onPointerUp={(event) => {
          panDrag.current = null;
          if (connecting) {
            const target = (event.target as HTMLElement).closest(
              "[data-node-id]",
            ) as HTMLElement | null;
            const to = target?.dataset.nodeId as NodeId | undefined;
            if (to) onConnect(connecting.from, to);
            setConnecting(null);
          }
        }}
        onLostPointerCapture={() => {
          panDrag.current = null;
          setConnecting(null);
        }}
        onAuxClick={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          <svg className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-visible">
            {guides.vertical && (
              <line x1={guides.vertical.position} x2={guides.vertical.position} y1={guides.vertical.from} y2={guides.vertical.to} stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 4" />
            )}
            {guides.horizontal && (
              <line x1={guides.horizontal.from} x2={guides.horizontal.to} y1={guides.horizontal.position} y2={guides.horizontal.position} stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 4" />
            )}
            {routedConnections.map(
              ({ from, to, path }) => (
                  <g key={`${from}-${to}`} className="group">
                    <path
                      d={path}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className="group-hover:stroke-destructive group-focus-within:stroke-destructive"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                      className="pointer-events-auto cursor-pointer focus:outline-none"
                      role="button"
                      tabIndex={0}
                      aria-label={`Disconnect ${from} from ${to}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDisconnect(from, to);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onDisconnect(from, to);
                        }
                      }}
                    >
                      <title>Click to disconnect {from} from {to}</title>
                    </path>
                  </g>
                ),
            )}
            {connecting && (
              <path
                d={curvedPath(
                  {
                    x: position(connecting.from).x + NODE_WIDTH,
                    y: position(connecting.from).y + NODE_HEIGHT / 2,
                  },
                  connecting.point,
                )}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeDasharray="6 5"
              />
            )}
          </svg>
          {nodes.length === 0 && (
            <p className="absolute left-40 top-40 w-72 rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-lg">
              Choose a node from the left to start building.
            </p>
          )}
          {nodes.map((id) => {
            const type = nodeType(id);
            const option = nodeOptions.find((item) => item.type === type)!;
            const Icon = option.icon;
            return (
              <div
                key={id}
                data-node-id={id}
                className={`absolute w-[340px] rounded-xl border bg-card p-4 shadow-lg transition-shadow ${selectedNode === id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                style={{ left: position(id).x, top: position(id).y }}
                onClick={() => {
                  onSelectNode(id);
                  if (type === "project" && reviewProject) onOpenReview();
                }}
              >
                {type !== "source" && (
                  <button
                    type="button"
                    aria-label={`Connect to ${option.label}`}
                    className="absolute -left-2 top-12 h-4 w-4 rounded-full border-2 border-primary bg-card"
                    onPointerUp={(event) => {
                      if (connecting) {
                        onConnect(connecting.from, id);
                        setConnecting(null);
                        event.stopPropagation();
                      }
                    }}
                  />
                )}
                {!(["export", "draft", "post"] as NodeType[]).includes(type) && (
                  <button
                    type="button"
                    aria-label={`Connect from ${option.label}`}
                    className="absolute -right-2 top-12 h-4 w-4 rounded-full border-2 border-primary bg-card"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setConnecting({
                        from: id,
                        point: {
                          x: position(id).x + NODE_WIDTH,
                          y: position(id).y + NODE_HEIGHT / 2,
                        },
                      });
                    }}
                    onPointerMove={(event) => {
                      if (connecting?.from === id) {
                        const bounds =
                          canvasRef.current?.getBoundingClientRect();
                        if (bounds)
                          setConnecting({
                            from: id,
                            point: {
                              x: (event.clientX - bounds.left - pan.x) / zoom,
                              y: (event.clientY - bounds.top - pan.y) / zoom,
                            },
                          });
                      }
                    }}
                    onPointerUp={(event) => {
                      if (connecting?.from === id) {
                        const target = document
                          .elementFromPoint(event.clientX, event.clientY)
                          ?.closest("[data-node-id]") as HTMLElement | null;
                        const to = target?.dataset.nodeId as NodeId | undefined;
                        if (to) onConnect(id, to);
                        setConnecting(null);
                      }
                    }}
                  />
                )}
                <div
                  className="flex cursor-grab touch-none items-center gap-2 font-semibold active:cursor-grabbing"
                  onPointerDown={(event) => startDrag(event, id)}
                  onPointerMove={moveDrag}
                  onPointerUp={finishDrag}
                  onLostPointerCapture={() => finishDrag()}
                >
                  <Grip className="h-4 w-4 text-muted-foreground" />
                  <span
                    className={`rounded-lg p-2 ${type === "project" ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{option.label}</span>
                  {statusLabel(id)}
                </div>
                <p className="mt-3 truncate border-t pt-3 text-sm text-muted-foreground">
                  {type === "export"
                    ? `${(draft.exportFormats?.[id] ?? draft.exportFormat).toUpperCase()} to Media`
                    : summary[type]}
                </p>
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-4 right-4 flex items-center rounded-lg border bg-card shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Zoom out"
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas)
                zoomAt(
                  zoom / 1.2,
                  canvas.clientWidth / 2,
                  canvas.clientHeight / 2,
                );
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <button
            type="button"
            className="w-14 text-center text-xs font-medium tabular-nums"
            title="Reset zoom"
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas)
                zoomAt(1, canvas.clientWidth / 2, canvas.clientHeight / 2);
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label="Zoom in"
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas)
                zoomAt(
                  zoom * 1.2,
                  canvas.clientWidth / 2,
                  canvas.clientHeight / 2,
                );
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {reviewProject && !reviewOpen && (
          <Button
            className="absolute right-4 top-4 gap-2 shadow-md"
            variant="secondary"
            onClick={onOpenReview}
          >
            <PanelRightOpen className="h-4 w-4" />
            Open review
          </Button>
        )}
      </div>
    </>
  );
}
