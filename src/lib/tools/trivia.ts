import Papa from "papaparse";

export interface TriviaQuestion {
  question: string;
  answer: string;
  image?: string;
}

export interface TriviaCategory {
  id: string;
  name: string;
  /** Una pregunta por fila (mismo orden que rowValues) */
  questions: TriviaQuestion[];
}

export interface TriviaTeam {
  id: string;
  name: string;
  color: string;
}

export interface TriviaData {
  categories: TriviaCategory[];
  rowValues: number[];
  teams: TriviaTeam[];
  /** 0 = sin temporizador */
  timerSeconds: number;
}

export const TEAM_COLORS = ["#6A11CB", "#00A891", "#E0466A", "#D99A00", "#2563EB", "#A855F7", "#0F172A", "#EA580C"];

const rid = () => Math.random().toString(36).slice(2, 9);

export function emptyQuestion(): TriviaQuestion {
  return { question: "", answer: "" };
}

export function defaultTrivia(): TriviaData {
  const rowValues = [100, 200, 300, 400, 500];
  return {
    categories: ["Categoría 1", "Categoría 2", "Categoría 3", "Categoría 4"].map((name) => ({
      id: rid(),
      name,
      questions: rowValues.map(emptyQuestion),
    })),
    rowValues,
    teams: [
      { id: rid(), name: "Equipo 1", color: TEAM_COLORS[0] },
      { id: rid(), name: "Equipo 2", color: TEAM_COLORS[1] },
      { id: rid(), name: "Equipo 3", color: TEAM_COLORS[2] },
    ],
    timerSeconds: 30,
  };
}

/** Ajusta el tablero a `cols` categorías y `rows` filas, conservando lo escrito. */
export function resizeBoard(d: TriviaData, cols: number, rows: number): TriviaData {
  const rowValues = Array.from({ length: rows }, (_, i) => d.rowValues[i] ?? (i + 1) * 100);
  const categories = Array.from({ length: cols }, (_, c) => {
    const cat = d.categories[c] ?? { id: rid(), name: `Categoría ${c + 1}`, questions: [] };
    return { ...cat, questions: Array.from({ length: rows }, (_, r) => cat.questions[r] ?? emptyQuestion()) };
  });
  return { ...d, rowValues, categories };
}

export function newTeam(index: number): TriviaTeam {
  return { id: rid(), name: `Equipo ${index + 1}`, color: TEAM_COLORS[index % TEAM_COLORS.length] };
}

/* ------------------------------ CSV ------------------------------ */

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

export function triviaTemplateCsv() {
  const rows = [
    ["Tipografía", "100", "¿Cómo se llama el espacio entre pares de letras?", "Kerning"],
    ["Tipografía", "200", "¿Qué nombre recibe el remate en los extremos de los trazos?", "Serifa"],
    ["Color", "100", "¿Cuáles son los tres colores primarios del modelo RGB?", "Rojo, verde y azul"],
    ["Color", "200", "¿Cómo se llama el color opuesto en el círculo cromático?", "Complementario"],
    ["Composición", "100", "¿Qué regla divide la imagen en 9 partes iguales?", "Regla de los tercios"],
    ["Composición", "200", "¿Qué es una retícula?", "Estructura que organiza los elementos de la página"],
  ];
  return "﻿" + Papa.unparse({ fields: ["categoria", "puntos", "pregunta", "respuesta"], data: rows });
}

export function triviaToCsv(d: TriviaData) {
  const data: string[][] = [];
  d.categories.forEach((c) =>
    c.questions.forEach((q, r) => {
      if (q.question.trim() || q.answer.trim()) data.push([c.name, String(d.rowValues[r] ?? ""), q.question, q.answer]);
    }),
  );
  return "﻿" + Papa.unparse({ fields: ["categoria", "puntos", "pregunta", "respuesta"], data });
}

/** Lee un CSV (categoria, puntos, pregunta, respuesta) y arma el tablero. */
export function parseTriviaCsv(text: string, current: TriviaData): { data: TriviaData | null; error?: string; count: number } {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: norm,
  });
  const f = parsed.meta.fields ?? [];
  const col = (names: string[]) => f.find((x) => names.includes(x));
  const cCat = col(["categoria", "category", "tema"]);
  const cPts = col(["puntos", "puntaje", "valor", "points"]);
  const cQ = col(["pregunta", "question", "pista"]);
  const cA = col(["respuesta", "answer"]);
  if (!cCat || !cQ) return { data: null, error: "El archivo necesita al menos las columnas “categoria” y “pregunta”.", count: 0 };

  const cats: { name: string; items: { pts: number | null; q: string; a: string }[] }[] = [];
  for (const row of parsed.data) {
    const name = (row[cCat] ?? "").trim();
    const q = (row[cQ] ?? "").trim();
    if (!name || !q) continue;
    let cat = cats.find((c) => norm(c.name) === norm(name));
    if (!cat) {
      cat = { name, items: [] };
      cats.push(cat);
    }
    const p = cPts ? Number(String(row[cPts] ?? "").replace(/[^\d.]/g, "")) : NaN;
    cat.items.push({ pts: Number.isFinite(p) && p > 0 ? p : null, q, a: cA ? (row[cA] ?? "").trim() : "" });
  }
  if (!cats.length) return { data: null, error: "No se encontraron preguntas.", count: 0 };
  const limited = cats.slice(0, 6);

  // Filas: valores de puntos encontrados (o 100, 200…)
  const values = [...new Set(limited.flatMap((c) => c.items.map((i) => i.pts)).filter((v): v is number => v !== null))].sort((a, b) => a - b);
  const rows = Math.min(6, Math.max(values.length, ...limited.map((c) => c.items.length)));
  const rowValues = Array.from({ length: rows }, (_, i) => values[i] ?? (i + 1) * 100);

  const categories: TriviaCategory[] = limited.map((c) => {
    const questions: TriviaQuestion[] = rowValues.map(() => emptyQuestion());
    const loose: typeof c.items = [];
    for (const it of c.items) {
      const r = it.pts !== null ? rowValues.indexOf(it.pts) : -1;
      if (r >= 0 && !questions[r].question) questions[r] = { question: it.q, answer: it.a };
      else loose.push(it);
    }
    for (const it of loose) {
      const r = questions.findIndex((q) => !q.question);
      if (r >= 0) questions[r] = { question: it.q, answer: it.a };
    }
    return { id: rid(), name: c.name, questions };
  });
  const count = categories.reduce((a, c) => a + c.questions.filter((q) => q.question).length, 0);
  return { data: { ...current, categories, rowValues }, count };
}
