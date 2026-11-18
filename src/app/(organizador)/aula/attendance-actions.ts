"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { ATT_STATUSES, type AttStatus } from "@/lib/aula/attendance";
import type { ActionResult } from "@/lib/types";

const DURATIONS = [2, 5, 10, 15];

export async function openAttendance(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const classId = String(fd.get("class_id") ?? "");
  const minutes = Number(fd.get("minutes"));
  if (!DURATIONS.includes(minutes)) return { ok: false, error: "Elige la duración del QR." };
  const { data, error } = await supabase.rpc("open_attendance", { cid: classId, minutes, topic: String(fd.get("topic") ?? "") });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/aula/${classId}`, "layout");
  redirect(`/aula/${classId}/asistencia/${data}`);
}

export async function extendAttendance(classId: string, sessionId: string, minutes: number) {
  const { supabase } = await requireTeacher();
  if (!DURATIONS.includes(minutes)) return { ok: false, error: "Duración no válida" };
  const { error } = await supabase.rpc("extend_attendance", { sid: sessionId, minutes });
  revalidatePath(`/aula/${classId}`, "layout");
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function closeAttendance(classId: string, sessionId: string) {
  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("close_attendance", { sid: sessionId });
  revalidatePath(`/aula/${classId}`, "layout");
  return error ? { ok: false as const, error: error.message } : { ok: true as const, absences: data as number };
}

export async function deleteSession(classId: string, sessionId: string) {
  const { supabase } = await requireTeacher();
  await supabase.from("attendance_sessions").delete().eq("id", sessionId).eq("class_id", classId);
  revalidatePath(`/aula/${classId}`, "layout");
  redirect(`/aula/${classId}/asistencia`);
}

/** Cambio manual del estado de un estudiante en una sesión (queda en el historial). */
export async function setAttendance(classId: string, sessionId: string, studentId: string, status: AttStatus, note?: string) {
  const { supabase } = await requireTeacher();
  if (!ATT_STATUSES.includes(status)) return { ok: false, error: "Estado no válido" };
  const cleanNote = (note ?? "").trim().slice(0, 300) || null;
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id")
    .eq("session_id", sessionId)
    .eq("student_id", studentId)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("attendance_records").update({ status, method: "manual", note: cleanNote }).eq("id", existing.id)
    : await supabase
        .from("attendance_records")
        .insert({ session_id: sessionId, class_id: classId, student_id: studentId, status, method: "manual", note: cleanNote });
  revalidatePath(`/aula/${classId}`, "layout");
  return error ? { ok: false, error: "No se pudo guardar." } : { ok: true };
}

export async function saveAttendanceSettings(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const id = String(fd.get("class_id") ?? "");
  const late = Math.round(Number(fd.get("late_after_min")));
  const radius = Math.round(Number(fd.get("radius")));
  const latRaw = String(fd.get("lat") ?? "").trim();
  const lngRaw = String(fd.get("lng") ?? "").trim();
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  if (!Number.isFinite(late) || late < 0 || late > 240) return { ok: false, error: "La tolerancia debe estar entre 0 y 240 minutos." };
  if (!Number.isFinite(radius) || radius < 20 || radius > 5000) return { ok: false, error: "El radio debe estar entre 20 y 5000 metros." };
  if ((lat == null) !== (lng == null)) return { ok: false, error: "Escribe latitud y longitud, o deja ambas vacías." };
  if (lat != null && (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng!) || Math.abs(lng!) > 180))
    return { ok: false, error: "La ubicación no es válida." };
  const require = fd.get("require_location") === "on";
  if (require && lat == null) return { ok: false, error: "Para exigir ubicación primero guarda la ubicación del aula." };
  const { error } = await supabase
    .from("classes")
    .update({ att_late_after_min: late, att_radius_m: radius, att_lat: lat, att_lng: lng, att_require_location: require })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudieron guardar los ajustes." };
  revalidatePath(`/aula/${id}`, "layout");
  return { ok: true, message: "Ajustes de asistencia guardados." };
}

export async function reviewExcuse(classId: string, excuseId: string, decision: "approved" | "rejected" | "needs_info", comment: string) {
  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("review_excuse", { eid: excuseId, decision, comment });
  revalidatePath(`/aula/${classId}`, "layout");
  return error ? { ok: false as const, error: error.message } : { ok: true as const, updated: data as number };
}

/** URL temporal (10 min) para ver el archivo de un justificante. */
export async function excuseFileUrl(path: string) {
  const { supabase } = await requireTeacher();
  const { data } = await supabase.storage.from("excuses").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/** CSV: estudiantes × sesiones con la letra del estado y el % final. */
export async function exportAttendanceCsv(classId: string) {
  const { supabase } = await requireTeacher();
  const { data: cls } = await supabase.from("classes").select("name").eq("id", classId).maybeSingle();
  if (!cls) return null;
  const [{ data: students }, { data: sessions }, { data: records }] = await Promise.all([
    supabase.from("class_students").select("id, first_name, last_name, email, student_number").eq("class_id", classId).eq("status", "active"),
    supabase.from("attendance_sessions").select("id, starts_at, topic").eq("class_id", classId).order("starts_at"),
    supabase.from("attendance_records").select("session_id, student_id, status").eq("class_id", classId),
  ]);
  const { ATT_INFO, countStatuses, sessionLabel } = await import("@/lib/aula/attendance");
  const Papa = (await import("papaparse")).default;
  const map = new Map((records ?? []).map((r) => [`${r.session_id}:${r.student_id}`, r.status as AttStatus]));
  const sorted = [...(students ?? [])].sort((a, b) => a.last_name.localeCompare(b.last_name, "es") || a.first_name.localeCompare(b.first_name, "es"));
  const rows = sorted.map((s, i) => {
    const statuses = (sessions ?? []).map((x) => map.get(`${x.id}:${s.id}`)).filter((v): v is AttStatus => !!v);
    const c = countStatuses(statuses);
    return [
      i + 1,
      s.last_name,
      s.first_name,
      s.student_number ?? "",
      s.email ?? "",
      ...(sessions ?? []).map((x) => {
        const st = map.get(`${x.id}:${s.id}`);
        return st ? ATT_INFO[st].short : "";
      }),
      c.present,
      c.late,
      c.absent,
      c.excused,
      c.rate == null ? "" : `${c.rate}%`,
    ];
  });
  const csv = Papa.unparse({
    fields: ["No.", "Apellidos", "Nombre", "Matrícula", "Correo", ...(sessions ?? []).map((x) => sessionLabel(x.starts_at)), "P", "R", "F", "J", "% asistencia"],
    data: rows,
  });
  return { csv: "P = Presente, R = Retardo, F = Falta, J = Falta justificada, ? = Pendiente de revisión\n" + csv, name: cls.name };
}
