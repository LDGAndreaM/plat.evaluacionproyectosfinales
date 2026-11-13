import { describe, expect, it } from "vitest";
import type { FormField } from "@/lib/types";
import { computeRanking, rankWithin, type RankingProject } from "./ranking";

const likert = (id: string, label: string, weight: number): FormField => ({
  id,
  form_id: "F",
  position: 0,
  type: "likert",
  label,
  help: null,
  required: true,
  scored: true,
  weight,
  config: { options: [1, 2, 3, 4, 5].map((p) => ({ id: `o${p}`, label: String(p), points: p })) },
  logic: null,
});

const fields = { F: [likert("a", "Creatividad", 50), likert("b", "Concepto", 50)] };
const proj = (id: string, cat: string | null = null, tb: number | null = null): RankingProject => ({
  id,
  name: id,
  stand: null,
  category_id: cat,
  members: [],
  manual_tiebreak: tb,
});
const sub = (project: string, ev: string, a: number, b: number) => ({
  id: `${project}-${ev}`,
  project_id: project,
  form_id: "F",
  evaluator_id: ev,
  answers: { a: `o${a}`, b: `o${b}` },
});

describe("computeRanking", () => {
  it("ordena por promedio y calcula desglose", () => {
    const rows = computeRanking({
      projects: [proj("P1"), proj("P2"), proj("P3")],
      submissions: [sub("P1", "e1", 3, 3), sub("P1", "e2", 5, 5), sub("P2", "e1", 5, 5), sub("P2", "e2", 5, 4)],
      fieldsByForm: fields,
      method: "average",
    });
    expect(rows.map((r) => r.project.id)).toEqual(["P2", "P1", "P3"]);
    expect(rows[0].score).toBe(95);
    expect(rows[0].criteria.map((c) => c.average)).toEqual([100, 90]);
    expect(rows[1].score).toBe(80);
    expect(rows[2].score).toBeNull();
    expect(rows[2].rank).toBeNull();
    expect(rows.map((r) => r.count)).toEqual([2, 2, 0]);
  });

  it("detecta empates y comparte la posición", () => {
    const rows = computeRanking({
      projects: [proj("A"), proj("B"), proj("C")],
      submissions: [sub("A", "e", 5, 5), sub("B", "e", 4, 4), sub("C", "e", 4, 4)],
      fieldsByForm: fields,
      method: "average",
    });
    expect(rows.map((r) => [r.project.id, r.rank, r.tied])).toEqual([
      ["A", 1, false],
      ["B", 2, true],
      ["C", 2, true],
    ]);
  });

  it("el desempate manual rompe el empate", () => {
    const rows = computeRanking({
      projects: [proj("B", null, 2), proj("C", null, 1)],
      submissions: [sub("B", "e", 4, 4), sub("C", "e", 4, 4)],
      fieldsByForm: fields,
      method: "average",
    });
    expect(rows.map((r) => [r.project.id, r.rank, r.tied])).toEqual([
      ["C", 1, false],
      ["B", 2, false],
    ]);
  });

  it("suma y recortado", () => {
    const subs = [sub("P", "e1", 1, 1), sub("P", "e2", 5, 5), sub("P", "e3", 4, 4)];
    const sum = computeRanking({ projects: [proj("P")], submissions: subs, fieldsByForm: fields, method: "sum" });
    expect(sum[0].score).toBe(200);
    const trimmed = computeRanking({ projects: [proj("P")], submissions: subs, fieldsByForm: fields, method: "trimmed" });
    expect(trimmed[0].score).toBe(80);
  });

  it("ranking por categoría", () => {
    const rows = computeRanking({
      projects: [proj("A", "x"), proj("B", "y"), proj("C", "x")],
      submissions: [sub("A", "e", 5, 5), sub("B", "e", 4, 4), sub("C", "e", 3, 3)],
      fieldsByForm: fields,
      method: "average",
    });
    expect(rankWithin(rows, "x").map((r) => [r.project.id, r.rank])).toEqual([
      ["A", 1],
      ["C", 2],
    ]);
    expect(rankWithin(rows, "y").map((r) => [r.project.id, r.rank])).toEqual([["B", 1]]);
  });
});
