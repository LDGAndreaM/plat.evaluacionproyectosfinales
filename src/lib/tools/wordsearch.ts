import { SPANISH_ALPHABET, normalizeWord, seededRandom, shuffle } from "./text";

export interface WordSearchOptions {
  /** 0 = automático */
  size: number;
  diagonal: boolean;
  backwards: boolean;
  removeAccents: boolean;
  seed: number;
}

export interface Placement {
  word: string;
  /** Palabra como la escribió el maestro */
  original: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface WordSearchResult {
  size: number;
  grid: string[][];
  placements: Placement[];
  unplaced: string[];
}

export const DEFAULT_WORDSEARCH_OPTIONS: WordSearchOptions = {
  size: 0,
  diagonal: true,
  backwards: false,
  removeAccents: true,
  seed: 1,
};

function directions(opts: WordSearchOptions) {
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
  ];
  if (opts.diagonal) dirs.push([1, 1], [-1, 1]);
  if (opts.backwards) {
    dirs.push([0, -1], [-1, 0]);
    if (opts.diagonal) dirs.push([-1, -1], [1, -1]);
  }
  return dirs;
}

function tryBuild(words: { word: string; original: string }[], size: number, opts: WordSearchOptions, rand: () => number) {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  const dirs = directions(opts);

  for (const { word, original } of words) {
    if (word.length > size) {
      unplaced.push(original);
      continue;
    }
    let placed = false;
    // Probar posiciones al azar y luego exhaustivamente
    const candidates: [number, number, number, number][] = [];
    for (const [dr, dc] of dirs)
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) {
          const er = r + dr * (word.length - 1);
          const ec = c + dc * (word.length - 1);
          if (er >= 0 && er < size && ec >= 0 && ec < size) candidates.push([r, c, dr, dc]);
        }
    for (const [r, c, dr, dc] of shuffle(candidates, rand)) {
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const cell = grid[r + dr * i][c + dc * i];
        if (cell && cell !== word[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let i = 0; i < word.length; i++) grid[r + dr * i][c + dc * i] = word[i];
      placements.push({ word, original, row: r, col: c, dr, dc });
      placed = true;
      break;
    }
    if (!placed) unplaced.push(original);
  }
  return { grid, placements, unplaced };
}

/** Genera una sopa de letras. */
export function generateWordSearch(rawWords: string[], opts: WordSearchOptions): WordSearchResult {
  const seen = new Set<string>();
  const words = rawWords
    .map((original) => ({ original: original.trim(), word: normalizeWord(original, opts.removeAccents) }))
    .filter((w) => w.word.length >= 2 && !seen.has(w.word) && seen.add(w.word))
    .sort((a, b) => b.word.length - a.word.length);

  const longest = Math.max(0, ...words.map((w) => w.word.length));
  const letters = words.reduce((a, w) => a + w.word.length, 0);
  const auto = opts.size <= 0;
  let size = auto ? Math.min(25, Math.max(10, longest, Math.ceil(Math.sqrt(letters * 2.2)))) : Math.max(5, Math.min(30, opts.size));
  const rand = seededRandom(opts.seed);

  let best = tryBuild(words, size, opts, rand);
  // Si es automático y no cupieron todas, agrandar un poco
  while (auto && best.unplaced.length && size < 25) {
    size++;
    best = tryBuild(words, size, opts, rand);
  }

  const alphabet = SPANISH_ALPHABET;
  const grid = best.grid.map((row) => row.map((ch) => ch || alphabet[Math.floor(rand() * alphabet.length)]));
  return { size, grid, placements: best.placements, unplaced: best.unplaced };
}

/** Celdas que ocupa una palabra colocada. */
export function placementCells(p: Pick<Placement, "row" | "col" | "dr" | "dc" | "word">) {
  return Array.from({ length: p.word.length }, (_, i) => [p.row + p.dr * i, p.col + p.dc * i] as [number, number]);
}
