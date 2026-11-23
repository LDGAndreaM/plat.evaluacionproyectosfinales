import { describe, expect, it } from "vitest";
import { buildReport, REPORTS, reportFileName, type ReportData } from "./reports";
import { computeGradebook, DEFAULT_GRADE_SETTINGS } from "./grades";
import type { Activity } from "./activities";
import type { ClassStudent } from "./types";

const students = [
  { id: "s1", first_name: "Ana", last_name: "López", email: "ana@x.mx", student_number: "1", section: "7A", status: "active" },
  { id: "s2", first_name: "Luis", last_name: "Pérez", email: "luis@x.mx", student_number: "2", section: "7A", status: "active" },
] as ClassStudent[];
const activities = [
  { id: "a1", title: "Tarea 1", max_score: 10, status: "published", publish_at: null, due_at: "2026-11-01T00:00:00Z", mode: "individual", late_penalty_pct: 0, grade_category: null },
] as unknown as Activity[];
const sessions = [{ id: "x1", starts_at: "2026-11-18T15:00:00Z" }] as ReportData["sessions"];
const records = [
  { session_id: "x1", student_id: "s1", status: "present" },
  { session_id: "x1", student_id: "s2", status: "absent" },
] as ReportData["records"];
const grades = computeGradebook({
  studentIds: ["s1", "s2"],
  activities,
  submissions: [{ id: "u", activity_id: "a1", student_id: "s1", team_id: null, submitted_at: "2026-10-30T00:00:00Z", status: "graded", score: 9, is_late: false } as never],
  teams: [],
  records: records as never,
  manual: [],
  settings: DEFAULT_GRADE_SETTINGS,
  now: Date.parse("2026-11-20T00:00:00Z"),
});
const data: ReportData = {
  cls: { id: "c", name: "Diseño 7A", subject: null, period: null, grade: null },
  teacher: "Mtra. A",
  students,
  sessions,
  records,
  excuses: [],
  activities,
  grades,
  settings: DEFAULT_GRADE_SETTINGS,
};

describe("reportes", () => {
  it("hay 9 reportes y todos se generan", () => {
    expect(REPORTS).toHaveLength(9);
    for (const r of REPORTS) expect(buildReport(r.key, data, "s1").length).toBeGreaterThan(0);
  });
  it("calificación final y riesgo", () => {
    const [t] = buildReport("final_grades", data);
    expect(t.rows[0]).toContain("Aprobado");
    expect(t.rows[1]).toContain("Reprobado");
    expect(t.highlight).toEqual([1]);
    const [risk] = buildReport("risk", data);
    expect(risk.rows).toHaveLength(1);
    expect(String(risk.rows[0][5])).toContain("Asistencia");
  });
  it("asistencia por sesión y nombre de archivo", () => {
    const [t] = buildReport("attendance_sessions", data);
    expect(t.rows[0].slice(1)).toEqual(["P", "100%"]);
    expect(t.rows[1].slice(1)).toEqual(["F", "0%"]);
    expect(reportFileName("final_grades", "Diseño 7A")).toBe("calificacion-final-diseno-7a");
  });
});
