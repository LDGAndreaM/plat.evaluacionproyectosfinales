import type { ReportData } from "./reports";
import type { loadClassGradebook } from "./gradebook-data";

/** Versión ligera (sin respuestas ni textos de entregas) para mandar al navegador. */
export function toReportData(g: Awaited<ReturnType<typeof loadClassGradebook>>): ReportData {
  return {
    cls: { id: g.cls.id, name: g.cls.name, subject: g.cls.subject, period: g.cls.period, grade: g.cls.grade },
    teacher: g.teacher,
    students: g.students,
    sessions: g.sessions,
    records: g.records.map((r) => ({ session_id: r.session_id, student_id: r.student_id, status: r.status })),
    excuses: g.excuses,
    activities: g.activities,
    grades: g.grades.map((x) => ({ ...x, activities: x.activities.map((r) => ({ activity: r.activity, status: r.status, pct: r.pct, score: r.score })) })),
    settings: g.settings,
  };
}
