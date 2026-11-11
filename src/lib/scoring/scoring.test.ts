import { describe, expect, it } from "vitest";
import type { FormField } from "@/lib/types";
import { aggregate, maxPoints, scoreField, scoreSubmission } from "./index";

function field(partial: Partial<FormField>): FormField {
  return {
    id: partial.id ?? crypto.randomUUID(),
    form_id: "f",
    position: 0,
    type: "likert",
    label: "Campo",
    help: null,
    required: false,
    scored: true,
    weight: 0,
    config: {},
    logic: null,
    ...partial,
  };
}

const likert = (id: string, weight: number) =>
  field({
    id,
    type: "likert",
    weight,
    config: {
      options: [1, 2, 3, 4, 5].map((p) => ({ id: `o${p}`, label: String(p), points: p })),
    },
  });

describe("scoreField", () => {
  it("likert: puntos ÷ máximo", () => {
    expect(scoreField(likert("a", 20), "o4")).toEqual({ points: 4, normalized: 0.8 });
    expect(scoreField(likert("a", 20), undefined).normalized).toBe(0);
  });

  it("casillas: suma de positivos, tope en 1", () => {
    const f = field({
      type: "multiple_choice",
      config: {
        options: [
          { id: "a", label: "A", points: 2 },
          { id: "b", label: "B", points: 2 },
          { id: "c", label: "C", points: -1 },
        ],
      },
    });
    expect(maxPoints(f)).toBe(4);
    expect(scoreField(f, ["a"]).normalized).toBe(0.5);
    expect(scoreField(f, ["a", "b"]).normalized).toBe(1);
    expect(scoreField(f, ["a", "c"]).normalized).toBe(0.25);
  });

  it("escala lineal 0–10 y rango negativo", () => {
    const f = field({ type: "linear_scale", config: { min: 0, max: 10 } });
    expect(scoreField(f, 7).normalized).toBe(0.7);
    const g = field({ type: "linear_scale", config: { min: -5, max: 5 } });
    expect(scoreField(g, 0).normalized).toBe(0.5);
  });

  it("matriz: promedio de filas", () => {
    const f = field({
      type: "matrix",
      config: {
        rows: [
          { id: "r1", label: "1" },
          { id: "r2", label: "2" },
        ],
        columns: [
          { id: "c1", label: "Mal", points: 1 },
          { id: "c4", label: "Bien", points: 4 },
        ],
      },
    });
    expect(scoreField(f, { r1: "c4", r2: "c1" })).toEqual({ points: 5, normalized: 0.625 });
    expect(scoreField(f, { r1: "c4" }).normalized).toBe(0.5);
  });

  it("sí/no y estrellas", () => {
    expect(scoreField(field({ type: "yes_no", config: { yesPoints: 1, noPoints: 0 } }), true).normalized).toBe(1);
    expect(scoreField(field({ type: "yes_no", config: { yesPoints: 1, noPoints: 0 } }), false).normalized).toBe(0);
    expect(scoreField(field({ type: "rating", config: { max: 5 } }), 3).normalized).toBe(0.6);
  });
});

describe("scoreSubmission", () => {
  it("promedio ponderado en escala 0–100", () => {
    const fields = [likert("a", 25), likert("b", 75)];
    expect(scoreSubmission(fields, { a: "o5", b: "o1" }).total).toBe(40); // 0.25*1 + 0.75*0.2
  });

  it("si ninguna ponderación está definida, pesa igual", () => {
    const fields = [likert("a", 0), likert("b", 0)];
    expect(scoreSubmission(fields, { a: "o5", b: "o3" }).total).toBe(80);
  });

  it("ignora campos ocultos por lógica condicional", () => {
    const yn = field({ id: "yn", type: "yes_no", scored: false });
    const hidden = { ...likert("h", 50), logic: { fieldId: "yn", operator: "equals" as const, value: "yes" } };
    const fields = [yn, likert("a", 50), hidden];
    expect(scoreSubmission(fields, { yn: false, a: "o5" }).total).toBe(100);
    expect(scoreSubmission(fields, { yn: true, a: "o5" }).total).toBe(50);
  });

  it("los campos que no puntúan no cuentan", () => {
    const fields = [likert("a", 50), { ...likert("b", 50), scored: false }];
    expect(scoreSubmission(fields, { a: "o5", b: "o1" }).total).toBe(100);
  });
});

describe("aggregate", () => {
  it("promedio, suma y recortado", () => {
    expect(aggregate([80, 90, 100], "average")).toBe(90);
    expect(aggregate([80, 90, 100], "sum")).toBe(270);
    expect(aggregate([10, 80, 90, 100], "trimmed")).toBe(85);
    expect(aggregate([80, 90], "trimmed")).toBe(85);
    expect(aggregate([], "average")).toBeNull();
  });
});
