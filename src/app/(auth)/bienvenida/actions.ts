"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function chooseRole(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = String(formData.get("role") ?? "");
  if (role !== "teacher" && role !== "student") return { ok: false, error: "Elige si eres docente o estudiante." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_role", { new_role: role });
  if (error) return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/inicio");
}
