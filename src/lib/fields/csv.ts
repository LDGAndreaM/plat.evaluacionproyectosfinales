// Importar y exportar las preguntas de un formulario en CSV (compatible con Excel).
//
// Una fila = una pregunta. Las listas (opciones, puntos, filas) se separan con "|".

import Papa from "papaparse";
import type { FormField } from "@/lib/types";
import { fieldTypeInfo, shortId } from "./registry";
import type { ChoiceOption, FieldConfig, FieldType } from "./types";
import { isScorable } from "./types";

export const CSV_COLUMNS = [
  "tipo",
  "pregunta",
  "descripcion",
  "obligatoria",
  "puntua",
  "ponderacion",
  "opciones",
  "puntos",
  "filas",
  "minimo",
  "maximo",
  "etiqueta_minimo",
  "etiqueta_maximo",
] as const;

type Column = (typeof CSV_COLUMNS)[number];
type Row = Partial<Record<Column, string>>;

/** Nombre del tipo en el CSV (el que usa la plantilla) */
export const CSV_TYPE_NAMES: { key: string; type: FieldType; mode?: FieldConfig["mode"]; note: string }[] = [
  { key: "texto_corto", type: "short_text", note: "Respuesta de una línea" },
  { key: "parrafo", type: "long_text", note: "Texto largo, ej. comentarios" },
  { key: "numero", type: "number", note: "Usa minimo y maximo" },
  { key: "opcion_multiple", type: "single_choice", note: "Elegir una opción; usa opciones y puntos" },
  { key: "casillas", type: "multiple_choice", note: "Elegir varias; usa opciones y puntos" },
  { key: "lista", type: "dropdown", note: "Lista desplegable; usa opciones y puntos" },
  { key: "si_no", type: "yes_no", note: "Opciones opcionales: Sí|No y puntos 1|0" },
  { key: "fecha", type: "datetime", mode: "date", note: "Solo fecha" },
  { key: "hora", type: "datetime", mode: "time", note: "Solo hora" },
  { key: "fecha_hora", type: "datetime", mode: "datetime", note: "Fecha y hora" },
  { key: "likert", type: "likert", note: "Niveles en opciones; puntos 1|2|3… si se omiten" },
  { key: "escala", type: "linear_scale", note: "Rango con minimo y maximo, ej. 0 a 10" },
  { key: "estrellas", type: "rating", note: "maximo = número de estrellas (3 a 10)" },
  { key: "matriz", type: "matrix", note: "filas = criterios; opciones = niveles de la escala" },
  { key: "firma", type: "signature", note: "Firma dibujada en pantalla" },
  { key: "archivo", type: "file", note: "Foto o archivo" },
  { key: "titulo", type: "section_title", note: "Título de sección (no es pregunta)" },
  { key: "texto_descriptivo", type: "paragraph", note: "Instrucciones (no es pregunta)" },
  { key: "imagen", type: "image", note: "Pon la dirección (URL) de la imagen en opciones" },
  { key: "separador", type: "divider", note: "Línea divisoria" },
  { key: "salto_de_pagina", type: "page_break", note: "Divide el formulario en pasos" },
];

const TYPE_ALIASES: Record<string, { type: FieldType; mode?: FieldConfig["mode"]; accept?: string }> = {
  texto: { type: "short_text" },
  respuesta_corta: { type: "short_text" },
  short_text: { type: "short_text" },
  texto_largo: { type: "long_text" },
  comentarios: { type: "long_text" },
  long_text: { type: "long_text" },
  number: { type: "number" },
  opcion: { type: "single_choice" },
  una_opcion: { type: "single_choice" },
  radio: { type: "single_choice" },
  single_choice: { type: "single_choice" },
  varias_opciones: { type: "multiple_choice" },
  checkbox: { type: "multiple_choice" },
  multiple_choice: { type: "multiple_choice" },
  lista_desplegable: { type: "dropdown" },
  desplegable: { type: "dropdown" },
  dropdown: { type: "dropdown" },
  sino: { type: "yes_no" },
  yes_no: { type: "yes_no" },
  fecha_y_hora: { type: "datetime", mode: "datetime" },
  escala_likert: { type: "likert" },
  escala_lineal: { type: "linear_scale" },
  slider: { type: "linear_scale" },
  linear_scale: { type: "linear_scale" },
  rating: { type: "rating" },
  calificacion_con_estrellas: { type: "rating" },
  rubrica: { type: "matrix" },
  cuadricula: { type: "matrix" },
  matriz_rubrica: { type: "matrix" },
  matrix: { type: "matrix" },
  signature: { type: "signature" },
  foto: { type: "file", accept: "image" },
  archivo_o_foto: { type: "file" },
  file: { type: "file" },
  seccion: { type: "section_title" },
  titulo_de_seccion: { type: "section_title" },
  instrucciones: { type: "paragraph" },
  image: { type: "image" },
  linea: { type: "divider" },
  salto_pagina: { type: "page_break" },
  nueva_pagina: { type: "page_break" },
  pagina: { type: "page_break" },
};

export function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s/\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function resolveType(raw: string) {
  const key = normalizeKey(raw);
  const main = CSV_TYPE_NAMES.find((t) => t.key === key);
  if (main) return { type: main.type, mode: main.mode, accept: undefined as string | undefined };
  if (TYPE_ALIASES[key]) return { mode: undefined, accept: undefined, ...TYPE_ALIASES[key] };
  // También acepta el nombre que se ve en la plataforma ("Escala Likert", "Sí / No"…)
  const byLabel = CSV_TYPE_NAMES.find((t) => normalizeKey(fieldTypeInfo(t.type).label) === key);
  if (byLabel) return { type: byLabel.type, mode: byLabel.mode, accept: undefined };
  return null;
}

function yes(value: string | undefined) {
  return ["si", "s", "x", "1", "true", "verdadero", "yes", "obligatoria"].includes(normalizeKey(value ?? ""));
}

function list(value: string | undefined) {
  return (value ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const clean = value.replace("%", "").replace(",", ".").trim();
  if (clean === "") return undefined;
  const n = Number(clean);
  return Number.isFinite(n) ? n : NaN;
}

export interface CsvIssue {
  row: number;
  message: string;
  level: "error" | "warning";
}

export interface CsvParseResult {
  fields: FormField[];
  issues: CsvIssue[];
}

function buildOptions(
  labels: string[],
  pointsRaw: string | undefined,
  defaultPoints: (i: number) => number,
  row: number,
  issues: CsvIssue[],
): ChoiceOption[] | null {
  const pts = list(pointsRaw).map((p) => toNumber(p));
  if (pts.length && pts.length !== labels.length) {
    issues.push({
      row,
      level: "error",
      message: `Hay ${labels.length} opciones pero ${pts.length} puntos. Deben coincidir.`,
    });
    return null;
  }
  if (pts.some((p) => p === undefined || Number.isNaN(p))) {
    issues.push({ row, level: "error", message: "Los puntos deben ser números separados con |, ej. 1|2|3." });
    return null;
  }
  return labels.map((label, i) => ({ id: shortId(), label, points: pts.length ? (pts[i] as number) : defaultPoints(i) }));
}

/** Convierte las filas del CSV en campos del formulario. */
export function rowsToFields(rows: Row[], formId: string): CsvParseResult {
  const issues: CsvIssue[] = [];
  const fields: FormField[] = [];

  rows.forEach((r, i) => {
    const rowNum = i + 2; // fila 1 = encabezados
    const rawType = (r.tipo ?? "").trim();
    const label = (r.pregunta ?? "").trim();
    if (!rawType && !label) return;
    if (!rawType) {
      issues.push({ row: rowNum, level: "error", message: `Falta el tipo de “${label}”.` });
      return;
    }
    const resolved = resolveType(rawType);
    if (!resolved) {
      issues.push({ row: rowNum, level: "error", message: `Tipo “${rawType}” no reconocido. Revisa la guía de tipos.` });
      return;
    }
    const { type } = resolved;
    const options = list(r.opciones);
    const config: FieldConfig = {};
    const min = toNumber(r.minimo);
    const max = toNumber(r.maximo);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      issues.push({ row: rowNum, level: "error", message: "minimo y maximo deben ser números." });
      return;
    }

    switch (type) {
      case "single_choice":
      case "dropdown":
      case "multiple_choice": {
        if (options.length < 2) {
          issues.push({ row: rowNum, level: "error", message: "Escribe al menos 2 opciones separadas con |." });
          return;
        }
        const built = buildOptions(options, r.puntos, (n) => (type === "multiple_choice" ? 1 : n + 1), rowNum, issues);
        if (!built) return;
        config.options = built;
        break;
      }
      case "likert": {
        const labels = options.length ? options : ["Deficiente", "Regular", "Bueno", "Muy bueno", "Excelente"];
        const built = buildOptions(labels, r.puntos, (n) => n + 1, rowNum, issues);
        if (!built) return;
        config.options = built;
        break;
      }
      case "matrix": {
        const rowsList = list(r.filas);
        if (!rowsList.length) {
          issues.push({ row: rowNum, level: "error", message: "La matriz necesita filas (criterios) separadas con |." });
          return;
        }
        const labels = options.length ? options : ["Insuficiente", "Suficiente", "Bueno", "Sobresaliente"];
        const built = buildOptions(labels, r.puntos, (n) => n + 1, rowNum, issues);
        if (!built) return;
        config.rows = rowsList.map((l) => ({ id: shortId(), label: l }));
        config.columns = built;
        break;
      }
      case "linear_scale":
        config.min = min ?? 0;
        config.max = max ?? 10;
        config.step = 1;
        config.minLabel = r.etiqueta_minimo?.trim() || undefined;
        config.maxLabel = r.etiqueta_maximo?.trim() || undefined;
        if (config.max <= config.min) {
          issues.push({ row: rowNum, level: "error", message: "En la escala, maximo debe ser mayor que minimo." });
          return;
        }
        break;
      case "number":
        config.min = min;
        config.max = max;
        config.step = 1;
        break;
      case "rating": {
        const stars = max ?? 5;
        config.max = Math.min(10, Math.max(3, Math.round(stars)));
        if (config.max !== stars)
          issues.push({ row: rowNum, level: "warning", message: `Estrellas ajustadas a ${config.max} (se permiten de 3 a 10).` });
        break;
      }
      case "yes_no": {
        const pts = list(r.puntos).map((p) => toNumber(p));
        config.yesLabel = options[0] || "Sí";
        config.noLabel = options[1] || "No";
        config.yesPoints = pts[0] !== undefined && !Number.isNaN(pts[0]) ? pts[0] : 1;
        config.noPoints = pts[1] !== undefined && !Number.isNaN(pts[1]) ? pts[1] : 0;
        break;
      }
      case "datetime":
        config.mode = resolved.mode ?? "date";
        break;
      case "file":
        config.accept = resolved.accept ?? "image";
        break;
      case "image":
        config.url = options.find((o) => /^https?:\/\//i.test(o)) ?? "";
        if (!config.url)
          issues.push({ row: rowNum, level: "warning", message: "Imagen sin dirección: súbela después desde el constructor." });
        break;
      case "short_text":
      case "long_text":
        if (options[0]) config.placeholder = options[0];
        break;
    }

    const wantsScore = yes(r.puntua);
    const scored = wantsScore && isScorable(type);
    if (wantsScore && !isScorable(type))
      issues.push({ row: rowNum, level: "warning", message: `“${fieldTypeInfo(type).label}” no puede contar para el puntaje; se ignoró.` });
    const weight = toNumber(r.ponderacion);
    if (Number.isNaN(weight)) {
      issues.push({ row: rowNum, level: "error", message: "La ponderación debe ser un número, ej. 25." });
      return;
    }

    const layout = ["section_title", "paragraph", "image", "divider", "page_break"].includes(type);
    if (!layout && type !== "page_break" && !label)
      issues.push({ row: rowNum, level: "warning", message: "Pregunta sin texto." });

    fields.push({
      id: crypto.randomUUID(),
      form_id: formId,
      position: fields.length,
      type,
      label: type === "paragraph" ? label || (r.descripcion ?? "").trim() : label,
      help: type === "paragraph" ? null : (r.descripcion ?? "").trim() || null,
      required: !layout && yes(r.obligatoria),
      scored,
      weight: scored ? Math.max(0, weight ?? 0) : 0,
      config,
      logic: null,
    });
  });

  // Si ningún criterio trae ponderación, repartir en partes iguales
  const scored = fields.filter((f) => f.scored);
  if (scored.length && scored.every((f) => !f.weight)) {
    const each = Math.floor((100 / scored.length) * 100) / 100;
    scored.forEach((f, i) => {
      f.weight = i === scored.length - 1 ? Math.round((100 - each * (scored.length - 1)) * 100) / 100 : each;
    });
  }

  return { fields, issues };
}

/** Lee el texto de un archivo CSV (coma o punto y coma) y lo convierte en campos. */
export function parseFormCsv(text: string, formId: string): CsvParseResult {
  const parsed = Papa.parse<Row>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => normalizeKey(h),
  });
  const headers = (parsed.meta.fields ?? []) as string[];
  if (!headers.includes("tipo") || !headers.includes("pregunta")) {
    return {
      fields: [],
      issues: [
        {
          row: 1,
          level: "error",
          message: "El archivo debe tener al menos las columnas “tipo” y “pregunta”. Descarga la plantilla para ver el formato.",
        },
      ],
    };
  }
  return rowsToFields(parsed.data, formId);
}

/** Exporta los campos a CSV con el mismo formato de la plantilla. */
export function fieldsToCsv(fields: FormField[]): string {
  const keyFor = (f: FormField) =>
    f.type === "datetime"
      ? f.config.mode === "time"
        ? "hora"
        : f.config.mode === "datetime"
          ? "fecha_hora"
          : "fecha"
      : (CSV_TYPE_NAMES.find((t) => t.type === f.type)?.key ?? f.type);

  const rows = fields.map((f) => {
    const c = f.config ?? {};
    const row: Record<Column, string> = {
      tipo: keyFor(f),
      pregunta: f.label ?? "",
      descripcion: f.help ?? "",
      obligatoria: f.required ? "si" : "no",
      puntua: f.scored ? "si" : "no",
      ponderacion: f.scored ? String(f.weight) : "",
      opciones: "",
      puntos: "",
      filas: "",
      minimo: "",
      maximo: "",
      etiqueta_minimo: "",
      etiqueta_maximo: "",
    };
    switch (f.type) {
      case "single_choice":
      case "dropdown":
      case "multiple_choice":
      case "likert":
        row.opciones = (c.options ?? []).map((o) => o.label).join("|");
        row.puntos = (c.options ?? []).map((o) => o.points).join("|");
        break;
      case "matrix":
        row.filas = (c.rows ?? []).map((r) => r.label).join("|");
        row.opciones = (c.columns ?? []).map((o) => o.label).join("|");
        row.puntos = (c.columns ?? []).map((o) => o.points).join("|");
        break;
      case "yes_no":
        row.opciones = `${c.yesLabel || "Sí"}|${c.noLabel || "No"}`;
        row.puntos = `${c.yesPoints ?? 1}|${c.noPoints ?? 0}`;
        break;
      case "linear_scale":
        row.minimo = String(c.min ?? 0);
        row.maximo = String(c.max ?? 10);
        row.etiqueta_minimo = c.minLabel ?? "";
        row.etiqueta_maximo = c.maxLabel ?? "";
        break;
      case "number":
        row.minimo = c.min !== undefined ? String(c.min) : "";
        row.maximo = c.max !== undefined ? String(c.max) : "";
        break;
      case "rating":
        row.maximo = String(c.max ?? 5);
        break;
      case "image":
        row.opciones = c.url ?? "";
        break;
      case "short_text":
      case "long_text":
        row.opciones = c.placeholder ?? "";
        break;
    }
    return row;
  });
  return "﻿" + Papa.unparse({ fields: [...CSV_COLUMNS], data: rows.map((r) => CSV_COLUMNS.map((c) => r[c])) });
}

const LIKERT = "Deficiente|Regular|Bueno|Muy bueno|Excelente";

/** Plantilla de ejemplo para descargar y llenar en Excel. */
export function templateCsv(): string {
  const data: string[][] = [
    ["titulo", "Criterios de evaluación", "Selecciona el nivel que mejor describe el proyecto.", "", "", "", "", "", "", "", "", "", ""],
    ["likert", "Creatividad", "Originalidad de la propuesta y soluciones visuales poco convencionales.", "si", "si", "25", LIKERT, "1|2|3|4|5", "", "", "", "", ""],
    ["likert", "Concepto", "Claridad de la idea rectora y coherencia con el problema planteado.", "si", "si", "20", LIKERT, "1|2|3|4|5", "", "", "", "", ""],
    ["likert", "Ejecución técnica", "Calidad de acabados, dominio de herramientas y cuidado en los detalles.", "si", "si", "25", LIKERT, "1|2|3|4|5", "", "", "", "", ""],
    ["likert", "Presentación", "Claridad y seguridad del equipo al exponer; calidad del montaje del stand.", "si", "si", "15", LIKERT, "1|2|3|4|5", "", "", "", "", ""],
    ["likert", "Viabilidad", "Posibilidad real de implementarse con el público o cliente objetivo.", "si", "si", "15", LIKERT, "1|2|3|4|5", "", "", "", "", ""],
    ["salto_de_pagina", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["titulo", "Preguntas adicionales", "Estas preguntas no cuentan para el puntaje.", "", "", "", "", "", "", "", "", "", ""],
    ["si_no", "¿El equipo entregó su memoria descriptiva?", "", "si", "no", "", "Sí|No", "", "", "", "", "", ""],
    ["opcion_multiple", "¿Qué tan clara fue la exposición oral?", "", "no", "no", "", "Poco clara|Clara|Muy clara", "", "", "", "", "", ""],
    ["matriz", "Montaje del stand", "Ejemplo de rúbrica en cuadrícula.", "no", "no", "", "Insuficiente|Suficiente|Bueno|Sobresaliente", "1|2|3|4", "Orden|Señalética|Materiales de apoyo", "", "", "", ""],
    ["escala", "Del 0 al 10, ¿recomendarías este proyecto?", "", "no", "no", "", "", "", "", "0", "10", "Nada", "Totalmente"],
    ["estrellas", "Calificación general", "", "no", "no", "", "", "", "", "", "5", "", ""],
    ["parrafo", "Comentarios para el equipo", "Fortalezas y áreas de mejora.", "no", "no", "", "Escribe tu retroalimentación…", "", "", "", "", "", ""],
  ];
  return "﻿" + Papa.unparse({ fields: [...CSV_COLUMNS], data });
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
