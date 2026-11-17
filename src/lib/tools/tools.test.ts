import { describe, expect, it } from "vitest";
import { generateCrossword, parseEntries } from "./crossword";
import { normalizeWord } from "./text";
import { generateWordSearch, placementCells } from "./wordsearch";

const WORDS = ["Tipografía", "Retícula", "Color", "Logotipo", "Contraste", "Boceto", "Pantone", "Kerning", "Diseño", "Imagen"];

describe("normalizeWord", () => {
  it("quita acentos y espacios, conserva la Ñ", () => {
    expect(normalizeWord("Diseño gráfico")).toBe("DISEÑOGRAFICO");
    expect(normalizeWord("Pingüino", false)).toBe("PINGÜINO");
  });
});

describe("sopa de letras", () => {
  it("coloca todas las palabras y se pueden leer en la cuadrícula", () => {
    for (const seed of [1, 2, 3, 42, 999]) {
      const r = generateWordSearch(WORDS, { size: 0, diagonal: true, backwards: true, removeAccents: true, seed });
      expect(r.unplaced).toEqual([]);
      expect(r.placements).toHaveLength(WORDS.length);
      for (const p of r.placements) {
        const read = placementCells(p).map(([row, col]) => r.grid[row][col]).join("");
        expect(read).toBe(p.word);
      }
      expect(r.grid.every((row) => row.length === r.size && row.every((ch) => ch.length === 1))).toBe(true);
    }
  });

  it("es reproducible con la misma semilla", () => {
    const opts = { size: 12, diagonal: false, backwards: false, removeAccents: true, seed: 7 };
    expect(generateWordSearch(WORDS, opts).grid).toEqual(generateWordSearch(WORDS, opts).grid);
  });

  it("sin diagonales ni reversa solo usa → y ↓", () => {
    const r = generateWordSearch(WORDS, { size: 0, diagonal: false, backwards: false, removeAccents: true, seed: 5 });
    expect(r.placements.every((p) => (p.dr === 0 && p.dc === 1) || (p.dr === 1 && p.dc === 0))).toBe(true);
  });

  it("reporta palabras que no caben", () => {
    const r = generateWordSearch(["Electroencefalografista", "sol"], { size: 8, diagonal: true, backwards: false, removeAccents: true, seed: 1 });
    expect(r.unplaced).toEqual(["Electroencefalografista"]);
  });
});

describe("crucigrama", () => {
  const entries = WORDS.map((w) => ({ answer: w, clue: `Pista de ${w}` }));

  it("coloca las palabras sin formar palabras inválidas", () => {
    for (const seed of [1, 7, 123]) {
      const r = generateCrossword(entries, seed);
      expect(r.placements.length).toBeGreaterThanOrEqual(WORDS.length - 1);
      // Cada palabra se lee en la cuadrícula
      for (const p of r.placements) {
        const read = [...p.answer].map((_, i) => (p.dir === "across" ? r.grid[p.row][p.col + i] : r.grid[p.row + i][p.col])).join("");
        expect(read).toBe(p.answer);
      }
      // Toda secuencia de 2+ letras corresponde a una palabra colocada
      const runs: string[] = [];
      for (let row = 0; row < r.rows; row++) {
        let s = "";
        for (let col = 0; col <= r.cols; col++) {
          const ch = col < r.cols ? r.grid[row][col] : "";
          if (ch) s += ch;
          else {
            if (s.length > 1) runs.push(`A${row},${col - s.length}`);
            s = "";
          }
        }
      }
      for (let col = 0; col < r.cols; col++) {
        let s = "";
        for (let row = 0; row <= r.rows; row++) {
          const ch = row < r.rows ? r.grid[row][col] : "";
          if (ch) s += ch;
          else {
            if (s.length > 1) runs.push(`D${row - s.length},${col}`);
            s = "";
          }
        }
      }
      const expected = r.placements.map((p) => `${p.dir === "across" ? "A" : "D"}${p.row},${p.col}`).sort();
      expect(runs.sort()).toEqual(expected);
      // Números en orden de lectura, empezando en 1
      expect(Math.min(...r.placements.map((p) => p.number))).toBe(1);
    }
  });

  it("lee pares respuesta–pista en varios formatos", () => {
    expect(parseEntries("Color - Propiedad de la luz\nKerning: espacio entre letras\nBoceto;Dibujo previo\nSolo")).toEqual([
      { answer: "Color", clue: "Propiedad de la luz" },
      { answer: "Kerning", clue: "espacio entre letras" },
      { answer: "Boceto", clue: "Dibujo previo" },
      { answer: "Solo", clue: "" },
    ]);
  });
});
