import type { CrosswordEntry, CrosswordResult } from "./crossword";
import type { WordSearchOptions, WordSearchResult } from "./wordsearch";
import { defaultWorksheet, type WorksheetData } from "@/lib/worksheet/types";
import { defaultTrivia, type TriviaData } from "./trivia";
import { defaultDiagram, type DiagramData } from "./diagram";

export type ToolKind = "wheel" | "wordsearch" | "crossword" | "worksheet" | "trivia" | "conceptmap" | "flowchart";

export interface WheelEntry {
  id: string;
  label: string;
}

/** Una ruleta dentro de la herramienta (puede haber varias en la misma pantalla). */
export interface WheelSpec {
  id: string;
  title: string;
  entries: WheelEntry[];
  removeWinner: boolean;
  palette: string;
}

export interface WheelData {
  /** Campos de la primera ruleta (se conservan por compatibilidad con ruletas guardadas antes) */
  entries: WheelEntry[];
  removeWinner: boolean;
  spinSeconds: number;
  palette: string;
  history: { label: string; at: string; wheel?: string }[];
  /** Todas las ruletas; si no existe, solo hay una (la de los campos de arriba) */
  wheels?: WheelSpec[];
}

/** Lista de ruletas, compatible con datos guardados de una sola ruleta. */
export function getWheels(d: WheelData): WheelSpec[] {
  if (d.wheels?.length) return d.wheels;
  return [{ id: "w1", title: "", entries: d.entries ?? [], removeWinner: !!d.removeWinner, palette: d.palette || "vivo" }];
}

/** Guarda la lista de ruletas, reflejando la primera en los campos antiguos. */
export function setWheels(d: WheelData, wheels: WheelSpec[]): WheelData {
  const first = wheels[0];
  return { ...d, wheels, entries: first?.entries ?? [], removeWinner: first?.removeWinner ?? false, palette: first?.palette ?? "vivo" };
}

export interface WordSearchData {
  instructions: string;
  words: string[];
  options: WordSearchOptions;
  result: WordSearchResult | null;
}

export interface CrosswordData {
  instructions: string;
  entries: CrosswordEntry[];
  removeAccents: boolean;
  seed: number;
  result: CrosswordResult | null;
}

export type ToolData = WheelData | WordSearchData | CrosswordData | WorksheetData | TriviaData | DiagramData;
export type { WorksheetData, TriviaData, DiagramData };

export interface TeacherTool {
  id: string;
  owner_id: string;
  kind: ToolKind;
  title: string;
  data: ToolData;
  is_public: boolean;
  share_code: string;
  created_at: string;
  updated_at: string;
}

export const TOOL_INFO: Record<ToolKind, { name: string; plural: string; description: string; defaultTitle: string }> = {
  wheel: {
    name: "Ruleta",
    plural: "Ruletas",
    description: "Sorteos en clase: nombres, equipos, temas u orden de exposición.",
    defaultTitle: "Ruleta de sorteo",
  },
  wordsearch: {
    name: "Sopa de letras",
    plural: "Sopas de letras",
    description: "Escribe las palabras y obtén una sopa lista para imprimir o resolver en pantalla.",
    defaultTitle: "Sopa de letras",
  },
  crossword: {
    name: "Crucigrama",
    plural: "Crucigramas",
    description: "Escribe palabras con su pista y el crucigrama se arma solo.",
    defaultTitle: "Crucigrama",
  },
  conceptmap: {
    name: "Mapa conceptual",
    plural: "Mapas conceptuales",
    description: "Conecta conceptos con palabras de enlace; se acomoda solo y se exporta como imagen.",
    defaultTitle: "Mapa conceptual",
  },
  flowchart: {
    name: "Diagrama de flujo",
    plural: "Diagramas de flujo",
    description: "Inicio, procesos, decisiones y flechas con Sí / No para explicar un proceso paso a paso.",
    defaultTitle: "Diagrama de flujo",
  },
  trivia: {
    name: "Tablero de trivia",
    plural: "Tableros de trivia",
    description: "Juego de preguntas por categorías y puntos para competir por equipos en clase.",
    defaultTitle: "Tablero de trivia",
  },
  worksheet: {
    name: "Ficha interactiva",
    plural: "Fichas interactivas",
    description: "Sube un PDF y coloca respuestas encima: tus alumnos lo contestan en línea y te llegan calificados.",
    defaultTitle: "Ficha interactiva",
  },
};

export function isToolKind(v: string): v is ToolKind {
  return ["wheel", "wordsearch", "crossword", "worksheet", "trivia", "conceptmap", "flowchart"].includes(v);
}

export function defaultData(kind: ToolKind): ToolData {
  switch (kind) {
    case "wheel":
      return {
        entries: ["Equipo 1", "Equipo 2", "Equipo 3", "Equipo 4", "Equipo 5", "Equipo 6"].map((label, i) => ({ id: `e${i}`, label })),
        removeWinner: false,
        spinSeconds: 5,
        palette: "evaluaqr",
        history: [],
      } satisfies WheelData;
    case "wordsearch":
      return {
        instructions: "Encuentra las palabras escondidas. Pueden estar en horizontal, vertical o diagonal.",
        words: [],
        options: { size: 0, diagonal: true, backwards: false, removeAccents: true, seed: 1 },
        result: null,
      } satisfies WordSearchData;
    case "worksheet":
      return defaultWorksheet();
    case "trivia":
      return defaultTrivia();
    case "conceptmap":
    case "flowchart":
      return defaultDiagram(kind);
    case "crossword":
      return {
        instructions: "Completa el crucigrama con ayuda de las pistas.",
        entries: [],
        removeAccents: true,
        seed: 1,
        result: null,
      } satisfies CrosswordData;
  }
}
