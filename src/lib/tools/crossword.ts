import { normalizeWord, seededRandom, shuffle } from "./text";

export interface CrosswordEntry {
  answer: string;
  clue: string;
}

export interface CrosswordPlacement {
  answer: string;
  /** Respuesta como la escribió el maestro */
  original: string;
  clue: string;
  row: number;
  col: number;
  dir: "across" | "down";
  number: number;
}

export interface CrosswordResult {
  rows: number;
  cols: number;
  /** Letra de cada celda o "" si está vacía */
  grid: string[][];
  placements: CrosswordPlacement[];
  unplaced: string[];
}

type Cell = { ch: string; across: boolean; down: boolean };
type Word = { answer: string; original: string; clue: string };
type Placed = Word & { row: number; col: number; dir: "across" | "down" };

function key(r: number, c: number) {
  return `${r},${c}`;
}

class Board {
  cells = new Map<string, Cell>();
  placed: Placed[] = [];

  get(r: number, c: number) {
    return this.cells.get(key(r, c));
  }

  canPlace(word: string, r: number, c: number, dir: "across" | "down"): number {
    const dr = dir === "down" ? 1 : 0;
    const dc = dir === "across" ? 1 : 0;
    // Antes y después deben estar vacías
    if (this.get(r - dr, c - dc) || this.get(r + dr * word.length, c + dc * word.length)) return -1;
    let crossings = 0;
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const cell = this.get(rr, cc);
      if (cell) {
        if (cell.ch !== word[i]) return -1;
        if (dir === "across" ? cell.across : cell.down) return -1; // ya usada en la misma dirección
        crossings++;
      } else {
        // Vecinos perpendiculares deben estar vacíos para no formar palabras de más
        if (this.get(rr + dc, cc + dr) || this.get(rr - dc, cc - dr)) return -1;
      }
    }
    return crossings;
  }

  place(w: Word, r: number, c: number, dir: "across" | "down") {
    const dr = dir === "down" ? 1 : 0;
    const dc = dir === "across" ? 1 : 0;
    for (let i = 0; i < w.answer.length; i++) {
      const k = key(r + dr * i, c + dc * i);
      const cell = this.cells.get(k) ?? { ch: w.answer[i], across: false, down: false };
      if (dir === "across") cell.across = true;
      else cell.down = true;
      this.cells.set(k, cell);
    }
    this.placed.push({ ...w, row: r, col: c, dir });
  }

  bounds() {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (const k of this.cells.keys()) {
      const [r, c] = k.split(",").map(Number);
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    }
    return { minR, maxR, minC, maxC };
  }
}

function attempt(words: Word[], rand: () => number) {
  const board = new Board();
  const pending = [...words];
  const first = pending.shift();
  if (!first) return { board, unplaced: [] as Word[] };
  board.place(first, 0, 0, rand() < 0.5 ? "across" : "down");

  let progress = true;
  let left = pending;
  while (left.length && progress) {
    progress = false;
    const next: Word[] = [];
    for (const w of left) {
      const options: { r: number; c: number; dir: "across" | "down"; score: number }[] = [];
      const { minR, maxR, minC, maxC } = board.bounds();
      for (const [k, cell] of board.cells) {
        const [r, c] = k.split(",").map(Number);
        for (let i = 0; i < w.answer.length; i++) {
          if (w.answer[i] !== cell.ch) continue;
          for (const dir of ["across", "down"] as const) {
            const sr = dir === "down" ? r - i : r;
            const sc = dir === "across" ? c - i : c;
            const crossings = board.canPlace(w.answer, sr, sc, dir);
            if (crossings < 1) continue;
            // Preferir más cruces y mantener la forma compacta
            const er = dir === "down" ? sr + w.answer.length - 1 : sr;
            const ec = dir === "across" ? sc + w.answer.length - 1 : sc;
            const h = Math.max(maxR, er) - Math.min(minR, sr) + 1;
            const wd = Math.max(maxC, ec) - Math.min(minC, sc) + 1;
            const score = crossings * 10 - Math.max(h, wd) - Math.abs(h - wd) * 0.5 + rand();
            options.push({ r: sr, c: sc, dir, score });
          }
        }
      }
      if (options.length) {
        options.sort((a, b) => b.score - a.score);
        const o = options[0];
        board.place(w, o.r, o.c, o.dir);
        progress = true;
      } else next.push(w);
    }
    left = next;
  }
  return { board, unplaced: left };
}

/** Genera un crucigrama a partir de pares respuesta–pista. */
export function generateCrossword(entries: CrosswordEntry[], seed: number, removeAccents = true, tries = 40): CrosswordResult {
  const seen = new Set<string>();
  const words: Word[] = entries
    .map((e) => ({ answer: normalizeWord(e.answer, removeAccents), original: e.answer.trim(), clue: e.clue.trim() }))
    .filter((w) => w.answer.length >= 2 && !seen.has(w.answer) && seen.add(w.answer));

  const rand = seededRandom(seed);
  let best: ReturnType<typeof attempt> | null = null;
  let bestScore = -Infinity;
  for (let t = 0; t < tries; t++) {
    const order =
      t === 0
        ? [...words].sort((a, b) => b.answer.length - a.answer.length)
        : shuffle(words, rand).sort((a, b) => b.answer.length - a.answer.length + (rand() - 0.5) * 6);
    const res = attempt(order, rand);
    if (!res.board.cells.size) continue;
    const { minR, maxR, minC, maxC } = res.board.bounds();
    const area = (maxR - minR + 1) * (maxC - minC + 1);
    const score = res.board.placed.length * 1000 - area - Math.abs(maxR - minR - (maxC - minC)) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = res;
    }
    if (best && best.unplaced.length === 0 && t > 12) break;
  }

  if (!best || !best.board.cells.size)
    return { rows: 0, cols: 0, grid: [], placements: [], unplaced: words.map((w) => w.original) };

  const { minR, maxR, minC, maxC } = best.board.bounds();
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => best!.board.get(r + minR, c + minC)?.ch ?? ""),
  );

  // Numeración en orden de lectura
  const placed = best.board.placed.map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }));
  const starts = [...new Set(placed.map((p) => key(p.row, p.col)))].sort((a, b) => {
    const [ar, ac] = a.split(",").map(Number);
    const [br, bc] = b.split(",").map(Number);
    return ar - br || ac - bc;
  });
  const numberOf = new Map(starts.map((k, i) => [k, i + 1]));
  const placements: CrosswordPlacement[] = placed
    .map((p) => ({
      answer: p.answer,
      original: p.original,
      clue: p.clue,
      row: p.row,
      col: p.col,
      dir: p.dir,
      number: numberOf.get(key(p.row, p.col))!,
    }))
    .sort((a, b) => a.number - b.number || (a.dir === "across" ? -1 : 1));

  return { rows, cols, grid, placements, unplaced: best.unplaced.map((w) => w.original) };
}

/** Lee pares "respuesta - pista" (o con tabulador, ";" o ":") de un texto, una por línea. */
export function parseEntries(text: string): CrosswordEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*(?:\t|;|:|\s[-–—]\s|=)\s*(.+)$/);
      return m ? { answer: m[1].trim(), clue: m[2].trim() } : { answer: line, clue: "" };
    });
}
