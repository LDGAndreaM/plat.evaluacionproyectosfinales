"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { AttStatus } from "@/lib/aula/attendance";
import type { ActionResult } from "@/lib/types";

export interface CheckInResult {
  ok: boolean;
  error?: string;
  status?: AttStatus;
  className?: string;
  distance?: number | null;
  locationOk?: boolean | null;
  already?: boolean;
}

export async function checkIn(input: {
  code: string;
  session?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  locationError?: string | null;
}): Promise<CheckInResult> {
  const { supabase, role } = await requireUser();
  if (role !== "student") return { ok: false, error: "Solo las cuentas de estudiante registran asistencia." };
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const { data, error } = await supabase.rpc("check_in", {
    code: String(input.code ?? "").slice(0, 12),
    session: input.session && /^[0-9a-f-]{36}$/i.test(input.session) ? input.session : null,
    lat: num(input.lat),
    lng: num(input.lng),
    accuracy: num(input.accuracy),
    location_error: input.locationError ? String(input.locationError).slice(0, 120) : null,
  });
  if (error) return { ok: false, error: error.message };
  const r = (data as { status: AttStatus; class_name: string; distance_m: number | null; location_ok: boolean | null; already: boolean }[])[0];
  revalidatePath("/asistencia");
  revalidatePath("/inicio");
  return { ok: true, status: r.status, className: r.class_name, distance: r.distance_m, locationOk: r.location_ok, already: r.already };
}

/* ---------------- Justificantes ---------------- */

function excuseFields(fd: FormData) {
  return {
    date_from: String(fd.get("date_from") ?? ""),
    date_to: String(fd.get("date_to") ?? "") || String(fd.get("date_from") ?? ""),
    reason: String(fd.get("reason") ?? "").trim().slice(0, 1500),
    file_path: String(fd.get("file_path") ?? "") || null,
    file_name: String(fd.get("file_name") ?? "").slice(0, 200) || null,
  };
}

function validate(f: ReturnType<typeof excuseFields>, userId: string, classId: string) {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(f.date_from) || !iso.test(f.date_to)) return "Elige las fechas.";
  if (f.date_to < f.date_from) return "La fecha final no puede ser antes que la inicial.";
  if ((Date.parse(f.date_to) - Date.parse(f.date_from)) / 86400000 > 60) return "El periodo máximo es de 60 días.";
  if (f.reason.length < 3) return "Explica el motivo.";
  if (f.file_path && !f.file_path.startsWith(`${classId}/${userId}/`)) return "Archivo no válido.";
  return null;
}

export async function submitExcuse(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (fd.get("sensitive_consent") !== "on") return { ok: false, error: "Marca la autorización para enviar el justificante." };
  const classId = String(fd.get("class_id") ?? "");
  const f = excuseFields(fd);
  const err = validate(f, userId, classId);
  if (err) return { ok: false, error: err };
  const { data: me } = await supabase
    .from("class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!me) return { ok: false, error: "No perteneces a ese grupo." };
  const { error } = await supabase.from("excuses").insert({ ...f, class_id: classId, student_id: me.id, user_id: userId, status: "pending" });
  if (error) return { ok: false, error: "No se pudo enviar el justificante." };
  revalidatePath("/justificantes");
  return { ok: true, message: "Justificante enviado. Tu docente lo revisará." };
}

export async function resubmitExcuse(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (fd.get("sensitive_consent") !== "on") return { ok: false, error: "Marca la autorización para enviar el justificante." };
  const id = String(fd.get("id") ?? "");
  const { data: current } = await supabase.from("excuses").select("class_id, file_path").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "No se encontró el justificante." };
  const f = excuseFields(fd);
  if (!f.file_path) {
    f.file_path = current.file_path;
    f.file_name = String(fd.get("file_name") ?? "") || null;
  }
  const err = validate(f, userId, current.class_id);
  if (err) return { ok: false, error: err };
  const { error } = await supabase.from("excuses").update({ ...f, status: "pending" }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidatePath("/justificantes");
  return { ok: true, message: "Justificante actualizado y enviado de nuevo." };
}

export async function withdrawExcuse(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("excuses").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("excuses").delete().eq("id", id);
  if (!error && data?.file_path) await supabase.storage.from("excuses").remove([data.file_path]);
  revalidatePath("/justificantes");
}

export async function myExcuseFileUrl(path: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.storage.from("excuses").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
