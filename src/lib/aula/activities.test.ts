import { describe, expect, it } from "vitest";
import {
  attemptsLeft,
  finalScore,
  latestByOwner,
  randomTeams,
  rubricMax,
  rubricToScore,
  rubricTotal,
  scaleScore,
  studentTrack,
  trackStatus,
  type Submission,
} from "./activities";

const sub = (p: Partial<Submission>): Submission =>
  ({ id: "x", activity_id: "a", class_id: "c", student_id: "s1", team_id: null, attempt: 1, body: "x", link: null, files: [], answers: null,
    submitted_at: "2026-11-20T10:00:00Z", is_late: false, status: "submitted", score: null, rubric_scores: null, feedback: null, graded_at: null, ...p }) as Submission;

describe("actividades", () => {
  const rubric = [
    { id: "a", criterion: "Contenido", points: 6 },
    { id: "b", criterion: "Presentación", points: 4 },
  ];
  it("rúbrica", () => {
    expect(rubricMax(rubric)).toBe(10);
    expect(rubricTotal(rubric, { a: 5, b: 9 })).toBe(9); // b se limita a 4
    expect(rubricToScore(rubric, { a: 6, b: 2 }, 100)).toBe(80);
  });
  it("descuento por retraso", () => {
    expect(finalScore({ score: 9, is_late: true }, { late_penalty_pct: 20 })).toBe(7.2);
    expect(finalScore({ score: 9, is_late: false }, { late_penalty_pct: 20 })).toBe(9);
    expect(finalScore({ score: null, is_late: true }, { late_penalty_pct: 20 })).toBeNull();
    expect(scaleScore(7, 14, 10)).toBe(5);
  });
  it("estado de seguimiento", () => {
    const now = Date.parse("2026-11-22T00:00:00Z");
    expect(trackStatus(undefined, { due_at: "2026-11-21T00:00:00Z" }, now)).toBe("missing");
    expect(trackStatus(undefined, { due_at: "2026-11-30T00:00:00Z" }, now)).toBe("pending");
    expect(trackStatus(sub({ is_late: true }), { due_at: null }, now)).toBe("late");
    expect(trackStatus(sub({ status: "graded" }), { due_at: null }, now)).toBe("graded");
  });
  it("última entrega por equipo y estado del integrante", () => {
    const subs = [
      sub({ id: "1", student_id: "s1", team_id: "t1", submitted_at: "2026-11-20T10:00:00Z" }),
      sub({ id: "2", student_id: "s2", team_id: "t1", submitted_at: "2026-11-21T10:00:00Z", status: "graded" }),
    ];
    const latest = latestByOwner(subs, "team");
    expect(latest.get("t1")?.id).toBe("2");
    const teamOf = new Map([["s1", "t1"], ["s3", "t2"]]);
    expect(studentTrack("s1", { mode: "team", due_at: null }, latest, teamOf, 0).status).toBe("graded");
    expect(studentTrack("s3", { mode: "team", due_at: null }, latest, teamOf, 0).status).toBe("pending");
  });
  it("intentos", () => {
    expect(attemptsLeft({ max_attempts: 0 }, 5)).toBeNull();
    expect(attemptsLeft({ max_attempts: 2 }, 2)).toBe(0);
    expect(attemptsLeft({ max_attempts: 2 }, 2, "returned")).toBe(1);
  });
  it("equipos al azar", () => {
    const t = randomTeams([1, 2, 3, 4, 5, 6, 7], 3, () => 0.5);
    expect(t).toHaveLength(2);
    expect(t.flat().sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Math.max(...t.map((x) => x.length)) - Math.min(...t.map((x) => x.length))).toBeLessThanOrEqual(1);
  });
});
