import { formatScore, TRACK_INFO, type Activity } from "./activities";
import { ATT_INFO, countStatuses, dateRangeLabel, EXCUSE_INFO, formatRate, sessionLabel, type AttRecord, type AttSession, type Excuse } from "./attendance";
import { round1, type GradeSettings, type StudentGrades } from "./grades";
import type { ClassRow, ClassStudent } from "./types";
import { studentName } from "./types";

export type Cell = string | number | null;

export interface ReportTable {
  title: string;
  subtitle?: string;
  columns: { label: string; width?: number; align?: "left" | "right" | "center" }[];
  rows: Cell[][];
  /** Índices de fila a resaltar (p. ej. reprobados). */
  highlight?: number[];
  note?: string;
}

export interface ReportData {
  cls: Pick<ClassRow, "id" | "name" | "subject" | "period" | "grade">;
  teacher: string;
  students: ClassStudent[]; // activos, ordenados por apellido
  sessions: AttSession[];
  records: Pick<AttRecord, "session_id" | "student_id" | "status">[];
  excuses: Excuse[];
  activities: Activity[]; // publicadas y visibles
  grades: StudentGrades[]; // mismo orden que students
  settings: GradeSettings;
}

export type ReportKey =
  | "students"
  | "attendance_sessions"
  | "attendance_summary"
  | "excuses"
  | "deliveries"
  | "activity_scores"
  | "final_grades"
  | "risk"
  | "individual";

export const REPORTS: { key: ReportKey; title: string; description: string; formats: ("xlsx" | "csv" | "pdf")[] }[] = [
  { key: "students", title: "Lista de estudiantes", description: "Nombre, correo, matrícula y estado.", formats: ["xlsx", "csv", "pdf"] },
  { key: "attendance_sessions", title: "Asistencia por sesión", description: "Una columna por clase con P, R, F, J o ?.", formats: ["xlsx", "csv", "pdf"] },
  { key: "attendance_summary", title: "Resumen de asistencia", description: "Totales por estudiante y porcentaje.", formats: ["xlsx", "csv", "pdf"] },
  { key: "excuses", title: "Justificantes", description: "Fechas, motivo, estado y tu comentario.", formats: ["xlsx", "csv", "pdf"] },
  { key: "deliveries", title: "Seguimiento de entregas", description: "Quién entregó, a tiempo o tarde, y quién no.", formats: ["xlsx", "csv", "pdf"] },
  { key: "activity_scores", title: "Calificaciones por actividad", description: "La calificación de cada actividad (con descuentos).", formats: ["xlsx", "csv", "pdf"] },
  { key: "final_grades", title: "Calificación final", description: "Rubros con ponderación, final y si aprueba.", formats: ["xlsx", "csv", "pdf"] },
  { key: "risk", title: "Estudiantes en riesgo", description: "Reprobando, con asistencia < 80 % o 2+ entregas faltantes.", formats: ["xlsx", "csv", "pdf"] },
  { key: "individual", title: "Reporte individual", description: "Todo de un estudiante: calificación, actividades y asistencia.", formats: ["pdf", "xlsx"] },
];

const pct = (v: number | null | undefined) => (v == null ? "—" : `${round1(v * 100)}%`);
const lastFirst = (s: ClassStudent) => `${s.last_name}${s.last_name ? ", " : ""}${s.first_name}`;

export function buildReport(key: ReportKey, d: ReportData, studentId?: string): ReportTable[] {
  const scale = d.settings.scale;
  switch (key) {
    case "students":
      return [
        {
          title: "Lista de estudiantes",
          columns: [{ label: "No.", width: 30 }, { label: "Apellidos" }, { label: "Nombre" }, { label: "Correo" }, { label: "Matrícula" }, { label: "Grupo" }],
          rows: d.students.map((s, i) => [i + 1, s.last_name, s.first_name, s.email ?? "", s.student_number ?? "", s.section ?? ""]),
        },
      ];
    case "attendance_sessions": {
      const map = new Map(d.records.map((r) => [`${r.session_id}:${r.student_id}`, r.status]));
      const sessions = [...d.sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      return [
        {
          title: "Asistencia por sesión",
          columns: [
            { label: "Estudiante" },
            ...sessions.map((s) => ({ label: sessionLabel(s.starts_at).replace(" · ", "\n"), width: 44, align: "center" as const })),
            { label: "%", width: 44, align: "right" as const },
          ],
          rows: d.students.map((s) => {
            const st = sessions.map((x) => map.get(`${x.id}:${s.id}`));
            return [lastFirst(s), ...st.map((v) => (v ? ATT_INFO[v].short : "")), formatRate(countStatuses(st.filter((v) => !!v) as AttRecord["status"][]).rate)];
          }),
          note: "P = Presente · R = Retardo · F = Falta · J = Falta justificada · ? = Pendiente de revisión",
        },
      ];
    }
    case "attendance_summary":
      return [
        {
          title: "Resumen de asistencia",
          subtitle: `${d.sessions.length} sesiones`,
          columns: [
            { label: "Estudiante" },
            { label: "Presente", align: "right" },
            { label: "Retardo", align: "right" },
            { label: "Falta", align: "right" },
            { label: "Justificada", align: "right" },
            { label: "Revisión", align: "right" },
            { label: "% asistencia", align: "right" },
          ],
          rows: d.students.map((s, i) => {
            const c = d.grades[i].attendance;
            return [lastFirst(s), c.present, c.late, c.absent, c.excused, c.review, formatRate(c.rate)];
          }),
          highlight: d.grades.map((g, i) => (g.attendanceRate != null && g.attendanceRate < 80 ? i : -1)).filter((i) => i >= 0),
        },
      ];
    case "excuses": {
      const name = new Map(d.students.map((s) => [s.id, lastFirst(s)]));
      return [
        {
          title: "Justificantes",
          columns: [{ label: "Estudiante" }, { label: "Fechas" }, { label: "Motivo" }, { label: "Estado" }, { label: "Comentario" }],
          rows: d.excuses.map((e) => [name.get(e.student_id) ?? "—", dateRangeLabel(e.date_from, e.date_to), e.reason, EXCUSE_INFO[e.status].label, e.teacher_comment ?? ""]),
        },
      ];
    }
    case "deliveries":
      return [
        {
          title: "Seguimiento de entregas",
          columns: [{ label: "Estudiante" }, ...d.activities.map((a) => ({ label: a.title, width: 70, align: "center" as const })), { label: "% entregas", align: "right" }],
          rows: d.students.map((s, i) => [
            lastFirst(s),
            ...d.grades[i].activities.map((r) => TRACK_INFO[r.status].label),
            d.grades[i].deliveryRate == null ? "—" : `${d.grades[i].deliveryRate}%`,
          ]),
        },
      ];
    case "activity_scores":
      return [
        {
          title: "Calificaciones por actividad",
          subtitle: "Incluye descuentos por entrega tardía. Vacío = aún sin calificar.",
          columns: [
            { label: "Estudiante" },
            ...d.activities.map((a) => ({ label: `${a.title} (/${formatScore(Number(a.max_score))})`, width: 70, align: "right" as const })),
          ],
          rows: d.students.map((s, i) => [lastFirst(s), ...d.grades[i].activities.map((r) => (r.score == null ? "" : formatScore(r.score)))]),
        },
      ];
    case "final_grades":
      return [
        {
          title: "Calificación final",
          subtitle: `Escala 0–${scale} · Aprobatoria: ${d.settings.passing} · ${d.settings.categories.map((c) => `${c.name} ${c.weight}%`).join(", ")}`,
          columns: [
            { label: "Estudiante" },
            ...d.settings.categories.map((c) => ({ label: `${c.name} (${c.weight}%)`, align: "right" as const })),
            { label: "Final", align: "right" },
            { label: "Resultado" },
            { label: "Asistencia", align: "right" },
            { label: "Entregas", align: "right" },
          ],
          rows: d.students.map((s, i) => {
            const g = d.grades[i];
            return [
              lastFirst(s),
              ...d.settings.categories.map((c) => pct(g.byCategory[c.id])),
              g.final == null ? "—" : g.final,
              g.passing == null ? "Sin datos" : g.passing ? "Aprobado" : "Reprobado",
              formatRate(g.attendanceRate),
              g.deliveryRate == null ? "—" : `${g.deliveryRate}%`,
            ];
          }),
          highlight: d.grades.map((g, i) => (g.passing === false ? i : -1)).filter((i) => i >= 0),
        },
      ];
    case "risk": {
      const idx = d.grades.map((g, i) => (g.risk.length ? i : -1)).filter((i) => i >= 0);
      return [
        {
          title: "Estudiantes en riesgo",
          subtitle: idx.length ? `${idx.length} de ${d.students.length} estudiantes` : "Ningún estudiante en riesgo",
          columns: [
            { label: "Estudiante" },
            { label: "Correo" },
            { label: "Final", align: "right" },
            { label: "Asistencia", align: "right" },
            { label: "Sin entregar", align: "right" },
            { label: "Motivos" },
          ],
          rows: idx.map((i) => {
            const s = d.students[i];
            const g = d.grades[i];
            return [lastFirst(s), s.email ?? "", g.final ?? "—", formatRate(g.attendanceRate), g.missing, g.risk.join("; ")];
          }),
        },
      ];
    }
    case "individual": {
      const i = d.students.findIndex((s) => s.id === studentId);
      if (i < 0) return [];
      const s = d.students[i];
      const g = d.grades[i];
      const recs = d.records.filter((r) => r.student_id === s.id);
      const bySession = new Map(recs.map((r) => [r.session_id, r.status]));
      return [
        {
          title: `Reporte de ${studentName(s)}`,
          subtitle: [s.email, s.student_number && `Matrícula ${s.student_number}`].filter(Boolean).join(" · "),
          columns: [{ label: "Concepto" }, { label: "Valor", align: "right" }],
          rows: [
            ["Calificación final", g.final == null ? "—" : `${g.final} / ${scale}`],
            ["Resultado", g.passing == null ? "Sin datos" : g.passing ? "Aprobado" : "Reprobado"],
            ...d.settings.categories.map((c) => [`${c.name} (${c.weight}%)`, pct(g.byCategory[c.id])] as Cell[]),
            ["Asistencia", formatRate(g.attendanceRate)],
            ["Entregas a tiempo o tarde", g.deliveryRate == null ? "—" : `${g.deliveryRate}%`],
            ["Actividades sin entregar", g.missing],
          ],
        },
        {
          title: "Actividades",
          columns: [{ label: "Actividad" }, { label: "Estado" }, { label: "Calificación", align: "right" }],
          rows: g.activities.map((r) => [r.activity.title, TRACK_INFO[r.status].label, r.score == null ? "—" : `${formatScore(r.score)} / ${formatScore(Number(r.activity.max_score))}`]),
        },
        {
          title: "Asistencia",
          subtitle: `Presente ${g.attendance.present} · Retardo ${g.attendance.late} · Falta ${g.attendance.absent} · Justificada ${g.attendance.excused}`,
          columns: [{ label: "Sesión" }, { label: "Estado" }],
          rows: [...d.sessions]
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
            .map((x) => [sessionLabel(x.starts_at), bySession.get(x.id) ? ATT_INFO[bySession.get(x.id)!].label : "Sin registro"]),
        },
      ];
    }
  }
}

export function reportFileName(key: ReportKey, className: string, student?: ClassStudent) {
  const base = REPORTS.find((r) => r.key === key)?.title ?? "reporte";
  return `${base}-${className}${student ? `-${studentName(student)}` : ""}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 90);
}
