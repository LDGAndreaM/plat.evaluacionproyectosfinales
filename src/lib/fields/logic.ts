import type { Answers, FormField } from "@/lib/types";
import { isLayout } from "./types";

export function isAnswered(field: Pick<FormField, "type">, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    if (field.type === "file") return !!(value as { path?: string }).path;
    return Object.keys(value as object).length > 0;
  }
  return false;
}

/** Texto comparable de una respuesta, para la lógica condicional. */
function comparable(field: FormField | undefined, value: unknown): string[] {
  if (!field || value === undefined || value === null) return [];
  if (typeof value === "boolean") return [value ? "yes" : "no"];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

/** ¿Debe mostrarse el campo según su lógica condicional? */
export function isVisible(field: FormField, fields: FormField[], answers: Answers, depth = 0): boolean {
  const logic = field.logic;
  if (!logic?.fieldId || depth > 20) return true;
  const source = fields.find((f) => f.id === logic.fieldId);
  if (!source) return true;
  // Si la pregunta de la que depende está oculta, este campo también.
  if (!isVisible(source, fields, answers, depth + 1)) return false;
  const value = answers[source.id];
  const vals = comparable(source, value);
  const target = logic.value ?? "";
  switch (logic.operator) {
    case "answered":
      return isAnswered(source, value);
    case "not_answered":
      return !isAnswered(source, value);
    case "equals":
      return vals.length === 1 && vals[0] === target;
    case "not_equals":
      return !(vals.length === 1 && vals[0] === target);
    case "includes":
      return vals.includes(target);
    default:
      return true;
  }
}

/** Campos que pueden servir como condición para `field` (los anteriores con respuesta). */
export function logicSources(field: FormField, fields: FormField[]) {
  const idx = fields.findIndex((f) => f.id === field.id);
  return fields.slice(0, idx).filter((f) => !isLayout(f.type) && !["signature", "file"].includes(f.type));
}

/** Opciones posibles de valor para la condición, según el tipo del campo fuente. */
export function logicValueOptions(source: FormField): { value: string; label: string }[] | null {
  const c = source.config;
  switch (source.type) {
    case "single_choice":
    case "dropdown":
    case "likert":
    case "multiple_choice":
      return (c.options ?? []).map((o) => ({ value: o.id, label: o.label }));
    case "yes_no":
      return [
        { value: "yes", label: c.yesLabel || "Sí" },
        { value: "no", label: c.noLabel || "No" },
      ];
    case "rating": {
      const max = c.max ?? 5;
      return Array.from({ length: max }, (_, i) => ({ value: String(i + 1), label: `${i + 1} estrellas` }));
    }
    default:
      return null;
  }
}

/** Divide los campos en páginas usando los saltos de página. */
export function splitPages(fields: FormField[]): FormField[][] {
  const pages: FormField[][] = [[]];
  for (const f of fields) {
    if (f.type === "page_break") {
      if (pages[pages.length - 1].length) pages.push([]);
    } else pages[pages.length - 1].push(f);
  }
  return pages.filter((p, i) => p.length || i === 0);
}
