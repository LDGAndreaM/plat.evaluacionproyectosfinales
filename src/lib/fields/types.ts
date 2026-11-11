// Definición de los tipos de campo del constructor de formularios.

export type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "likert"
  | "linear_scale"
  | "rating"
  | "matrix"
  | "yes_no"
  | "datetime"
  | "signature"
  | "file"
  | "section_title"
  | "paragraph"
  | "image"
  | "divider"
  | "page_break";

export interface ChoiceOption {
  id: string;
  label: string;
  points: number;
}

export interface MatrixRow {
  id: string;
  label: string;
}

export interface FieldConfig {
  placeholder?: string;
  maxLength?: number;
  // number / linear_scale
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
  // choice-based
  options?: ChoiceOption[];
  maxSelections?: number;
  // matrix
  rows?: MatrixRow[];
  columns?: ChoiceOption[];
  // yes_no
  yesLabel?: string;
  noLabel?: string;
  yesPoints?: number;
  noPoints?: number;
  // datetime
  mode?: "date" | "time" | "datetime";
  // image
  url?: string;
  alt?: string;
  // file
  accept?: string;
}

export type LogicOperator = "equals" | "not_equals" | "includes" | "answered" | "not_answered";

export interface FieldLogic {
  fieldId: string;
  operator: LogicOperator;
  value?: string;
}

/** Campos que no reciben respuesta (solo presentación). */
export const LAYOUT_TYPES: FieldType[] = ["section_title", "paragraph", "image", "divider", "page_break"];

/** Campos que pueden contar para el puntaje. */
export const SCORABLE_TYPES: FieldType[] = [
  "number",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "likert",
  "linear_scale",
  "rating",
  "matrix",
  "yes_no",
];

export function isLayout(type: FieldType) {
  return LAYOUT_TYPES.includes(type);
}

export function isScorable(type: FieldType) {
  return SCORABLE_TYPES.includes(type);
}
