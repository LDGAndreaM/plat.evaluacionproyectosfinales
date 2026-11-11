import type { ChoiceOption, FieldConfig, FieldType } from "./types";
import type { FormField } from "@/lib/types";

export type FieldGroup = "Preguntas" | "Escalas y rúbricas" | "Firma y archivos" | "Diseño";

export interface FieldTypeInfo {
  type: FieldType;
  label: string;
  description: string;
  group: FieldGroup;
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  { type: "short_text", label: "Texto corto", description: "Una línea de texto", group: "Preguntas" },
  { type: "long_text", label: "Párrafo", description: "Texto largo, ideal para comentarios", group: "Preguntas" },
  { type: "number", label: "Número", description: "Valor numérico", group: "Preguntas" },
  { type: "single_choice", label: "Opción múltiple", description: "Elegir una respuesta", group: "Preguntas" },
  { type: "multiple_choice", label: "Casillas", description: "Elegir varias respuestas", group: "Preguntas" },
  { type: "dropdown", label: "Lista desplegable", description: "Elegir de una lista", group: "Preguntas" },
  { type: "yes_no", label: "Sí / No", description: "Respuesta de dos opciones", group: "Preguntas" },
  { type: "datetime", label: "Fecha y hora", description: "Fecha, hora o ambas", group: "Preguntas" },
  { type: "likert", label: "Escala Likert", description: "Niveles con etiquetas (Deficiente… Excelente)", group: "Escalas y rúbricas" },
  { type: "linear_scale", label: "Escala lineal", description: "Rango numérico, ej. 0 a 10", group: "Escalas y rúbricas" },
  { type: "rating", label: "Estrellas", description: "Calificación con estrellas", group: "Escalas y rúbricas" },
  { type: "matrix", label: "Matriz / rúbrica", description: "Varias filas con la misma escala", group: "Escalas y rúbricas" },
  { type: "signature", label: "Firma", description: "Firma dibujada en pantalla", group: "Firma y archivos" },
  { type: "file", label: "Archivo o foto", description: "Subir una imagen o documento", group: "Firma y archivos" },
  { type: "section_title", label: "Título de sección", description: "Encabezado para agrupar preguntas", group: "Diseño" },
  { type: "paragraph", label: "Texto descriptivo", description: "Instrucciones o información", group: "Diseño" },
  { type: "image", label: "Imagen", description: "Imagen ilustrativa", group: "Diseño" },
  { type: "divider", label: "Separador", description: "Línea divisoria", group: "Diseño" },
  { type: "page_break", label: "Salto de página", description: "Divide el formulario en pasos", group: "Diseño" },
];

export const FIELD_GROUPS: FieldGroup[] = ["Preguntas", "Escalas y rúbricas", "Firma y archivos", "Diseño"];

export function fieldTypeInfo(type: FieldType) {
  return FIELD_TYPES.find((f) => f.type === type)!;
}

export function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

export const LIKERT_PRESETS: { name: string; labels: string[] }[] = [
  { name: "Deficiente → Excelente (5)", labels: ["Deficiente", "Regular", "Bueno", "Muy bueno", "Excelente"] },
  { name: "Insuficiente → Sobresaliente (4)", labels: ["Insuficiente", "Suficiente", "Bueno", "Sobresaliente"] },
  {
    name: "Desacuerdo → Acuerdo (5)",
    labels: ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"],
  },
  { name: "No cumple → Supera (3)", labels: ["No cumple", "Cumple", "Supera lo esperado"] },
];

export function optionsFromLabels(labels: string[], startPoints = 1): ChoiceOption[] {
  return labels.map((label, i) => ({ id: shortId(), label, points: startPoints + i }));
}

function defaultConfig(type: FieldType): FieldConfig {
  switch (type) {
    case "short_text":
      return { placeholder: "" };
    case "long_text":
      return { placeholder: "" };
    case "number":
      return { min: 0, max: 10, step: 1 };
    case "single_choice":
    case "dropdown":
      return { options: optionsFromLabels(["Opción 1", "Opción 2", "Opción 3"], 0) };
    case "multiple_choice":
      return { options: optionsFromLabels(["Opción 1", "Opción 2", "Opción 3"], 1).map((o) => ({ ...o, points: 1 })) };
    case "likert":
      return { options: optionsFromLabels(LIKERT_PRESETS[0].labels) };
    case "linear_scale":
      return { min: 0, max: 10, step: 1, minLabel: "Muy bajo", maxLabel: "Excelente" };
    case "rating":
      return { max: 5 };
    case "matrix":
      return {
        rows: [
          { id: shortId(), label: "Criterio 1" },
          { id: shortId(), label: "Criterio 2" },
          { id: shortId(), label: "Criterio 3" },
        ],
        columns: optionsFromLabels(["Deficiente", "Regular", "Bueno", "Excelente"]),
      };
    case "yes_no":
      return { yesLabel: "Sí", noLabel: "No", yesPoints: 1, noPoints: 0 };
    case "datetime":
      return { mode: "date" };
    case "file":
      return { accept: "image" };
    case "image":
      return { url: "", alt: "" };
    default:
      return {};
  }
}

const DEFAULT_LABELS: Partial<Record<FieldType, string>> = {
  short_text: "Pregunta de texto corto",
  long_text: "Comentarios",
  number: "Valor numérico",
  single_choice: "Elige una opción",
  multiple_choice: "Selecciona las que apliquen",
  dropdown: "Elige de la lista",
  yes_no: "¿Cumple con el requisito?",
  datetime: "Fecha",
  likert: "Criterio de evaluación",
  linear_scale: "Calificación del 0 al 10",
  rating: "Calificación general",
  matrix: "Rúbrica",
  signature: "Firma del evaluador",
  file: "Foto del proyecto",
  section_title: "Nueva sección",
  paragraph: "Escribe aquí instrucciones para el evaluador.",
  image: "",
  divider: "",
  page_break: "",
};

export function createField(type: FieldType, formId: string): FormField {
  const scorable = ["likert", "linear_scale", "rating", "matrix"].includes(type);
  return {
    id: crypto.randomUUID(),
    form_id: formId,
    position: 0,
    type,
    label: DEFAULT_LABELS[type] ?? "",
    help: null,
    required: scorable,
    scored: scorable,
    weight: scorable ? 20 : 0,
    config: defaultConfig(type),
    logic: null,
  };
}

/** Duplica un campo con ids nuevos (incluyendo los de opciones/filas). */
export function cloneField(field: FormField): FormField {
  const config: FieldConfig = JSON.parse(JSON.stringify(field.config));
  config.options = config.options?.map((o) => ({ ...o, id: shortId() }));
  config.columns = config.columns?.map((o) => ({ ...o, id: shortId() }));
  config.rows = config.rows?.map((r) => ({ ...r, id: shortId() }));
  return { ...field, id: crypto.randomUUID(), label: field.label ? `${field.label} (copia)` : field.label, config };
}
