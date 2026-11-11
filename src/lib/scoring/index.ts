// Cálculo de puntajes.
//
// 1. Cada criterio que puntúa se normaliza a un valor entre 0 y 1
//    (puntos obtenidos ÷ puntos máximos).
// 2. La calificación de una evaluación es el promedio ponderado de sus
//    criterios visibles, en escala de 0 a 100.
// 3. El puntaje final de un proyecto combina las evaluaciones con el método
//    del evento: promedio, suma o promedio recortado (sin la más alta y la más baja).

import type { Answers, FormField, ScoreMethod } from "@/lib/types";
import { isVisible } from "@/lib/fields/logic";
import { isScorable } from "@/lib/fields/types";

export interface FieldScore {
  fieldId: string;
  label: string;
  weight: number;
  /** 0–1, o null si el campo no tiene una escala válida. */
  normalized: number | null;
  points: number;
  maxPoints: number;
}

export interface SubmissionScore {
  /** 0–100 */
  total: number;
  fields: FieldScore[];
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Rango [min,max] → fracción. Si min ≥ 0 se mide contra el máximo (1 de 5 = 20 %). */
function rangeFraction(value: number, min: number, max: number) {
  if (max <= min) return null;
  if (min >= 0) return max > 0 ? clamp01(value / max) : null;
  return clamp01((value - min) / (max - min));
}

/** Puntos máximos posibles de un campo puntuable. */
export function maxPoints(field: FormField): number {
  const c = field.config ?? {};
  switch (field.type) {
    case "single_choice":
    case "dropdown":
    case "likert":
      return Math.max(0, ...(c.options ?? []).map((o) => Number(o.points) || 0));
    case "multiple_choice": {
      const positives = (c.options ?? []).map((o) => Number(o.points) || 0).filter((p) => p > 0);
      return positives.reduce((a, b) => a + b, 0);
    }
    case "linear_scale":
    case "number":
      return Number(c.max ?? 10);
    case "rating":
      return Number(c.max ?? 5);
    case "matrix": {
      const colMax = Math.max(0, ...(c.columns ?? []).map((o) => Number(o.points) || 0));
      return colMax * (c.rows?.length ?? 0);
    }
    case "yes_no":
      return Math.max(Number(c.yesPoints ?? 1), Number(c.noPoints ?? 0), 0);
    default:
      return 0;
  }
}

/** Puntos obtenidos y fracción normalizada de una respuesta. */
export function scoreField(field: FormField, value: unknown): { points: number; normalized: number | null } {
  const c = field.config ?? {};
  const max = maxPoints(field);
  switch (field.type) {
    case "single_choice":
    case "dropdown":
    case "likert": {
      const opt = (c.options ?? []).find((o) => o.id === value);
      const pts = opt ? Number(opt.points) || 0 : 0;
      return { points: pts, normalized: max > 0 ? clamp01(pts / max) : null };
    }
    case "multiple_choice": {
      const selected = Array.isArray(value) ? value : [];
      const pts = (c.options ?? [])
        .filter((o) => selected.includes(o.id))
        .reduce((a, o) => a + (Number(o.points) || 0), 0);
      return { points: pts, normalized: max > 0 ? clamp01(pts / max) : null };
    }
    case "linear_scale":
    case "number": {
      const v = num(value);
      const min = Number(c.min ?? 0);
      const mx = Number(c.max ?? 10);
      if (v === null) return { points: 0, normalized: mx > min ? 0 : null };
      return { points: v, normalized: rangeFraction(v, min, mx) };
    }
    case "rating": {
      const v = num(value) ?? 0;
      return { points: v, normalized: max > 0 ? clamp01(v / max) : null };
    }
    case "matrix": {
      const rows = c.rows ?? [];
      const cols = c.columns ?? [];
      const colMax = Math.max(0, ...cols.map((o) => Number(o.points) || 0));
      if (!rows.length || colMax <= 0) return { points: 0, normalized: null };
      const ans = (value && typeof value === "object" ? value : {}) as Record<string, string>;
      const pts = rows.reduce((a, r) => a + (Number(cols.find((o) => o.id === ans[r.id])?.points) || 0), 0);
      return { points: pts, normalized: clamp01(pts / (colMax * rows.length)) };
    }
    case "yes_no": {
      const pts = value === true ? Number(c.yesPoints ?? 1) : value === false ? Number(c.noPoints ?? 0) : 0;
      return { points: pts, normalized: max > 0 ? clamp01(pts / max) : null };
    }
    default:
      return { points: 0, normalized: null };
  }
}

/** Campos que cuentan para el puntaje. */
export function scoredFields(fields: FormField[]) {
  return fields.filter((f) => f.scored && isScorable(f.type));
}

/** Calificación (0–100) de una evaluación, con desglose por criterio. */
export function scoreSubmission(fields: FormField[], answers: Answers): SubmissionScore {
  const scored = scoredFields(fields).filter((f) => isVisible(f, fields, answers));
  const results: FieldScore[] = scored.map((f) => {
    const { points, normalized } = scoreField(f, answers[f.id]);
    return {
      fieldId: f.id,
      label: f.label,
      weight: Number(f.weight) || 0,
      normalized,
      points,
      maxPoints: maxPoints(f),
    };
  });
  const valid = results.filter((r) => r.normalized !== null);
  const allZero = valid.every((r) => r.weight <= 0);
  const weightOf = (r: FieldScore) => (allZero ? 1 : Math.max(0, r.weight));
  const totalWeight = valid.reduce((a, r) => a + weightOf(r), 0);
  const total = totalWeight > 0 ? (valid.reduce((a, r) => a + weightOf(r) * (r.normalized ?? 0), 0) / totalWeight) * 100 : 0;
  return { total: round2(total), fields: results };
}

/** Combina las calificaciones de varios evaluadores. */
export function aggregate(scores: number[], method: ScoreMethod): number | null {
  if (!scores.length) return null;
  if (method === "sum") return round2(scores.reduce((a, b) => a + b, 0));
  let list = scores;
  if (method === "trimmed" && scores.length >= 3) {
    list = [...scores].sort((a, b) => a - b).slice(1, -1);
  }
  return round2(list.reduce((a, b) => a + b, 0) / list.length);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Suma de ponderaciones de los campos que puntúan. */
export function totalWeight(fields: FormField[]) {
  return round2(scoredFields(fields).reduce((a, f) => a + (Number(f.weight) || 0), 0));
}
