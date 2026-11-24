"use server";

import { redirect } from "next/navigation";
import { PRIVACY_VERSION } from "@/lib/legal";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/** Elige el rol (si aún no tiene) y registra la aceptación del aviso de privacidad. */
export async function chooseRole(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (formData.get("privacy") !== "on") return { ok: false, error: "Debes aceptar el Aviso de privacidad y los Términos para continuar." };
  const supabase = await createClient();
  const role = String(formData.get("role") ?? "");
  if (role) {
    if (role !== "teacher" && role !== "student") return { ok: false, error: "Elige si eres docente o estudiante." };
    const { error } = await supabase.rpc("set_my_role", { new_role: role });
    if (error) return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
  }
  const { error } = await supabase.rpc("accept_privacy", { version: PRIVACY_VERSION });
  if (error) return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/inicio");
}
