// Mapas conceptuales y diagramas de flujo (formato guardado en teacher_tools.data)

export type Shape =
  | "concept"
  | "main"
  | "terminal"
  | "process"
  | "decision"
  | "io"
  | "document"
  | "subprocess"
  | "connector"
  | "note";

export type DiagramKind = "conceptmap" | "flowchart";

export interface DNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: Shape;
  label: string;
  color: string;
}

export interface DEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label: string;
  dashed?: boolean;
  arrow?: boolean;
}

export interface DiagramData {
  nodes: DNode[];
  edges: DEdge[];
}

export const SHAPE_INFO: Record<Shape, { label: string; w: number; h: number; hint: string }> = {
  concept: { label: "Concepto", w: 170, h: 60, hint: "Idea o concepto" },
  main: { label: "Concepto principal", w: 210, h: 76, hint: "Tema central del mapa" },
  terminal: { label: "Inicio / Fin", w: 150, h: 54, hint: "Donde empieza o termina el proceso" },
  process: { label: "Proceso", w: 170, h: 64, hint: "Una acción o paso" },
  decision: { label: "Decisión", w: 170, h: 110, hint: "Pregunta con respuestas Sí / No" },
  io: { label: "Entrada / Salida", w: 180, h: 64, hint: "Datos que entran o salen" },
  document: { label: "Documento", w: 170, h: 74, hint: "Un documento o reporte" },
  subprocess: { label: "Subproceso", w: 180, h: 64, hint: "Proceso definido en otro lugar" },
  connector: { label: "Conector", w: 56, h: 56, hint: "Une partes del diagrama" },
  note: { label: "Nota", w: 170, h: 80, hint: "Comentario o aclaración" },
};

export const PALETTE_SHAPES: Record<DiagramKind, Shape[]> = {
  conceptmap: ["main", "concept", "note"],
  flowchart: ["terminal", "process", "decision", "io", "document", "subprocess", "connector", "note"],
};

export const NODE_COLORS: Record<string, { name: string; fill: string; stroke: string; text: string }> = {
  violeta: { name: "Morado", fill: "#EDE9FE", stroke: "#6A11CB", text: "#2B0A5A" },
  morado: { name: "Morado intenso", fill: "#6A11CB", stroke: "#4A0C8F", text: "#FFFFFF" },
  turquesa: { name: "Turquesa", fill: "#C2F5EE", stroke: "#00A891", text: "#04352E" },
  amarillo: { name: "Amarillo", fill: "#FFF1C7", stroke: "#E0A800", text: "#4A3500" },
  coral: { name: "Coral", fill: "#FFE1E8", stroke: "#FF6B8A", text: "#5C0F22" },
  lila: { name: "Lila", fill: "#F3E8FF", stroke: "#A855F7", text: "#3B0764" },
  blanco: { name: "Blanco", fill: "#FFFFFF", stroke: "#475569", text: "#0F172A" },
  gris: { name: "Gris", fill: "#F1F5F9", stroke: "#94A3B8", text: "#0F172A" },
};

export const DEFAULT_COLOR: Record<Shape, string> = {
  main: "morado",
  concept: "violeta",
  note: "amarillo",
  terminal: "turquesa",
  process: "violeta",
  decision: "amarillo",
  io: "lila",
  document: "coral",
  subprocess: "violeta",
  connector: "gris",
};

const rid = () => Math.random().toString(36).slice(2, 10);

export function makeNode(shape: Shape, x: number, y: number, label?: string): DNode {
  const s = SHAPE_INFO[shape];
  return { id: rid(), x: x - s.w / 2, y: y - s.h / 2, w: s.w, h: s.h, shape, label: label ?? (shape === "connector" ? "A" : s.label), color: DEFAULT_COLOR[shape] };
}

export function makeEdge(source: string, target: string, label = "", extra: Partial<DEdge> = {}): DEdge {
  return { id: rid(), source, target, label, arrow: true, sourceHandle: "b", targetHandle: "t", ...extra };
}

export function defaultDiagram(kind: DiagramKind): DiagramData {
  if (kind === "conceptmap") {
    const main = makeNode("main", 400, 60, "Tema principal");
    const a = makeNode("concept", 200, 240, "Concepto A");
    const b = makeNode("concept", 600, 240, "Concepto B");
    return { nodes: [main, a, b], edges: [makeEdge(main.id, a.id, "se divide en"), makeEdge(main.id, b.id, "incluye")] };
  }
  const start = makeNode("terminal", 300, 40, "Inicio");
  const step = makeNode("process", 300, 160, "Paso 1");
  const q = makeNode("decision", 300, 310, "¿Se cumple?");
  const yes = makeNode("process", 300, 470, "Paso 2");
  const no = makeNode("process", 560, 310, "Corregir");
  const end = makeNode("terminal", 300, 590, "Fin");
  return {
    nodes: [start, step, q, yes, no, end],
    edges: [
      makeEdge(start.id, step.id),
      makeEdge(step.id, q.id),
      makeEdge(q.id, yes.id, "Sí"),
      makeEdge(q.id, no.id, "No", { sourceHandle: "r", targetHandle: "l" }),
      makeEdge(no.id, step.id, "", { sourceHandle: "t", targetHandle: "r" }),
      makeEdge(yes.id, end.id),
    ],
  };
}

/** Acomoda el diagrama en niveles (de arriba hacia abajo o de izquierda a derecha). */
export async function autoLayout(d: DiagramData, direction: "TB" | "LR"): Promise<DiagramData> {
  const dagre = (await import("@dagrejs/dagre")).default;
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  d.nodes.forEach((n) => g.setNode(n.id, { width: n.w, height: n.h }));
  d.edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  const nodes = d.nodes.map((n) => {
    const p = g.node(n.id);
    return p ? { ...n, x: Math.round(p.x - n.w / 2), y: Math.round(p.y - n.h / 2) } : n;
  });
  // Al reacomodar, quitar puntos de conexión forzados para que las flechas tomen el camino natural
  const handles = direction === "TB" ? { sourceHandle: "b", targetHandle: "t" } : { sourceHandle: "r", targetHandle: "l" };
  return { nodes, edges: d.edges.map((e) => ({ ...e, ...handles })) };
}
