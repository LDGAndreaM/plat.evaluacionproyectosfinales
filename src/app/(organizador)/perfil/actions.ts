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
