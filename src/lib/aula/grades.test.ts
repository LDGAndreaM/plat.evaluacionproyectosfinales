import { describe, expect, it } from "vitest";
import type { Activity, Submission } from "./activities";
import type { AttRecord } from "./attendance";
import { classAverage, computeGradebook, DEFAULT_GRADE_SETTINGS, normalizeSettings, weightTotal } from "./grades";

const act = (p: Partial<Activity>): Activity =>
  ({ id: "a", class_id: "c", title: "A", instructions: null, kind: "task", tool_id: null, mode: "individual", status: "published", publish_at: null,
    due_at: null, allow_late: true, late_penalty_pct: 0, max_attempts: 1, max_score: 10, rubric: [], accept_text: true, accept_files: true,
    accept_link: true, resources: [], created_at: "", updated_at: "", grade_category: null, ...p }) as Activity;
const sub = (p: Partial<Submission>): Submission =>
  ({ id: "s", activity_id: "a", class_id: "c", student_id: "s1", team_id: null, attempt: 1, body: "x", link: null, files: [], answers: null,
    submitted_at: "2026-11-20T10:00:00Z", is_late: false, status: "graded", score: 8, rubric_scores: null, feedback: null, graded_at: null, ...p }) as Submission;
const rec = (student_id: string, status: AttRecord["status"]) => ({ student_id, status }) as AttRecord;

describe("calificaciones", () => {
  const now = Date.parse("2026-11-25T00:00:00Z");
  const activities = [
    act({ id: "a1", max_score: 10 }),
    act({ id: "a2", max_score: 100, due_at: "2026-11-21T00:00:00Z" }), // vencida
    act({ id: "a3", status: "draft" }),
  ];
  const submissions = [sub({ id: "x1", activity_id: "a1", student_id: "s1", score: 8 }), sub({ id: "x2", activity_id: "a2", student_id: "s2", score: 90 })];
  const records = [rec("s1", "present"), rec("s1", "absent"), rec("s2", "present"), rec("s2", "present")];
  const manual = [{ student_id: "s1", category_id: "exa", score: 7 }];

  it("pondera rubros y cuenta las vencidas como 0", () => {
    const [s1, s2] = computeGradebook({ studentIds: ["s1", "s2"], activities, submissions, teams: [], records, manual, settings: DEFAULT_GRADE_SETTINGS, now });
    // s1: actividades (0.8 + 0)/2 = 0.4; asistencia 0.5; examen 0.7 → (70*.4 + 10*.5 + 20*.7)/100*10 = 4.7
    expect(s1.byCategory).toEqual({ act: 0.4, asis: 0.5, exa: 0.7 });
    expect(s1.final).toBe(4.7);
    expect(s1.passing).toBe(false);
    expect(s1.risk).toContain("Calificación reprobatoria");
    expect(s1.deliveryRate).toBe(50);
    // s2: a1 pendiente (no cuenta), a2 0.9; asistencia 1; sin examen → (70*.9 + 10*1)/80*10 = 9.1
    expect(s2.byCategory.exa).toBeNull();
    expect(s2.final).toBe(9.1);
    expect(s2.pending).toBe(1);
    expect(classAverage([s1, s2])).toBe(6.9);
  });

  it("sin contar vencidas como cero y escala 100", () => {
    const settings = { ...DEFAULT_GRADE_SETTINGS, scale: 100 as const, passing: 70, missing_counts_zero: false };
    const [s1] = computeGradebook({ studentIds: ["s1"], activities, submissions, teams: [], records, manual: [{ student_id: "s1", category_id: "exa", score: 70 }], settings, now });
    expect(s1.byCategory.act).toBe(0.8);
    expect(s1.final).toBe(75);
  });

  it("normaliza ajustes", () => {
    const s = normalizeSettings({ scale: 100, categories: [{ id: "x", name: "X", weight: "50", type: "rara" }] });
    expect(s.scale).toBe(100);
    expect(s.passing).toBe(60);
    expect(s.categories[0]).toEqual({ id: "x", name: "X", weight: 50, type: "manual" });
    expect(weightTotal(DEFAULT_GRADE_SETTINGS)).toBe(100);
  });
});
