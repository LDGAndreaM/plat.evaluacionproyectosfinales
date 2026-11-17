"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { isToolKind, type ToolData, type ToolKind } from "@/lib/tools/types";

export async function saveTool(input: {
  id: string | null;
  kind: ToolKind;
  title: string;
  data: ToolData;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase, userId } = await requireOrganizer();
  if (!isToolKind(input.kind)) return { ok: false, error: "Tipo de herramienta no válido." };
  const title = input.title.trim().slice(0, 200) || "Sin título";
  if (JSON.stringify(input.data).length > 500000) return { ok: false, error: "El contenido es demasiado grande." };

  if (input.id) {
    const { error } = await supabase.from("teacher_tools").update({ title, data: input.data }).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/herramientas");
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase
    .from("teacher_tools")
    .insert({ owner_id: userId, kind: input.kind, title, data: input.data })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo guardar." };
  revalidatePath("/herramientas");
  return { ok: true, id: data.id };
}

export async function setToolPublic(id: string, isPublic: boolean): Promise<ActionResult> {
  const { supabase } = await requireOrganizer();
  const { error } = await supabase.from("teacher_tools").update({ is_public: isPublic }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/herramientas/${id}`);
  return { ok: true };
}

export async function deleteTool(id: string): Promise<ActionResult> {
  const { supabase } = await requireOrganizer();
  const { error } = await supabase.from("teacher_tools").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/herramientas");
  return { ok: true };
}

export async function duplicateTool(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireOrganizer();
  const { data: tool } = await supabase.from("teacher_tools").select("kind, title, data").eq("id", id).maybeSingle();
  if (!tool) return { ok: false, error: "No se encontró la herramienta." };
  const { data, error } = await supabase
    .from("teacher_tools")
    .insert({ owner_id: userId, kind: tool.kind, title: `${tool.title} (copia)`.slice(0, 200), data: tool.data })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo duplicar." };
  revalidatePath("/herramientas");
  redirect(`/herramientas/${data.id}`);
}
