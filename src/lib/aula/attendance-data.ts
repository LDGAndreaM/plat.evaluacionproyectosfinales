import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import type { AttRecord, AttSession, Excuse } from "./attendance";

/** Sesiones, registros y justificantes de un grupo (docente). */
export const getClassAttendance = cache(async (classId: string) => {
  const { supabase } = await requireUser();
  const [{ data: sessions }, { data: records }, { data: excuses }] = await Promise.all([
    supabase.from("attendance_sessions").select("*").eq("class_id", classId).order("starts_at", { ascending: false }),
    supabase.from("attendance_records").select("*").eq("class_id", classId),
    supabase.from("excuses").select("*").eq("class_id", classId).order("created_at", { ascending: false }),
  ]);
  return {
    sessions: (sessions ?? []) as AttSession[],
    records: (records ?? []) as AttRecord[],
    excuses: (excuses ?? []) as Excuse[],
  };
});

/** Asistencia del estudiante en sus grupos. */
export const getMyAttendance = cache(async () => {
  const { supabase, userId } = await requireUser();
  const { data: rows } = await supabase.from("class_students").select("id, class_id").eq("user_id", userId).eq("status", "active");
  const classIds = (rows ?? []).map((r) => r.class_id);
  if (!classIds.length) return { sessions: [] as AttSession[], records: [] as AttRecord[], studentIds: new Map<string, string>() };
  const [{ data: sessions }, { data: records }] = await Promise.all([
    supabase.from("attendance_sessions").select("*").in("class_id", classIds).order("starts_at", { ascending: false }),
    supabase.from("attendance_records").select("*").in("class_id", classIds),
  ]);
  return {
    sessions: (sessions ?? []) as AttSession[],
    records: (records ?? []) as AttRecord[],
    studentIds: new Map((rows ?? []).map((r) => [r.class_id, r.id])),
  };
});
