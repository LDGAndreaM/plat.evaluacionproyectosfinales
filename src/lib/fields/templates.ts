import type { FormField } from "@/lib/types";
import { LIKERT_PRESETS, optionsFromLabels, shortId } from "./registry";

type TemplateField = Omit<FormField, "id" | "form_id" | "position">;

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  formDescription: string;
  fields: () => TemplateField[];
}

const base = { help: null, required: false, scored: false, weight: 0, config: {}, logic: null };

function likert(label: string, help: string, weight: number): TemplateField {
  return {
    ...base,
    type: "likert",
    label,
    help,
    required: true,
    scored: true,
    weight,
    config: { options: optionsFromLabels(LIKERT_PRESETS[0].labels) },
  };
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "rubrica",
    title: "Rúbrica de proyecto final",
    description: "Creatividad, Concepto, Ejecución técnica, Presentación y Viabilidad en escala de 5 niveles.",
    formDescription: "Evalúa cada criterio observando el stand y la exposición del equipo.",
    fields: () => [
      { ...base, type: "section_title", label: "Criterios de evaluación", help: "Selecciona el nivel que mejor describe el proyecto." },
      likert("Creatividad", "Originalidad de la propuesta y soluciones visuales poco convencionales.", 25),
      likert("Concepto", "Claridad de la idea rectora y coherencia con el problema planteado.", 20),
      likert("Ejecución técnica", "Calidad de acabados, dominio de herramientas y cuidado en los detalles.", 25),
      likert("Presentación", "Claridad y seguridad del equipo al exponer; calidad del montaje del stand.", 15),
      likert("Viabilidad", "Posibilidad real de implementarse con el público o cliente objetivo.", 15),
      {
        ...base,
        type: "long_text",
        label: "Comentarios para el equipo",
        help: "Opcional. Fortalezas y áreas de mejora.",
        config: { placeholder: "Escribe tu retroalimentación…" },
      },
    ],
  },
  {
    id: "matriz",
    title: "Rúbrica en matriz",
    description: "Una sola cuadrícula con varios criterios y la misma escala, más comentarios.",
    formDescription: "Califica cada criterio de la rúbrica.",
    fields: () => [
      {
        ...base,
        type: "matrix",
        label: "Rúbrica del proyecto",
        required: true,
        scored: true,
        weight: 100,
        config: {
          rows: ["Investigación", "Propuesta gráfica", "Acabados", "Exposición oral"].map((label) => ({ id: shortId(), label })),
          columns: optionsFromLabels(["Insuficiente", "Suficiente", "Bueno", "Sobresaliente"]),
        },
      },
      { ...base, type: "long_text", label: "Comentarios", config: {} },
    ],
  },
  {
    id: "blanco",
    title: "Formulario en blanco",
    description: "Empieza desde cero y agrega tus propias preguntas.",
    formDescription: "",
    fields: () => [],
  },
];
