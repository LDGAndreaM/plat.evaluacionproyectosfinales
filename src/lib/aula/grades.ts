import { finalScore, isVisible, latestByOwner, studentTrack, type Activity, type Submission, type Team, type TrackStatus } from "./activities";
import { countStatuses, type AttRecord } from "./attendance";

export type CategoryType = "activities" | "attendance" | "manual";

export interface GradeCategory {
  id: string;
  name: string;
  weight: number;
  type: CategoryType;
}

export interface GradeSettings {
  scale: 10 | 100;
  passing: number;
  visible_to_students: boolean;
  missing_counts_zero: boolean;
  categories: GradeCategory[];
}

export const DEFAULT_GRADE_SETTINGS: GradeSettings = {
  scale: 10,
  passing: 6,
  visible_to_students: true,
  missing_counts_zero: true,
  categories: [
    { id: "act", name: "Actividades", weight: 70, type: "activities" },
    { id: "asis", name: "Asistencia", weight: 10, type: "attendance" },
    { id: "exa", name: "Examen", weight: 20, type: "manual" },
  ],
};

export const CATEGORY_TYPE_LABEL: Record<CategoryType, string> = {
  activities: "Promedio de actividades",
  attendance: "% de asistencia",
  manual: "Captura manual",
};

export interface ManualGrade {
  student_id: string;
  category_id: string;
  score: number | null;
}

export function normalizeSettings(raw: unknown): GradeSettings {
  const r = (raw ?? {}) as Partial<GradeSettings>;
  const scale = r.scale === 100 ? 100 : 10;
  const cats = Array.isArray(r.categories) && r.categories.length ? r.categories : DEFAULT_GRADE_SETTINGS.categories;
  return {
    scale,
    passing: Number.isFinite(Number(r.passing)) ? Number(r.passing) : scale === 100 ? 60 : 6,
    visible_to_students: r.visible_to_students !== false,
    missing_counts_zero: r.missing_counts_zero !== false,
    categories: cats.map((c) => ({
      id: String(c.id),
      name: String(c.name ?? ""),
      weight: Math.max(0, Number(c.weight) || 0),
      type: (["activities", "attendance", "manual"] as const).includes(c.type) ? c.type : "manual",
    })),
  };
}

/** Rubro de actividades al que pertenece una actividad (por defecto, el primero). */
export function activityCategory(a: Pick<Activity, "grade_category">, settings: GradeSettings) {
  const actCats = settings.categories.filter((c) => c.type === "activities");
  return actCats.find((c) => c.id === a.grade_category)?.id ?? actCats[0]?.id ?? null;
}

export interface ActivityResult {
  activity: Activity;
  status: TrackStatus;
  submission?: Submission;
  /** 0..1 si cuenta para el promedio; null si aún no cuenta (pendiente o sin calificar). */
  pct: number | null;
  score: number | null;
}

export interface StudentGrades {
  studentId: string;
  byCategory: Record<string, number | null>; // 0..1
  final: number | null; // en la escala del grupo
  passing: boolean | null;
  attendanceRate: number | null; // 0..100
  attendance: ReturnType<typeof countStatuses>;
  deliveryRate: number | null; // 0..100
  delivered: number;
  missing: number;
  pending: number;
  activities: ActivityResult[];
  risk: string[];
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function computeGradebook(input: {
  studentIds: string[];
  activities: Activity[];
  submissions: Submission[];
  teams: Team[];
  records: AttRecord[];
  manual: ManualGrade[];
  settings: GradeSettings;
  now: number;
}): StudentGrades[] {
  const { settings, now } = input;
  // Solo actividades publicadas y visibles cuentan
  const acts = input.activities.filter((a) => a.status !== "draft" && isVisible(a, now));
  const latest = new Map(acts.map((a) => [a.id, latestByOwner(input.submissions.filter((s) => s.activity_id === a.id), a.mode)]));
  const teamOf = new Map(
    acts.map((a) => [a.id, new Map(input.teams.filter((t) => t.activity_id === a.id).flatMap((t) => t.members.map((m) => [m, t.id] as const)))]),
  );

  return input.studentIds.map((sid) => {
    const results: ActivityResult[] = acts.map((a) => {
      const { status, submission } = studentTrack(sid, a, latest.get(a.id)!, teamOf.get(a.id)!, now);
      let pct: number | null = null;
      let score: number | null = null;
      if (status === "graded" && submission) {
        score = finalScore(submission, a);
        pct = score == null ? null : Math.min(1, score / Number(a.max_score));
      } else if (status === "missing" && settings.missing_counts_zero) {
        pct = 0;
        score = 0;
      }
      return { activity: a, status, submission, pct, score };
    });

    const att = countStatuses(input.records.filter((r) => r.student_id === sid).map((r) => r.status));
    const byCategory: Record<string, number | null> = {};
    for (const c of settings.categories) {
      if (c.type === "activities") {
        const list = results.filter((r) => activityCategory(r.activity, settings) === c.id && r.pct != null).map((r) => r.pct!);
        byCategory[c.id] = list.length ? list.reduce((x, y) => x + y, 0) / list.length : null;
      } else if (c.type === "attendance") {
        byCategory[c.id] = att.rate == null ? null : att.rate / 100;
      } else {
        const m = input.manual.find((g) => g.student_id === sid && g.category_id === c.id);
        byCategory[c.id] = m?.score == null ? null : Math.min(1, Number(m.score) / settings.scale);
      }
    }
    let wSum = 0;
    let acc = 0;
    for (const c of settings.categories) {
      const v = byCategory[c.id];
      if (v == null || c.weight <= 0) continue;
      wSum += c.weight;
      acc += c.weight * v;
    }
    const final = wSum > 0 ? round1((acc / wSum) * settings.scale) : null;

    const delivered = results.filter((r) => ["submitted", "late", "graded", "returned"].includes(r.status)).length;
    const missing = results.filter((r) => r.status === "missing").length;
    const pending = results.filter((r) => r.status === "pending").length;
    const due = delivered + missing;
    const deliveryRate = due ? round1((delivered / due) * 100) : null;

    const risk: string[] = [];
    if (final != null && final < settings.passing) risk.push("Calificación reprobatoria");
    if (att.rate != null && att.rate < 80) risk.push("Asistencia menor a 80%");
    if (missing >= 2) risk.push(`${missing} actividades sin entregar`);

    return {
      studentId: sid,
      byCategory,
      final,
      passing: final == null ? null : final >= settings.passing,
      attendanceRate: att.rate,
      attendance: att,
      deliveryRate,
      delivered,
      missing,
      pending,
      activities: results,
      risk,
    };
  });
}

export function weightTotal(settings: GradeSettings) {
  return settings.categories.reduce((s, c) => s + (Number(c.weight) || 0), 0);
}

export function classAverage(rows: StudentGrades[]) {
  const v = rows.map((r) => r.final).filter((x): x is number => x != null);
  return v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
