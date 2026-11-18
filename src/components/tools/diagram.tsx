"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  NodeResizer,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChangeset,
  type Node,
  type NodeChangeset,
  type NodeProps,
} from "@xyflow/react";
import { ArrowDownToLine, ArrowRightToLine, Download, Loader2, Maximize, Minimize, Printer, Redo2, Trash2, Undo2 } from "lucide-react";
import { createContext, memo, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { PrintArea, printNow } from "@/components/tools/print";
import { downloadBlob, slugify } from "@/lib/qr";
import {
  NODE_COLORS,
  PALETTE_SHAPES,
  SHAPE_INFO,
  autoLayout,
  makeEdge,
  makeNode,
  type DEdge,
  type DNode,
  type DiagramData,
  type DiagramKind,
  type Shape,
} from "@/lib/tools/diagram";
import { cn } from "@/lib/utils";

/* ------------------------ Conversión de formatos ------------------------ */

type NodeData = { label: string; shape: Shape; color: string };
type FNode = Node<NodeData, "shape">;
type FEdge = Edge<{ dashed?: boolean; arrow?: boolean }>;

function toFlowNodes(nodes: DNode[]): FNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "shape",
    position: { x: n.x, y: n.y },
    width: n.w,
    height: n.h,
    data: { label: n.label, shape: n.shape, color: n.color },
  }));
}

function edgeStyle(kind: DiagramKind, e: DEdge): Partial<FEdge> {
  return {
    type: kind === "flowchart" ? "smoothstep" : "default",
    label: e.label || undefined,
    markerEnd: e.arrow === false ? undefined : { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#475569" },
    style: { stroke: "#475569", strokeWidth: 2, strokeDasharray: e.dashed ? "6 5" : undefined },
    labelStyle: { fontSize: 13, fontWeight: 600, fill: "#3A0A71" },
    labelBgStyle: { fill: "#ffffff" },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 6,
  };
}

function toFlowEdges(kind: DiagramKind, edges: DEdge[]): FEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    data: { dashed: e.dashed, arrow: e.arrow },
    ...edgeStyle(kind, e),
  }));
}

function fromFlow(nodes: FNode[], edges: FEdge[]): DiagramData {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      w: Math.round(n.width ?? n.measured?.width ?? SHAPE_INFO[n.data.shape].w),
      h: Math.round(n.height ?? n.measured?.height ?? SHAPE_INFO[n.data.shape].h),
      shape: n.data.shape,
      label: n.data.label,
      color: n.data.color,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      label: typeof e.label === "string" ? e.label : "",
      dashed: e.data?.dashed,
      arrow: e.data?.arrow,
    })),
  };
}

/* ------------------------------ Nodo forma ------------------------------ */

const EditCtx = createContext<{ readOnly: boolean; editingId: string | null; setEditingId: (id: string | null) => void; commitLabel: (id: string, label: string) => void }>({
  readOnly: true,
  editingId: null,
  setEditingId: () => {},
  commitLabel: () => {},
});

function ShapeBackground({ shape, fill, stroke }: { shape: Shape; fill: string; stroke: string }) {
  const svg = (child: React.ReactNode) => (
    <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {child}
    </svg>
  );
  const common = { fill, stroke, strokeWidth: 2, vectorEffect: "non-scaling-stroke" as const };
  switch (shape) {
    case "decision":
      return svg(<polygon points="50,1 99,50 50,99 1,50" {...common} />);
    case "io":
      return svg(<polygon points="14,1 99,1 86,99 1,99" {...common} />);
    case "document":
      return svg(<path d="M1,1 H99 V82 C78,68 62,100 38,90 C22,84 10,86 1,92 Z" {...common} />);
    case "subprocess":
      return svg(
        <>
          <rect x="1" y="1" width="98" height="98" {...common} />
          <line x1="9" y1="1" x2="9" y2="99" stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <line x1="91" y1="1" x2="91" y2="99" stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </>,
      );
    default: {
      const radius =
        shape === "terminal" || shape === "connector" ? "9999px" : shape === "main" ? "18px" : shape === "concept" ? "14px" : shape === "note" ? "4px" : "6px";
      return (
        <div
          className="absolute inset-0"
          style={{
            background: fill,
            border: `${shape === "main" ? 3 : 2}px solid ${stroke}`,
            borderRadius: radius,
            boxShadow: shape === "note" ? "2px 3px 0 rgba(0,0,0,0.08)" : undefined,
          }}
        />
      );
    }
  }
}

const ShapeNode = memo(function ShapeNode({ id, data, selected }: NodeProps<FNode>) {
  const { readOnly, editingId, setEditingId, commitLabel } = use(EditCtx);
  const color = NODE_COLORS[data.color] ?? NODE_COLORS.violeta;
  const editing = editingId === id && !readOnly;
  const [draft, setDraft] = useState(data.label);
  const pad = data.shape === "decision" ? "px-[18%] py-[14%]" : data.shape === "io" ? "px-[16%]" : data.shape === "document" ? "pb-[14%] px-3" : "px-3";
  const handleCls = cn("!size-2.5 !border-2 !border-white !bg-violet-600", readOnly ? "!opacity-0" : "opacity-0 group-hover:opacity-100", selected && "!opacity-100");

  return (
    <div
      className="group relative h-full w-full"
      onDoubleClick={(e) => {
        if (readOnly) return;
        e.stopPropagation();
        setDraft(data.label);
        setEditingId(id);
      }}
    >
      {!readOnly && <NodeResizer isVisible={selected} minWidth={44} minHeight={36} color="#6A11CB" handleClassName="!size-2.5" />}
      <ShapeBackground shape={data.shape} fill={color.fill} stroke={color.stroke} />
      <div
        className={cn("relative flex h-full w-full items-center justify-center text-center leading-tight", pad)}
        style={{ color: color.text, fontWeight: data.shape === "main" ? 800 : 600, fontSize: data.shape === "main" ? 17 : 14 }}
      >
        {editing ? (
          <textarea
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              commitLabel(id, draft);
              setEditingId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
              if (e.key === "Escape") setEditingId(null);
              e.stopPropagation();
            }}
            className="nodrag h-full w-full resize-none bg-transparent text-center outline-none"
            style={{ color: color.text }}
          />
        ) : (
          <span className="whitespace-pre-wrap break-words">{data.label}</span>
        )}
      </div>
      {(["t", "r", "b", "l"] as const).map((h) => (
        <Handle
          key={h}
          id={h}
          type="source"
          position={h === "t" ? Position.Top : h === "r" ? Position.Right : h === "b" ? Position.Bottom : Position.Left}
          className={handleCls}
          isConnectable={!readOnly}
        />
      ))}
    </div>
  );
});

const nodeTypes = { shape: ShapeNode };

/* ------------------------------ Editor ------------------------------ */

const MAX_HISTORY = 60;

function DiagramInner({
  kind,
  data,
  onChange,
  readOnly,
  title,
}: {
  kind: DiagramKind;
  data: DiagramData;
  onChange?: (d: DiagramData) => void;
  readOnly: boolean;
  title: string;
}) {
  const rf = useReactFlow<FNode, FEdge>();
  const [nodes, setNodes] = useState<FNode[]>(() => toFlowNodes(data.nodes));
  const [edges, setEdges] = useState<FEdge[]>(() => toFlowEdges(kind, data.edges));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printImg, setPrintImg] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const past = useRef<DiagramData[]>([]);
  const future = useRef<DiagramData[]>([]);
  const [hist, setHist] = useState({ past: 0, future: 0 });
  const force = useCallback(() => setHist({ past: past.current.length, future: future.current.length }), []);

  const snapshot = useCallback(() => fromFlow(nodes, edges), [nodes, edges]);

  /** Guarda el estado actual en el historial antes de un cambio. */
  const remember = useCallback(() => {
    past.current = [...past.current.slice(-MAX_HISTORY + 1), fromFlow(nodes, edges)];
    future.current = [];
    force();
  }, [nodes, edges, force]);

  const restore = useCallback(
    (d: DiagramData) => {
      setNodes(toFlowNodes(d.nodes));
      setEdges(toFlowEdges(kind, d.edges));
    },
    [kind],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(snapshot());
    restore(prev);
    force();
  }, [snapshot, restore, force]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(snapshot());
    restore(next);
    force();
  }, [snapshot, restore, force]);

  // Reportar cambios al editor (sin hacerlo en cada cuadro mientras se arrastra)
  const dragging = nodes.some((n) => n.dragging);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (readOnly || dragging) return;
    onChangeRef.current?.(fromFlow(nodes, edges));
  }, [nodes, edges, dragging, readOnly]);

  const onNodesChange = useCallback(
    (changeset: NodeChangeset<FNode>) => {
      const changes = changeset.toArray();
      const removing = changes.some((c) => c.type === "remove");
      const dragStart = changes.some((c) => c.type === "position" && c.dragging) && !nodes.some((n) => n.dragging);
      if (removing || dragStart) remember();
      setNodes((ns) => changeset.applyTo(ns));
    },
    [nodes, remember],
  );

  const onEdgesChange = useCallback(
    (changeset: EdgeChangeset<FEdge>) => {
      if (changeset.toArray().some((c) => c.type === "remove")) remember();
      setEdges((es) => changeset.applyTo(es));
    },
    [remember],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      remember();
      const e = makeEdge(c.source, c.target, "", { sourceHandle: c.sourceHandle, targetHandle: c.targetHandle });
      setEdges((es) => [...es, ...toFlowEdges(kind, [e])]);
      // En mapas conceptuales, pedir de inmediato la palabra de enlace
      if (kind === "conceptmap")
        setTimeout(() => {
          setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)));
          setEdges((es) => es.map((x) => ({ ...x, selected: x.id === e.id })));
        }, 0);
    },
    [kind, remember],
  );

  const addShape = useCallback(
    (shape: Shape, pos?: { x: number; y: number }) => {
      remember();
      const rect = wrapRef.current?.getBoundingClientRect();
      const center = pos ?? rf.screenToFlowPosition({ x: (rect?.left ?? 0) + (rect?.width ?? 600) / 2, y: (rect?.top ?? 0) + (rect?.height ?? 400) / 2 });
      const offset = (nodes.length % 6) * 18;
      const n = makeNode(shape, center.x + offset, center.y + offset);
      setNodes((ns) => [...ns.map((x) => ({ ...x, selected: false })), { ...toFlowNodes([n])[0], selected: true }]);
      return n.id;
    },
    [rf, nodes.length, remember],
  );

  const commitLabel = useCallback(
    (id: string, label: string) => {
      const node = nodes.find((n) => n.id === id);
      if (!node || node.data.label === label) return;
      remember();
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)));
    },
    [nodes, remember],
  );

  const ctx = useMemo(() => ({ readOnly, editingId, setEditingId, commitLabel }), [readOnly, editingId, commitLabel]);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdge = edges.find((e) => e.selected) ?? null;

  function updateNodes(ids: string[], patch: Partial<NodeData>) {
    remember();
    setNodes((ns) => ns.map((n) => (ids.includes(n.id) ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function updateEdge(id: string, patch: Partial<DEdge>, record = true) {
    if (record) remember();
    setEdges((es) =>
      es.map((e) => {
        if (e.id !== id) return e;
        const cur: DEdge = {
          id: e.id,
          source: e.source,
          target: e.target,
          label: typeof e.label === "string" ? e.label : "",
          dashed: e.data?.dashed,
          arrow: e.data?.arrow,
          ...patch,
        };
        return { ...e, data: { dashed: cur.dashed, arrow: cur.arrow }, ...edgeStyle(kind, cur), selected: true };
      }),
    );
  }

  async function arrange(direction: "TB" | "LR") {
    remember();
    const d = await autoLayout(fromFlow(nodes, edges), direction);
    restore(d);
    setTimeout(() => rf.fitView({ padding: 0.15, duration: 400 }), 50);
  }

  async function toImage() {
    const { toPng } = await import("html-to-image");
    const bounds = getNodesBounds(nodes);
    const width = Math.min(3000, Math.max(800, Math.round(bounds.width + 120) * 2));
    const height = Math.round((width * (bounds.height + 120)) / (bounds.width + 120));
    const vp = getViewportForBounds(bounds, width, height, 0.2, 4, 0.06);
    const el = wrapRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!el) throw new Error("No se encontró el diagrama.");
    return toPng(el, {
      backgroundColor: "#ffffff",
      width,
      height,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
      filter: (n) => !(n instanceof HTMLElement && (n.classList?.contains("react-flow__handle") || n.classList?.contains("react-flow__resize-control"))),
    });
  }

  async function exportPng() {
    setExporting(true);
    try {
      const url = await toImage();
      downloadBlob(`${slugify(title || "diagrama")}.png`, await (await fetch(url)).blob());
    } catch (e) {
      window.alert(`No se pudo exportar: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  }

  async function print() {
    setExporting(true);
    try {
      setPrintImg(await toImage());
      setTimeout(printNow, 200);
    } catch (e) {
      window.alert(`No se pudo preparar la impresión: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  }

  // Atajos: deshacer / rehacer
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "F2" && selectedNodes.length === 1) {
        setEditingId(selectedNodes[0].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, undo, redo, selectedNodes]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const palette = PALETTE_SHAPES[kind];

  return (
    <div className={cn("grid gap-4", !readOnly && "lg:grid-cols-[180px_minmax(0,1fr)_260px]")}>
      {!readOnly && (
        <aside className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Agregar</div>
            <p className="mb-2 text-xs text-slate-500">Arrastra al lienzo o haz clic.</p>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {palette.map((s) => {
                const c = NODE_COLORS[makeNode(s, 0, 0).color];
                return (
                  <button
                    key={s}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("application/x-shape", s)}
                    onClick={() => addShape(s)}
                    title={SHAPE_INFO[s].hint}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-sm text-slate-700 hover:border-slate-400"
                  >
                    <span className="relative h-5 w-7 shrink-0">
                      <ShapeBackground shape={s} fill={c.fill} stroke={c.stroke} />
                    </span>
                    <span className="truncate">{SHAPE_INFO[s].label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5 border-t border-slate-200 pt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ordenar</div>
            <Button size="sm" variant="secondary" className="w-full justify-start" onClick={() => arrange("TB")} disabled={!nodes.length}>
              <ArrowDownToLine className="size-4" /> Vertical
            </Button>
            <Button size="sm" variant="secondary" className="w-full justify-start" onClick={() => arrange("LR")} disabled={!nodes.length}>
              <ArrowRightToLine className="size-4" /> Horizontal
            </Button>
          </div>
        </aside>
      )}

      <div
        ref={wrapRef}
        className={cn("relative overflow-hidden rounded-xl border border-slate-200 bg-white", fullscreen ? "h-screen rounded-none" : readOnly ? "h-[75vh]" : "h-[70vh] min-h-[460px]")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const s = e.dataTransfer.getData("application/x-shape") as Shape;
          if (!s) return;
          e.preventDefault();
          addShape(s, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
        }}
      >
        <EditCtx value={ctx}>
          <ReactFlow<FNode, FEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            connectionMode={ConnectionMode.Loose}
            connectionRadius={60}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
            zoomOnDoubleClick={false}
            onDoubleClick={(e) => {
              if (readOnly) return;
              const target = e.target as HTMLElement;
              if (!target.classList.contains("react-flow__pane")) return;
              const id = addShape(kind === "conceptmap" ? "concept" : "process", rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
              setTimeout(() => setEditingId(id), 30);
            }}
            defaultEdgeOptions={{ type: kind === "flowchart" ? "smoothstep" : "default" }}
            snapToGrid
            snapGrid={[10, 10]}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#d6ccf5" />
            <Controls showInteractive={false} position="bottom-right" />
            {!readOnly && nodes.length > 8 && <MiniMap pannable zoomable position="bottom-left" nodeColor={(n) => NODE_COLORS[(n.data as NodeData).color]?.stroke ?? "#6A11CB"} />}
          </ReactFlow>
        </EditCtx>
        <div className="absolute right-2 top-2 z-10 flex flex-wrap gap-1.5">
          {!readOnly && (
            <>
              <Button size="sm" variant="secondary" onClick={undo} disabled={!hist.past} aria-label="Deshacer" title="Deshacer (Ctrl+Z)">
                <Undo2 className="size-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={redo} disabled={!hist.future} aria-label="Rehacer" title="Rehacer (Ctrl+Y)">
                <Redo2 className="size-4" />
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={exportPng} disabled={exporting || !nodes.length}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PNG
          </Button>
          <Button size="sm" variant="secondary" onClick={print} disabled={exporting || !nodes.length}>
            <Printer className="size-4" /> <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : wrapRef.current?.requestFullscreen())}
            aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </Button>
        </div>
        {!readOnly && nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-400">Haz doble clic en el lienzo para agregar un elemento.</div>
        )}
      </div>

      {!readOnly && (
        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          {selectedNodes.length > 0 ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {selectedNodes.length === 1 ? SHAPE_INFO[selectedNodes[0].data.shape].label : `${selectedNodes.length} elementos`}
              </div>
              {selectedNodes.length === 1 && (
                <Field label="Texto" hint="También puedes hacer doble clic sobre la figura.">
                  <Textarea
                    key={selectedNodes[0].id}
                    rows={3}
                    defaultValue={selectedNodes[0].data.label}
                    onBlur={(e) => commitLabel(selectedNodes[0].id, e.target.value)}
                  />
                </Field>
              )}
              <Field label="Color">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(NODE_COLORS).map(([k, c]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => updateNodes(selectedNodes.map((n) => n.id), { color: k })}
                      className={cn("size-8 rounded-lg border-2", selectedNodes.every((n) => n.data.color === k) ? "ring-2 ring-violet-600 ring-offset-1" : "")}
                      style={{ background: c.fill, borderColor: c.stroke }}
                      title={c.name}
                      aria-label={`Color ${c.name}`}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Forma">
                <Select
                  value={selectedNodes.length === 1 ? selectedNodes[0].data.shape : ""}
                  onChange={(e) => e.target.value && updateNodes(selectedNodes.map((n) => n.id), { shape: e.target.value as Shape })}
                  className="h-9"
                >
                  {selectedNodes.length > 1 && <option value="">—</option>}
                  {(Object.keys(SHAPE_INFO) as Shape[])
                    .filter((s) => PALETTE_SHAPES[kind].includes(s) || (kind === "conceptmap" ? false : true))
                    .map((s) => (
                      <option key={s} value={s}>
                        {SHAPE_INFO[s].label}
                      </option>
                    ))}
                </Select>
              </Field>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  remember();
                  const ids = selectedNodes.map((n) => n.id);
                  setNodes((ns) => ns.filter((n) => !ids.includes(n.id)));
                  setEdges((es) => es.filter((e) => !ids.includes(e.source) && !ids.includes(e.target)));
                }}
              >
                <Trash2 className="size-4 text-red-600" /> Eliminar
              </Button>
            </>
          ) : selectedEdge ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conexión</div>
              <Field label={kind === "conceptmap" ? "Palabras de enlace" : "Etiqueta"} hint={kind === "conceptmap" ? "Ej. “se divide en”, “es”, “produce”." : "Ej. Sí / No."}>
                <Input
                  key={selectedEdge.id}
                  autoFocus
                  defaultValue={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                  onBlur={(e) => updateEdge(selectedEdge.id, { label: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="h-9"
                />
              </Field>
              {kind === "flowchart" && (
                <div className="flex gap-1.5">
                  {["Sí", "No"].map((l) => (
                    <Button key={l} size="sm" variant="secondary" onClick={() => updateEdge(selectedEdge.id, { label: l })}>
                      {l}
                    </Button>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" checked={selectedEdge.data?.arrow !== false} onChange={(e) => updateEdge(selectedEdge.id, { arrow: e.target.checked })} />
                Con flecha
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" checked={!!selectedEdge.data?.dashed} onChange={(e) => updateEdge(selectedEdge.id, { dashed: e.target.checked })} />
                Línea punteada
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  remember();
                  setEdges((es) => es.filter((e) => e.id !== selectedEdge.id));
                }}
              >
                <Trash2 className="size-4 text-red-600" /> Eliminar conexión
              </Button>
            </>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Cómo usarlo</p>
              <ul className="list-disc space-y-1.5 pl-4">
                <li>Doble clic en el lienzo: nuevo elemento.</li>
                <li>Doble clic en una figura: escribir su texto.</li>
                <li>Arrastra desde los puntos de una figura hasta otra para conectarlas.</li>
                <li>Selecciona una conexión para escribir {kind === "conceptmap" ? "las palabras de enlace" : "su etiqueta (Sí / No)"}.</li>
                <li>Supr borra lo seleccionado; Ctrl+Z deshace.</li>
                <li>Arrastra la rueda o usa los botones para hacer zoom.</li>
              </ul>
            </div>
          )}
        </aside>
      )}

      {printImg && (
        <PrintArea>
          <h1 style={{ fontSize: "18pt", fontWeight: 800, margin: "0 0 6mm" }}>{title}</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={printImg} alt="" style={{ maxWidth: "100%", maxHeight: "235mm", display: "block", margin: "0 auto" }} />
        </PrintArea>
      )}
    </div>
  );
}

export function DiagramTool(props: { kind: DiagramKind; data: DiagramData; onChange?: (d: DiagramData) => void; readOnly?: boolean; title: string }) {
  return (
    <ReactFlowProvider>
      <DiagramInner {...props} readOnly={!!props.readOnly} />
    </ReactFlowProvider>
  );
}
