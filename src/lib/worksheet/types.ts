import type { WordSearchResult } from "@/lib/tools/wordsearch";

export type WsType =
  | "textfield"
  | "single"
  | "checkbox"
  | "select"
  | "wordsearch"
  | "speak"
  | "drag"
  | "drop"
  | "join"
  | "mp3"
  | "open"
  | "text"
  | "listening"
  | "link"
  | "powerpoint"
  | "youtube";

export interface WsElement {
  id: string;
  type: WsType;
  page: number;
  /** Posición y tamaño como fracción de la página (0 a 1) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Puntos que vale (equivale a "Boost value") */
  points: number;
  // Texto (respuesta corta) y Hablar
  answers?: string[];
  caseSensitive?: boolean;
  placeholder?: string;
  // Opción única
  group?: string;
  correct?: boolean;
  // Casillas
  checked?: boolean;
  // Lista
  options?: string[];
  correctIndex?: number;
  // Sopa de letras
  words?: string[];
  seed?: number;
  result?: WordSearchResult | null;
  // Hablar / Escuchar
  lang?: string;
  // Arrastrar / Soltar / Unir
  key?: string;
  label?: string;
  accepts?: string[];
  // Audio, enlace, PowerPoint, YouTube
  url?: string;
  fileName?: string;
  start?: number;
  // Texto simple / Escuchar
  text?: string;
  fontSize?: number;
  color?: string;
  bg?: string;
}

export interface WsPage {
  url: string;
  width: number;
  height: number;
}

export interface WorksheetData {
  instructions: string;
  topic: string;
  pages: WsPage[];
  elements: WsElement[];
  /** Mostrar al alumno cuáles respuestas son correctas al terminar */
  showCorrection: boolean;
}

export type WsAnswers = Record<string, unknown>;

export const GRADED_TYPES: WsType[] = ["textfield", "single", "checkbox", "select", "wordsearch", "speak", "drop", "join", "open"];

export const WS_INFO: Record<WsType, { label: string; hint: string; w: number; h: number }> = {
  textfield: { label: "Texto", hint: "Respuesta corta que se califica sola", w: 0.2, h: 0.035 },
  single: { label: "Opción única", hint: "Varias casillas de un mismo grupo; solo una es correcta", w: 0.03, h: 0.022 },
  checkbox: { label: "Casillas", hint: "Casilla que debe (o no) marcarse", w: 0.03, h: 0.022 },
  select: { label: "Lista", hint: "Menú desplegable con opciones", w: 0.2, h: 0.035 },
  wordsearch: { label: "Sopa de letras", hint: "Sopa interactiva dentro de la ficha", w: 0.45, h: 0.32 },
  speak: { label: "Hablar", hint: "El alumno dice la respuesta en voz alta", w: 0.12, h: 0.04 },
  drag: { label: "Arrastrar", hint: "Pieza que se arrastra a una zona de soltar", w: 0.15, h: 0.05 },
  drop: { label: "Soltar", hint: "Zona donde se suelta una pieza", w: 0.17, h: 0.06 },
  join: { label: "Unir", hint: "Puntos que se unen con una línea", w: 0.022, h: 0.016 },
  mp3: { label: "Audio MP3", hint: "Botón que reproduce un audio", w: 0.06, h: 0.04 },
  open: { label: "Respuesta abierta", hint: "Texto libre que calificas tú", w: 0.45, h: 0.1 },
  text: { label: "Texto simple", hint: "Texto o indicación encima de la ficha", w: 0.3, h: 0.04 },
  listening: { label: "Escuchar", hint: "Lee un texto en voz alta", w: 0.06, h: 0.04 },
  link: { label: "Enlace", hint: "Zona que abre una página web", w: 0.2, h: 0.035 },
  powerpoint: { label: "PowerPoint", hint: "Presentación incrustada", w: 0.5, h: 0.3 },
  youtube: { label: "YouTube", hint: "Video incrustado", w: 0.5, h: 0.28 },
};

export const WS_ORDER: WsType[] = [
  "textfield",
  "single",
  "checkbox",
  "select",
  "wordsearch",
  "speak",
  "drag",
  "drop",
  "join",
  "mp3",
  "open",
  "text",
  "listening",
  "link",
  "powerpoint",
  "youtube",
];

export function defaultWorksheet(): WorksheetData {
  return { instructions: "", topic: "", pages: [], elements: [], showCorrection: true };
}

export function newElement(type: WsType, page: number, x: number, y: number): WsElement {
  const info = WS_INFO[type];
  const base: WsElement = {
    id: crypto.randomUUID().slice(0, 8),
    type,
    page,
    x: Math.max(0, Math.min(1 - info.w, x - info.w / 2)),
    y: Math.max(0, Math.min(1 - info.h, y - info.h / 2)),
    w: info.w,
    h: info.h,
    points: GRADED_TYPES.includes(type) ? 1 : 0,
  };
  switch (type) {
    case "textfield":
      return { ...base, answers: [""] };
    case "single":
      return { ...base, group: "A", correct: false };
    case "checkbox":
      return { ...base, checked: true };
    case "select":
      return { ...base, options: ["Opción 1", "Opción 2", "Opción 3"], correctIndex: 0 };
    case "wordsearch":
      return { ...base, words: [], seed: 1, result: null };
    case "speak":
      return { ...base, answers: [""], lang: "es-MX" };
    case "drag":
      return { ...base, key: "1", label: "" };
    case "drop":
      return { ...base, accepts: ["1"] };
    case "join":
      return { ...base, key: "1" };
    case "text":
      return { ...base, text: "Texto", fontSize: 16, color: "#0f172a", bg: "" };
    case "listening":
      return { ...base, text: "", lang: "es-MX" };
    case "link":
      return { ...base, url: "https://", label: "" };
    case "youtube":
      return { ...base, url: "", start: 0 };
    default:
      return base;
  }
}
