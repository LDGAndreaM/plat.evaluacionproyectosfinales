import { describe, expect, it } from "vitest";
import { defaultTrivia, parseTriviaCsv, resizeBoard, triviaTemplateCsv, triviaToCsv } from "./trivia";

describe("tablero de trivia", () => {
  it("la plantilla CSV arma 3 categorías × 2 filas", () => {
    const r = parseTriviaCsv(triviaTemplateCsv(), defaultTrivia());
    expect(r.error).toBeUndefined();
    expect(r.count).toBe(6);
    expect(r.data!.categories.map((c) => c.name)).toEqual(["Tipografía", "Color", "Composición"]);
    expect(r.data!.rowValues).toEqual([100, 200]);
    expect(r.data!.categories[0].questions[1].answer).toBe("Serifa");
  });

  it("exportar e importar conserva el tablero", () => {
    const first = parseTriviaCsv(triviaTemplateCsv(), defaultTrivia()).data!;
    const again = parseTriviaCsv(triviaToCsv(first), defaultTrivia()).data!;
    expect(again.categories.map((c) => c.questions)).toEqual(first.categories.map((c) => c.questions));
  });

  it("sin puntos: se acomodan en orden; punto y coma y acentos en encabezados", () => {
    const csv = "Categoría;Pregunta;Respuesta\nA;p1;r1\nA;p2;r2\nB;p3;r3\n";
    const r = parseTriviaCsv(csv, defaultTrivia());
    expect(r.data!.rowValues).toEqual([100, 200]);
    expect(r.data!.categories[1].questions[0].question).toBe("p3");
  });

  it("redimensionar conserva lo escrito", () => {
    const d = defaultTrivia();
    d.categories[0].questions[0].question = "Hola";
    const bigger = resizeBoard(d, 6, 6);
    expect(bigger.categories).toHaveLength(6);
    expect(bigger.rowValues).toEqual([100, 200, 300, 400, 500, 600]);
    expect(bigger.categories[0].questions[0].question).toBe("Hola");
    expect(resizeBoard(bigger, 2, 3).categories[0].questions).toHaveLength(3);
  });

  it("error claro si faltan columnas", () => {
    expect(parseTriviaCsv("nombre,valor\na,b\n", defaultTrivia()).error).toMatch(/categoria/);
  });
});
