"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DAYS, type ScheduleSlot } from "@/lib/aula/types";
import { EMAIL_RE, type RosterEntry } from "@/lib/aula/roster";
import type { ActionResult } from "@/lib/types";

const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max) || null;

function parseSchedule(raw: FormDataEntryValue | null): ScheduleSlot[] {
  try {
    const list = JSON.parse(String(raw ?? "[]")) as ScheduleSlot[];
    const days = DAYS.map((d) => d.key) as string[];
    const time = /^\d{2}:\d{2}$/;
    return list
      .filter((s) => days.includes(s.day))
      .map((s) => ({ day: s.day, start: time.test(s.start) ? s.start : "", end: time.test(s.end) ? s.end : "" }))
      .slice(0, 20);
  } catch {
    return [];
  }
}

function classFields(fd: FormData) {
  const color = String(fd.get("color") ?? "");
  return {
    name: str(fd, "name", 150),
    subject: str(fd, "subject", 150),
    period: str(fd, "period", 80),
    grade: str(fd, "grade", 40),
    description: str(fd, "description", 2000),
    schedule: parseSchedule(fd.get("schedule")),
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "#6a11cb",
  };
}

export async function createClass(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireTeacher();
  const fields = classFields(fd);
  if (!fields.name) return { ok: false, error: "Escribe el nombre del grupo." };
  const { data, error } = await supabase
    .from("classes")
    .insert({ ...fields, name: fields.name, owner_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: "No se pudo crear el grupo." };
  revalidatePath("/aula");
  redirect(`/aula/${data.id}/estudiantes?nuevo=1`);
}

export async function updateClass(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const id = String(fd.get("id") ?? "");
  const fields = classFields(fd);
  if (!fields.name) return { ok: false, error: "Escribe el nombre del grupo." };
  const { error } = await supabase.from("classes").update({ ...fields, name: fields.name }).eq("id", id);
  if (error) return { ok: false, error: "No se pudieron guardar los cambios." };
  revalidatePath(`/aula/${id}`, "layout");
  revalidatePath("/aula");
  return { ok: true, message: "Cambios guardados." };
}

export async function setClassArchived(id: string, archived: boolean) {
  const { supabase } = await requireTeacher();
  await supabase.from("classes").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath(`/aula/${id}`, "layout");
  revalidatePath("/aula");
}

export async function deleteClass(id: string) {
  const { supabase } = await requireTeacher();
  await supabase.from("classes").delete().eq("id", id);
  revalidatePath("/aula");
  redirect("/aula");
}

export async function setJoinEnabled(id: string, enabled: boolean) {
  const { supabase } = await requireTeacher();
  await supabase.from("classes").update({ join_enabled: enabled }).eq("id", id);
  revalidatePath(`/aula/${id}`, "layout");
}

export async function regenerateJoinCode(id: string) {
  const { supabase } = await requireTeacher();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(7));
    const code = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
    const { error } = await supabase.from("classes").update({ join_code: code }).eq("id", id);
    if (!error) break;
  }
  revalidatePath(`/aula/${id}`, "layout");
}

/* ---------------- Estudiantes ---------------- */

function studentFields(fd: FormData) {
  return {
    first_name: str(fd, "first_name", 80),
    last_name: str(fd, "last_name", 120) ?? "",
    email: str(fd, "email", 200)?.toLowerCase() ?? null,
    student_number: str(fd, "student_number", 40),
    section: str(fd, "section", 40),
    extra_id: str(fd, "extra_id", 60),
  };
}

function studentError(code?: string) {
  if (code === "23505") return "Ya hay un estudiante con ese correo en el grupo.";
  return "No se pudo guardar el estudiante.";
}

export async function addStudent(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const classId = String(fd.get("class_id") ?? "");
  const f = studentFields(fd);
  if (!f.first_name) return { ok: false, error: "Escribe el nombre." };
  if (!f.email) return { ok: false, error: "Escribe el correo: con él, el estudiante entra al grupo automáticamente." };
  if (!EMAIL_RE.test(f.email)) return { ok: false, error: "El correo no es válido." };
  const { error } = await supabase.from("class_students").insert({ ...f, first_name: f.first_name, class_id: classId });
  if (error) return { ok: false, error: studentError(error.code) };
  revalidatePath(`/aula/${classId}`, "layout");
  return { ok: true, message: `${f.first_name} quedó invitado. Comparte el enlace o el código del grupo.` };
}

export async function updateStudent(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const id = String(fd.get("id") ?? "");
  const classId = String(fd.get("class_id") ?? "");
  const f = studentFields(fd);
  if (!f.first_name) return { ok: false, error: "Escribe el nombre." };
  if (f.email && !EMAIL_RE.test(f.email)) return { ok: false, error: "El correo no es válido." };
  // El correo de un estudiante que ya entró con su cuenta no se cambia aquí
  const { data: current } = await supabase.from("class_students").select("user_id, email").eq("id", id).maybeSingle();
  const update = current?.user_id ? { ...f, first_name: f.first_name, email: current.email } : { ...f, first_name: f.first_name };
  const { error } = await supabase.from("class_students").update(update).eq("id", id);
  if (error) return { ok: false, error: studentError(error.code) };
  revalidatePath(`/aula/${classId}`, "layout");
  return { ok: true, message: "Datos actualizados." };
}

export async function removeStudent(classId: string, id: string) {
  const { supabase } = await requireTeacher();
  await supabase.from("class_students").delete().eq("id", id).eq("class_id", classId);
  revalidatePath(`/aula/${classId}`, "layout");
}

/** Importa las filas válidas del CSV (ya revisadas en la vista previa). */
export async function importStudents(
  classId: string,
  entries: RosterEntry[],
): Promise<{ ok: true; inserted: number; skipped: number } | { ok: false; error: string }> {
  const { supabase } = await requireTeacher();
  if (entries.length > 1000) return { ok: false, error: "Importa como máximo 1000 estudiantes a la vez." };
  const { data: existing, error: e1 } = await supabase.from("class_students").select("email").eq("class_id", classId);
  if (e1) return { ok: false, error: "No tienes acceso a este grupo." };
  const seen = new Set((existing ?? []).map((r) => (r.email ?? "").toLowerCase()));
  const clip = (v: string | null | undefined, n: number) => (v ?? "").trim().slice(0, n) || null;
  const rows = [];
  for (const e of entries) {
    const email = (e.email ?? "").trim().toLowerCase();
    const first = clip(e.first_name, 80);
    if (!first || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    rows.push({
      class_id: classId,
      first_name: first,
      last_name: clip(e.last_name, 120) ?? "",
      email,
      student_number: clip(e.student_number, 40),
      section: clip(e.section, 40),
      extra_id: clip(e.extra_id, 60),
    });
  }
  if (rows.length) {
    const { error } = await supabase.from("class_students").insert(rows);
    if (error) return { ok: false, error: "No se pudo importar la lista. Revisa el archivo e inténtalo de nuevo." };
  }
  revalidatePath(`/aula/${classId}`, "layout");
  return { ok: true, inserted: rows.length, skipped: entries.length - rows.length };
}

/* ---------------- Estudiante: unirse ---------------- */

export async function joinClassByCode(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  // Sin requireUser: una cuenta nueva (sin rol aún) también puede unirse y queda como estudiante
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims || auth.claims.is_anonymous) return { ok: false, error: "Inicia sesión para unirte." };
  const { data: me } = await supabase.from("organizers").select("role").eq("id", auth.claims.sub).maybeSingle();
  const role = me?.role ?? null;
  const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return { ok: false, error: "Escribe el código del grupo." };
  if (role === "teacher") return { ok: false, error: "Tu cuenta es de docente. Para unirte como estudiante usa una cuenta de estudiante." };
  const { data, error } = await supabase.rpc("join_class", { code });
  if (error) return { ok: false, error: error.message.includes("no existe") ? "No encontramos un grupo con ese código." : error.message };
  revalidatePath("/aula");
  revalidatePath("/inicio");
  redirect(`/aula/${data}`);
}
