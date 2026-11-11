"use server";

import { revalidatePath } from "next/cache";
import { getEvent } from "@/lib/data";
import type { ActionResult } from "@/lib/types";

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function parseMembers(raw: string) {
  return raw
    .split(/[\n,;]+/)
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function done(eventId: string, message?: string): ActionResult {
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { ok: true, message };
}

export async function saveProject(eventId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso para editar este evento." };
  const id = text(formData, "id");
  const payload = {
    name: text(formData, "name"),
    members: parseMembers(text(formData, "members")),
    category_id: text(formData, "category_id") || null,
    description: text(formData, "description") || null,
    stand: text(formData, "stand") || null,
    image_url: text(formData, "image_url") || null,
  };
  if (!payload.name) return { ok: false, error: "El proyecto necesita un nombre." };
  const { error } = id
    ? await supabase.from("projects").update(payload).eq("id", id).eq("event_id", eventId)
    : await supabase.from("projects").insert({ ...payload, event_id: eventId });
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  return done(eventId, id ? "Proyecto actualizado." : "Proyecto agregado.");
}

export async function deleteProject(eventId: string, projectId: string): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso." };
  const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  return done(eventId);
}

export interface ImportRow {
  name: string;
  members: string;
  category: string;
  description: string;
  stand: string;
}

export async function importProjects(eventId: string, rows: ImportRow[]): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso." };
  const valid = rows.filter((r) => r.name?.trim()).slice(0, 500);
  if (!valid.length) return { ok: false, error: "No hay filas con nombre de proyecto." };

  // Crear las categorías que no existan
  const { data: existing } = await supabase.from("categories").select("id, name, position").eq("event_id", eventId);
  const byName = new Map((existing ?? []).map((c) => [c.name.toLowerCase(), c.id as string]));
  const newNames = [
    ...new Set(valid.map((r) => r.category?.trim()).filter((c): c is string => !!c && !byName.has(c.toLowerCase()))),
  ];
  if (newNames.length) {
    const start = existing?.length ?? 0;
    const { data: created, error } = await supabase
      .from("categories")
      .insert(newNames.map((name, i) => ({ event_id: eventId, name, position: start + i })))
      .select("id, name");
    if (error) return { ok: false, error: `No se pudieron crear las categorías: ${error.message}` };
    created?.forEach((c) => byName.set(c.name.toLowerCase(), c.id));
  }

  const { error } = await supabase.from("projects").insert(
    valid.map((r) => ({
      event_id: eventId,
      name: r.name.trim().slice(0, 200),
      members: parseMembers(r.members ?? ""),
      category_id: r.category?.trim() ? (byName.get(r.category.trim().toLowerCase()) ?? null) : null,
      description: r.description?.trim() || null,
      stand: r.stand?.trim() || null,
    })),
  );
  if (error) return { ok: false, error: `No se pudo importar: ${error.message}` };
  return done(eventId, `Se importaron ${valid.length} proyectos.`);
}

export async function saveCategory(eventId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso." };
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!name) return { ok: false, error: "Escribe el nombre de la categoría." };
  if (id) {
    const { error } = await supabase.from("categories").update({ name }).eq("id", id).eq("event_id", eventId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { count } = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("event_id", eventId);
    const { error } = await supabase.from("categories").insert({ event_id: eventId, name, position: count ?? 0 });
    if (error) return { ok: false, error: error.message };
  }
  return done(eventId);
}

export async function deleteCategory(eventId: string, categoryId: string): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso." };
  const { error } = await supabase.from("categories").delete().eq("id", categoryId).eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  return done(eventId);
}
