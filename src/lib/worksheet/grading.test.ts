import { describe, expect, it } from "vitest";
import { gradeWorksheet, normalizeAnswer } from "./grading";
import type { WsElement } from "./types";

const el = (p: Partial<WsElement> & Pick<WsElement, "id" | "type">): WsElement => ({ page: 0, x: 0, y: 0, w: 0.1, h: 0.1, points: 1, ...p });

describe("normalizeAnswer", () => {
  it("ignora acentos, mayúsculas, signos y espacios extra", () => {
    expect(normalizeAnswer("  ¿Él   está AQUÍ? ")).toBe("el esta aqui");
    expect(normalizeAnswer("París", true)).toBe("Paris");
  });
});

describe("gradeWorksheet", () => {
  const elements: WsElement[] = [
    el({ id: "t1", type: "textfield", answers: ["Ciudad de México|CDMX"] }),
    el({ id: "s1", type: "single", group: "A", correct: false }),
    el({ id: "s2", type: "single", group: "A", correct: true, points: 2 }),
    el({ id: "c1", type: "checkbox", checked: true }),
    el({ id: "c2", type: "checkbox", checked: false }),
    el({ id: "l1", type: "select", options: ["a", "b"], correctIndex: 1 }),
    el({ id: "d1", type: "drag", key: "perro", points: 0 }),
    el({ id: "d2", type: "drag", key: "gato", points: 0 }),
    el({ id: "z1", type: "drop", accepts: ["perro"] }),
    el({ id: "j1", type: "join", key: "1" }),
    el({ id: "j2", type: "join", key: "1", points: 0 }),
    el({ id: "o1", type: "open", points: 3 }),
    el({ id: "x1", type: "text", points: 0 }),
  ];

  it("todo correcto (abierta pendiente)", () => {
    const r = gradeWorksheet(elements, { t1: "cdmx", s2: true, c1: true, c2: false, l1: 1, z1: "d1", j1: "j2", j2: "j1", o1: "Mi respuesta" });
    expect(r.max).toBe(11);
    expect(r.score).toBe(8);
    expect(r.pendingManual).toBe(3);
    expect(r.byElement.s2.correct).toBe(true);
    expect(r.byElement.o1.correct).toBeNull();
  });

  it("respuestas incorrectas y abierta calificada a mano", () => {
    const r = gradeWorksheet(elements, { t1: "Monterrey", s1: true, c1: false, c2: true, l1: 0, z1: "d2", j1: "j1" }, { o1: 2 });
    expect(r.score).toBe(2);
    expect(r.pendingManual).toBe(0);
    expect(Object.values(r.byElement).filter((x) => x.correct === true)).toHaveLength(0);
  });

  it("sopa de letras da puntos proporcionales", () => {
    const ws = el({
      id: "w",
      type: "wordsearch",
      points: 4,
      result: { size: 5, grid: [], unplaced: [], placements: [0, 1, 2, 3].map((i) => ({ word: "AB", original: "ab", row: i, col: 0, dr: 0, dc: 1 })) },
    });
    expect(gradeWorksheet([ws], { w: [0, 2] }).score).toBe(2);
  });

  it("los elementos sin respuesta configurada no cuentan", () => {
    expect(gradeWorksheet([el({ id: "t", type: "textfield", answers: [""] })], {}).max).toBe(0);
  });
});
