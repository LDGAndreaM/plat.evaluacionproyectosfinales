"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { EMAIL_RE } from "@/lib/aula/roster";
import type { ActionResult } from "@/lib/types";

const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max) || null;

export async function updateProfile(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, userId, role } = await requireUser();
  const fullName = str(fd, "full_name", 120);
  if (!fullName) return { ok: false, error: "Escribe tu nombre." };
  const contactEmail = str(fd, "contact_email", 200)?.toLowerCase() ?? null;
  if (contactEmail && !EMAIL_RE.test(contactEmail)) return { ok: false, error: "El correo de contacto no es válido." };
  const phone = str(fd, "phone", 40);
  if (phone && !/^[0-9+()\-.\s]{7,40}$/.test(phone)) return { ok: false, error: "El teléfono solo puede tener números, espacios y + ( ) -." };

  const { error: e1 } = await supabase
    .from("organizers")
    .update({ full_name: fullName, ...(role === "teacher" ? { institution: str(fd, "institution", 150) } : {}) })
    .eq("id", userId);
  if (e1) return { ok: false, error: "No se pudo guardar tu nombre." };

  const { error: e2 } = await supabase.from("profile_details").upsert({
    user_id: userId,
    phone,
    contact_email: contactEmail,
    program: str(fd, "program", 150),
    about: str(fd, "about", 500),
  });
  if (e2) return { ok: false, error: "No se pudieron guardar tus datos de contacto." };
  revalidatePath("/", "layout");
  return { ok: true, message: "¡Listo! Tu perfil se guardó." };
}

/** Guarda la ruta de la foto ya subida (o la quita) y borra la anterior. */
export async function setAvatar(path: string | null): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireUser();
  if (path && !(path.startsWith(`${userId}/`) && /^[0-9a-f-]{36}\/[\w.-]{1,80}$/.test(path))) return { ok: false, error: "Ruta no válida." };
  const { data: current } = await supabase.from("profile_details").select("avatar_path").eq("user_id", userId).maybeSingle();
  const { error } = await supabase.from("profile_details").upsert({ user_id: userId, avatar_path: path });
  if (error) return { ok: false, error: "No se pudo guardar la foto." };
  if (current?.avatar_path && current.avatar_path !== path) await supabase.storage.from("avatars").remove([current.avatar_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Elimina la cuenta del usuario, con sus archivos. Requiere escribir ELIMINAR. */
export async function deleteMyAccount(confirmText: string) {
  const { supabase, userId, role } = await requireUser();
  if (confirmText.trim().toUpperCase() !== "ELIMINAR") return { ok: false, error: "Escribe ELIMINAR para confirmar." };

  const byBucket = new Map<string, Set<string>>();
  const add = (bucket: string, path?: string | null) => {
    if (!path) return;
    if (!byBucket.has(bucket)) byBucket.set(bucket, new Set());
    byBucket.get(bucket)!.add(path);
  };

  // Foto de perfil
  const { data: prof } = await supabase.from("profile_details").select("avatar_path").eq("user_id", userId).maybeSingle();
  add("avatars", prof?.avatar_path);
  // Justificantes y entregas propias
  const { data: myExcuses } = await supabase.from("excuses").select("file_path").eq("user_id", userId);
  myExcuses?.forEach((e) => add("excuses", e.file_path));
  const { data: myRows } = await supabase.from("class_students").select("id").eq("user_id", userId);
  const myIds = (myRows ?? []).map((r) => r.id);
  if (myIds.length) {
    const { data: subs } = await supabase.from("activity_submissions").select("files").in("student_id", myIds);
    subs?.forEach((s) => ((s.files ?? []) as { path: string }[]).forEach((f) => f.path?.includes(`/${userId}/`) && add("activity-files", f.path)));
  }

  if (role === "teacher") {
    // Archivos de los grupos que es titular (se eliminan con la cuenta)
    const { data: classes } = await supabase.from("classes").select("id").eq("owner_id", userId);
    const cids = (classes ?? []).map((c) => c.id);
    if (cids.length) {
      const [{ data: ex }, { data: acts }, { data: subs }] = await Promise.all([
        supabase.from("excuses").select("file_path").in("class_id", cids),
        supabase.from("activities").select("resources").in("class_id", cids),
        supabase.from("activity_submissions").select("files").in("class_id", cids),
      ]);
      ex?.forEach((e) => add("excuses", e.file_path));
      acts?.forEach((a) => ((a.resources ?? []) as { type: string; path?: string }[]).forEach((r) => r.type === "file" && add("activity-files", r.path)));
      subs?.forEach((s) => ((s.files ?? []) as { path: string }[]).forEach((f) => add("activity-files", f.path)));
    }
    // Imágenes de eventos y de fichas (carpeta del docente)
    for (const bucket of ["event-assets", "worksheet-assets"]) {
      const { data: top } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
      for (const item of top ?? []) {
        if (item.id) add(bucket, `${userId}/${item.name}`);
        else {
          const { data: inner } = await supabase.storage.from(bucket).list(`${userId}/${item.name}`, { limit: 1000 });
          inner?.forEach((f) => f.id && add(bucket, `${userId}/${item.name}/${f.name}`));
        }
      }
    }
  }

  for (const [bucket, paths] of byBucket) {
    const list = [...paths];
    for (let i = 0; i < list.length; i += 100) await supabase.storage.from(bucket).remove(list.slice(i, i + 100));
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: "No se pudo eliminar la cuenta. Inténtalo de nuevo." };
  await supabase.auth.signOut();
  return { ok: true };
}

/** Activa o desactiva el resumen diario por correo. */
export async function setEmailDigest(on: boolean) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("organizers").update({ email_digest: on }).eq("id", userId);
  revalidatePath("/perfil");
  return { ok: !error };
}
