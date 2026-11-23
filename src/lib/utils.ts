import { twMerge } from "tailwind-merge";
import type { EventStatus, ScoreMethod } from "@/lib/types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(" "));
}

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Borrador",
  open: "Abierto",
  closed: "Cerrado",
  published: "Resultados publicados",
};

export const STATUS_DESCRIPTIONS: Record<EventStatus, string> = {
  draft: "Solo tú lo ves. Prepara proyectos y formularios.",
  open: "Los evaluadores pueden escanear el QR y calificar.",
  closed: "Ya no se aceptan evaluaciones nuevas ni cambios.",
  published: "Los resultados se pueden proyectar en la premiación.",
};

export const STATUS_ORDER: EventStatus[] = ["draft", "open", "closed", "published"];

export const SCORE_METHOD_LABELS: Record<ScoreMethod, string> = {
  average: "Promedio de evaluadores",
  sum: "Suma total",
  trimmed: "Promedio sin la calificación más alta y la más baja",
};

/** Acepta "AAAA-MM-DD" (fecha sin hora) o una marca de tiempo completa (se muestra en hora de Sonora). */
export function formatDate(date: string | null | undefined) {
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(y, m - 1, d));
  }
  const t = new Date(date);
  if (Number.isNaN(t.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Hermosillo" }).format(t);
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Color de texto legible (blanco/negro) sobre un color de fondo hex. */
export function readableTextColor(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? "#111827" : "#ffffff";
}

/** "7" o "7°" → "7° semestre"; cualquier otro texto se muestra tal cual. */
export function semesterLabel(value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (!v) return "";
  const m = v.match(/^(\d{1,2})\s*(°|º|o)?$/i);
  return m ? `${m[1]}° semestre` : v;
}

export const SEMESTER_SUGGESTIONS = ["1°", "2°", "3°", "4°", "5°", "6°", "7°", "8°", "9°", "10°"];

/** Semestres distintos presentes en una lista de proyectos, en orden natural. */
export function semestersOf(projects: { semester?: string | null }[]) {
  const collator = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });
  return [...new Set(projects.map((p) => (p.semester ?? "").trim()).filter(Boolean))].sort(collator.compare);
}

export function uid() {
  return crypto.randomUUID();
}

/** Colores por semestre (fondo claro + texto oscuro legible). 1° a 10°; otros textos se asignan por hash. */
const SEMESTER_COLORS = [
  { bg: "#EDE9FE", fg: "#5A0EAE", dot: "#6A11CB" }, // 1° morado
  { bg: "#C2F5EE", fg: "#006B5D", dot: "#00A891" }, // 2° turquesa
  { bg: "#FFE4EA", fg: "#B4234A", dot: "#FF6B8A" }, // 3° coral
  { bg: "#FFF1C7", fg: "#8A5A00", dot: "#FFC93C" }, // 4° amarillo
  { bg: "#DBEAFE", fg: "#1E4FB8", dot: "#3B82F6" }, // 5° azul
  { bg: "#F3E8FF", fg: "#7E22CE", dot: "#A855F7" }, // 6° lila
  { bg: "#DCFCE7", fg: "#166534", dot: "#22C55E" }, // 7° verde
  { bg: "#FFEDD5", fg: "#9A3412", dot: "#F97316" }, // 8° naranja
  { bg: "#E0F2FE", fg: "#075985", dot: "#0EA5E9" }, // 9° celeste
  { bg: "#FCE7F3", fg: "#9D174D", dot: "#EC4899" }, // 10° rosa
];

export function semesterColor(value: string | null | undefined) {
  const v = (value ?? "").trim();
  const m = v.match(/^(\d{1,2})/);
  let i: number;
  if (m) i = (Number(m[1]) - 1) % SEMESTER_COLORS.length;
  else {
    let h = 0;
    for (const ch of v) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    i = h % SEMESTER_COLORS.length;
  }
  return SEMESTER_COLORS[Math.max(0, i)];
}
