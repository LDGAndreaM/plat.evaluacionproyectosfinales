import type { CrosswordEntry, CrosswordResult } from "./crossword";
import type { WordSearchOptions, WordSearchResult } from "./wordsearch";
import { defaultWorksheet, type WorksheetData } from "@/lib/worksheet/types";

export type ToolKind = "wheel" | "wordsearch" | "crossword" | "worksheet";

export interface WheelEntry {
  id: string;
  label: string;
}

export interface WheelData {
  entries: WheelEntry[];
  removeWinner: boolean;
  spinSeconds: number;
  palette: string;
  history: { label: string; at: string }[];
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

export type ToolData = WheelData | WordSearchData | CrosswordData | WorksheetData;
export type { WorksheetData };

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
  worksheet: {
    name: "Ficha interactiva",
    plural: "Fichas interactivas",
    description: "Sube un PDF y coloca respuestas encima: tus alumnos lo contestan en línea y te llegan calificados.",
    defaultTitle: "Ficha interactiva",
  },
};

export function isToolKind(v: string): v is ToolKind {
  return v === "wheel" || v === "wordsearch" || v === "crossword" || v === "worksheet";
}

export function defaultData(kind: ToolKind): ToolData {
  switch (kind) {
    case "wheel":
      return {
        entries: ["Equipo 1", "Equipo 2", "Equipo 3", "Equipo 4", "Equipo 5", "Equipo 6"].map((label, i) => ({ id: `e${i}`, label })),
        removeWinner: false,
        spinSeconds: 5,
        palette: "vivo",
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
