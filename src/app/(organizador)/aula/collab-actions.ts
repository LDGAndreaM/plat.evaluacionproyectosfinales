"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher, requireUser } from "@/lib/auth";
import type { Resource } from "@/lib/aula/activities";
import type { ActionResult } from "@/lib/types";

/* ---------------- Avisos del grupo ---------------- */

export async function postAnnouncement(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireTeacher();
  const classId = String(fd.get("class_id") ?? "");
  const title = String(fd.get("title") ?? "").trim().slice(0, 150);
  const body = String(fd.get("body") ?? "").trim().slice(0, 4000) || null;
  if (!title) return { ok: false, error: "Escribe el título del aviso." };
  const { error } = await supabase
    .from("class_announcements")
    .insert({ class_id: classId, author_id: userId, title, body, pinned: fd.get("pinned") === "on" });
  if (error) return { ok: false, error: "No se pudo publicar el aviso." };
  revalidatePath(`/aula/${classId}`, "layout");
  return { ok: true, message: "Aviso publicado. Tus estudiantes recibirán una notificación." };
}

export async function togglePin(classId: string, id: string, pinned: boolean) {
  const { supabase } = await requireTeacher();
  await supabase.from("class_announcements").update({ pinned }).eq("id", id).eq("class_id", classId);
  revalidatePath(`/aula/${classId}`, "layout");
}

export async function deleteAnnouncement(classId: string, id: string) {
  const { supabase } = await requireTeacher();
  await supabase.from("class_announcements").delete().eq("id", id).eq("class_id", classId);
  revalidatePath(`/aula/${classId}`, "layout");
}

/* ---------------- Co-docentes ---------------- */

export async function addCoTeacher(classId: string, email: string) {
  const { supabase } = await requireTeacher();
  const { data, error } = await supabase.rpc("add_class_teacher", { cid: classId, teacher_email: email.trim() });
  revalidatePath(`/aula/${classId}`, "layout");
  return error ? { ok: false as const, error: error.message } : { ok: true as const, name: data as string };
}

export async function removeCoTeacher(classId: string, userId: string) {
  const { supabase } = await requireTeacher();
  await supabase.from("class_teachers").delete().eq("class_id", classId).eq("user_id", userId);
  revalidatePath(`/aula/${classId}`, "layout");
}

export async function leaveClass(classId: string) {
  const { supabase, userId } = await requireTeacher();
  await supabase.from("class_teachers").delete().eq("class_id", classId).eq("user_id", userId);
  revalidatePath("/aula");
  redirect("/aula");
}

/* ---------------- Duplicar grupo ---------------- */

/** Copia el grupo (datos, horario, ajustes, ponderaciones) y sus actividades como borrador, sin estudiantes. */
export async function duplicateClass(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireTeacher();
  const sourceId = String(fd.get("class_id") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 150);
  const period = String(fd.get("period") ?? "").trim().slice(0, 80) || null;
  if (!name) return { ok: false, error: "Escribe el nombre del grupo nuevo." };
  const { data: src } = await supabase.from("classes").select("*").eq("id", sourceId).maybeSingle();
  if (!src) return { ok: false, error: "No se encontró el grupo." };

  const { data: created, error } = await supabase
    .from("classes")
    .insert({
      owner_id: userId,
      name,
      period,
      subject: src.subject,
      grade: src.grade,
      description: src.description,
      schedule: src.schedule,
      color: src.color,
      att_late_after_min: src.att_late_after_min,
      att_lat: src.att_lat,
      att_lng: src.att_lng,
      att_radius_m: src.att_radius_m,
      att_require_location: src.att_require_location,
      grade_settings: src.grade_settings,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: "No se pudo crear el grupo." };

  if (fd.get("with_activities") === "on") {
    const { data: acts } = await supabase.from("activities").select("*").eq("class_id", sourceId).order("created_at");
    const { data: myTools } = await supabase.from("teacher_tools").select("id").eq("owner_id", userId);
    const mine = new Set((myTools ?? []).map((t) => t.id));
    for (const a of acts ?? []) {
      const newId = crypto.randomUUID();
      // Copiar archivos de recursos a la carpeta de la actividad nueva
      const resources: Resource[] = [];
      for (const r of (a.resources ?? []) as Resource[]) {
        if (r.type === "file" && r.path) {
          const to = `${created.id}/${newId}/recursos/${r.path.split("/").pop()}`;
          const { error: cpErr } = await supabase.storage.from("activity-files").copy(r.path, to);
          if (!cpErr) resources.push({ ...r, path: to });
        } else resources.push(r);
      }
      await supabase.from("activities").insert({
        id: newId,
        class_id: created.id,
        title: a.title,
        instructions: a.instructions,
        kind: a.kind,
        // Si la herramienta es de otro docente (co-docente duplicando), se deja sin asignar
        tool_id: a.tool_id && mine.has(a.tool_id) ? a.tool_id : null,
        mode: a.mode,
        status: "draft",
        publish_at: null,
        due_at: null,
        allow_late: a.allow_late,
        late_penalty_pct: a.late_penalty_pct,
        max_attempts: a.max_attempts,
        max_score: a.max_score,
        rubric: a.rubric,
        accept_text: a.accept_text,
        accept_files: a.accept_files,
        accept_link: a.accept_link,
        resources,
        grade_category: a.grade_category,
      });
    }
  }
  revalidatePath("/aula");
  redirect(`/aula/${created.id}?duplicado=1`);
}

/* ---------------- Comentarios en entregas ---------------- */

export async function addComment(submissionId: string, classId: string, body: string) {
  const { supabase, userId } = await requireUser();
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, error: "Escribe un comentario." };
  const { error } = await supabase.from("submission_comments").insert({ submission_id: submissionId, class_id: classId, author_id: userId, body: text });
  return error ? { ok: false, error: "No se pudo enviar el comentario." } : { ok: true };
}

export async function deleteComment(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("submission_comments").delete().eq("id", id);
  return { ok: true };
}
