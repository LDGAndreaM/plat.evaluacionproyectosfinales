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

export function formatDate(date: string | null | undefined) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(y, m - 1, d));
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

export function uid() {
  return crypto.randomUUID();
}
