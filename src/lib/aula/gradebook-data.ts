import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { getClassActivities } from "./activities-data";
import { getClassAttendance } from "./attendance-data";
import { getTeacherClass } from "./data";
import { isVisible, type Activity, type Submission } from "./activities";
import type { AttRecord } from "./attendance";
import { computeGradebook, normalizeSettings, type ManualGrade } from "./grades";
import { byLastName } from "./types";

/** Todo lo necesario para calificaciones y reportes de un grupo (docente). */
export const loadClassGradebook = cache(async (classId: string) => {
  const { supabase, fullName } = await requireUser();
  const [{ cls, students }, att, acts, { data: manual }] = await Promise.all([
    getTeacherClass(classId),
    getClassAttendance(classId),
    getClassActivities(classId),
    supabase.from("class_manual_grades").select("student_id, category_id, score").eq("class_id", classId),
  ]);
  const settings = normalizeSettings(cls.grade_settings);
  const active = students.filter((s) => s.status === "active").sort(byLastName);
  const now = new Date().getTime();
  const visibleActs = acts.activities.filter((a) => a.status !== "draft" && isVisible(a, now));
  const grades = computeGradebook({
    studentIds: active.map((s) => s.id),
    activities: visibleActs,
    submissions: acts.submissions,
    teams: acts.teams,
    records: att.records,
    manual: (manual ?? []) as ManualGrade[],
    settings,
    now,
  });
  return {
    cls,
    teacher: fullName,
    settings,
    students: active,
    sessions: att.sessions,
    records: att.records,
    excuses: att.excuses,
    activities: visibleActs,
    allActivities: acts.activities,
    manual: (manual ?? []) as ManualGrade[],
    grades,
  };
});

/** Calificaciones del estudiante en cada uno de sus grupos (solo donde el docente las muestra). */
export const getMyGrades = cache(async () => {
  const { supabase, userId } = await requireUser();
  const { data: rows } = await supabase.from("class_students").select("id, class_id").eq("user_id", userId).eq("status", "active");
  const mine = rows ?? [];
  if (!mine.length) return [];
  const classIds = mine.map((r) => r.class_id);
  const [{ data: classes }, { data: activities }, { data: subs }, { data: members }, { data: records }, { data: manual }] = await Promise.all([
    supabase.from("classes").select("id, name, color, grade_settings, archived_at").in("id", classIds),
    supabase.from("activities").select("*").in("class_id", classIds),
    supabase.from("activity_submissions").select("id, activity_id, class_id, student_id, team_id, attempt, submitted_at, is_late, status, score, rubric_scores, feedback, graded_at").in("class_id", classIds),
    supabase.from("activity_team_members").select("team_id, activity_id, student_id"),
    supabase.from("attendance_records").select("session_id, student_id, status, class_id").in("class_id", classIds),
    supabase.from("class_manual_grades").select("student_id, category_id, score"),
  ]);
  const now = new Date().getTime();
  return mine
    .map((row) => {
      const cls = (classes ?? []).find((c) => c.id === row.class_id);
      if (!cls) return null;
      const settings = normalizeSettings(cls.grade_settings);
      if (!settings.visible_to_students) return { cls, settings, grades: null };
      const acts = ((activities ?? []) as Activity[]).filter((a) => a.class_id === cls.id && a.status !== "draft" && isVisible(a, now));
      const teams = (members ?? [])
        .filter((m) => acts.some((a) => a.id === m.activity_id))
        .map((m) => ({ id: m.team_id, activity_id: m.activity_id, name: "", members: [m.student_id] }));
      const [grades] = computeGradebook({
        studentIds: [row.id],
        activities: acts,
        submissions: ((subs ?? []) as Submission[]).filter((s) => s.class_id === cls.id),
        teams,
        records: ((records ?? []) as AttRecord[]).filter((r) => r.student_id === row.id),
        manual: ((manual ?? []) as ManualGrade[]).filter((m) => m.student_id === row.id),
        settings,
        now,
      });
      return { cls, settings, grades };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
});
