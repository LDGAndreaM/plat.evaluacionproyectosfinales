"use server";

import { revalidatePath } from "next/cache";
import { getEvent } from "@/lib/data";
import type { ActionResult, ScoreMethod } from "@/lib/types";

export async function setScoreMethod(eventId: string, method: ScoreMethod): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso para cambiar el método." };
  if (!["average", "sum", "trimmed"].includes(method)) return { ok: false, error: "Método no válido." };
  const { error } = await supabase.from("events").update({ score_method: method }).eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { ok: true };
}

/** Guarda el orden de desempate de un grupo de proyectos empatados (1 = gana). */
export async function setTiebreak(eventId: string, orderedProjectIds: string[]): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso." };
  for (const [i, id] of orderedProjectIds.entries()) {
    const { error } = await supabase.from("projects").update({ manual_tiebreak: i + 1 }).eq("id", id).eq("event_id", eventId);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/eventos/${eventId}/resultados`);
  return { ok: true, message: "Desempate guardado." };
}

export async function clearTiebreak(eventId: string, projectIds: string[]): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso." };
  const { error } = await supabase.from("projects").update({ manual_tiebreak: null }).in("id", projectIds).eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/eventos/${eventId}/resultados`);
  return { ok: true };
}
