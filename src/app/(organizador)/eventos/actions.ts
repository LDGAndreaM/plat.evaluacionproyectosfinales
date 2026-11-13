"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganizer } from "@/lib/auth";
import { getEvent } from "@/lib/data";
import type { ActionResult, EventStatus, FormField, ScoreMethod } from "@/lib/types";
import { uid } from "@/lib/utils";

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function eventPayload(formData: FormData) {
  const name = text(formData, "name");
  const color = text(formData, "primary_color");
  return {
    name,
    description: text(formData, "description") || null,
    event_date: text(formData, "event_date") || null,
    venue: text(formData, "venue") || null,
    logo_url: text(formData, "logo_url") || null,
    cover_url: text(formData, "cover_url") || null,
    primary_color: COLOR_RE.test(color) ? color.toLowerCase() : "#6d28d9",
  };
}

export async function createEvent(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireOrganizer();
  const payload = eventPayload(formData);
  if (!payload.name) return { ok: false, error: "El evento necesita un nombre." };
  const { data, error } = await supabase
    .from("events")
    .insert({ ...payload, owner_id: userId })
    .select("id")
    .single();
  if (error) return { ok: false, error: `No se pudo crear el evento: ${error.message}` };
  revalidatePath("/eventos");
  redirect(`/eventos/${data.id}`);
}

export async function updateEvent(eventId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso para editar este evento." };
  const payload = eventPayload(formData);
  if (!payload.name) return { ok: false, error: "El evento necesita un nombre." };
  const { error } = await supabase.from("events").update(payload).eq("id", eventId);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { ok: true, message: "Cambios guardados." };
}

export async function updateEvaluationSettings(
  eventId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso para editar este evento." };
  const method = text(formData, "score_method") as ScoreMethod;
  const podium = Number(text(formData, "podium_size"));
  const minEvals = Number(text(formData, "min_evaluations"));
  const pin = text(formData, "access_pin").toUpperCase();
  if (!["average", "sum", "trimmed"].includes(method)) return { ok: false, error: "Método de cálculo no válido." };
  if (!Number.isInteger(podium) || podium < 1 || podium > 20)
    return { ok: false, error: "El número de lugares debe estar entre 1 y 20." };
  if (!Number.isInteger(minEvals) || minEvals < 0) return { ok: false, error: "El mínimo de evaluaciones no es válido." };
  if (pin && !/^[A-Z0-9]{4,12}$/.test(pin))
    return { ok: false, error: "El PIN debe tener de 4 a 12 letras o números, sin espacios." };
  const { error } = await supabase
    .from("events")
    .update({ score_method: method, podium_size: podium, min_evaluations: minEvals, access_pin: pin || null })
    .eq("id", eventId);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { ok: true, message: "Configuración guardada." };
}

export async function setEventStatus(eventId: string, status: EventStatus): Promise<ActionResult> {
  const { supabase, canEdit } = await getEvent(eventId);
  if (!canEdit) return { ok: false, error: "No tienes permiso para cambiar el estado." };
  if (!["draft", "open", "closed", "published"].includes(status)) return { ok: false, error: "Estado no válido." };
  const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/eventos/${eventId}`, "layout");
  revalidatePath("/eventos");
  return { ok: true };
}

export async function deleteEvent(eventId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, event, role } = await getEvent(eventId);
  if (role !== "owner") return { ok: false, error: "Solo el dueño puede eliminar el evento." };
  if (text(formData, "confirm") !== event.name)
    return { ok: false, error: "Escribe el nombre exacto del evento para confirmar." };
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/eventos");
  redirect("/eventos");
}

export async function duplicateEvent(eventId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, event, userId } = await getEvent(eventId);
  const includeProjects = formData.get("include_projects") === "on";
  const newName = text(formData, "name") || `${event.name} (copia)`;

  const { data: created, error } = await supabase
    .from("events")
    .insert({
      owner_id: userId,
      name: newName,
      description: event.description,
      event_date: null,
      venue: event.venue,
      logo_url: event.logo_url,
      cover_url: event.cover_url,
      primary_color: event.primary_color,
      access_pin: event.access_pin,
      score_method: event.score_method,
      podium_size: event.podium_size,
      min_evaluations: event.min_evaluations,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: `No se pudo duplicar: ${error?.message}` };
  const newId = created.id as string;

  try {
    // Categorías
    const { data: cats } = await supabase.from("categories").select("*").eq("event_id", eventId);
    const catMap = new Map<string, string>();
    if (cats?.length) {
      const rows = cats.map((c) => {
        const id = uid();
        catMap.set(c.id, id);
        return { id, event_id: newId, name: c.name, position: c.position };
      });
      const { error: e } = await supabase.from("categories").insert(rows);
      if (e) throw e;
    }

    // Proyectos (opcional)
    if (includeProjects) {
      const { data: projects } = await supabase.from("projects").select("*").eq("event_id", eventId);
      if (projects?.length) {
        const { error: e } = await supabase.from("projects").insert(
          projects.map((p) => ({
            event_id: newId,
            category_id: p.category_id ? (catMap.get(p.category_id) ?? null) : null,
            name: p.name,
            members: p.members,
            description: p.description,
            image_url: p.image_url,
            stand: p.stand,
            semester: p.semester,
          })),
        );
        if (e) throw e;
      }
    }

    // Formularios, campos y asignación a categorías
    const { data: forms } = await supabase.from("forms").select("*").eq("event_id", eventId);
    for (const f of forms ?? []) {
      const { data: nf, error: fe } = await supabase
        .from("forms")
        .insert({
          event_id: newId,
          title: f.title,
          description: f.description,
          is_published: f.is_published,
          is_default: f.is_default,
          position: f.position,
        })
        .select("id")
        .single();
      if (fe || !nf) throw fe;

      const { data: fields } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", f.id)
        .order("position")
        .returns<FormField[]>();
      if (fields?.length) {
        const idMap = new Map(fields.map((fl) => [fl.id, uid()]));
        const { error: ffe } = await supabase.from("form_fields").insert(
          fields.map((fl) => ({
            id: idMap.get(fl.id),
            form_id: nf.id,
            position: fl.position,
            type: fl.type,
            label: fl.label,
            help: fl.help,
            required: fl.required,
            scored: fl.scored,
            weight: fl.weight,
            config: fl.config,
            logic: fl.logic && idMap.get(fl.logic.fieldId) ? { ...fl.logic, fieldId: idMap.get(fl.logic.fieldId) } : null,
          })),
        );
        if (ffe) throw ffe;
      }

      const { data: fcs } = await supabase.from("form_categories").select("*").eq("form_id", f.id);
      const mapped = (fcs ?? [])
        .map((fc) => ({ form_id: nf.id, category_id: catMap.get(fc.category_id) }))
        .filter((r) => r.category_id);
      if (mapped.length) {
        const { error: fce } = await supabase.from("form_categories").insert(mapped);
        if (fce) throw fce;
      }
    }
  } catch (e) {
    await supabase.from("events").delete().eq("id", newId);
    return { ok: false, error: `No se pudo duplicar el evento: ${(e as Error)?.message ?? "error desconocido"}` };
  }

  revalidatePath("/eventos");
  redirect(`/eventos/${newId}`);
}

export async function createDemoEvent(): Promise<ActionResult> {
  const { supabase } = await requireOrganizer();
  const { data, error } = await supabase.rpc("create_demo_event");
  if (error) return { ok: false, error: `No se pudo crear el evento de demostración: ${error.message}` };
  revalidatePath("/eventos");
  redirect(`/eventos/${data}`);
}

export async function addCollaborator(eventId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, role } = await getEvent(eventId);
  if (role !== "owner") return { ok: false, error: "Solo el dueño puede agregar co-organizadores." };
  const email = text(formData, "email").toLowerCase();
  const collabRole = text(formData, "role") === "viewer" ? "viewer" : "editor";
  if (!email) return { ok: false, error: "Escribe el correo del co-organizador." };
  const { data, error } = await supabase.rpc("add_collaborator", {
    eid: eventId,
    collaborator_email: email,
    collaborator_role: collabRole,
  });
  if (error) return { ok: false, error: error.message };
  if (data === "not_found")
    return {
      ok: false,
      error: "No hay ninguna cuenta con ese correo. Pídele que se registre primero en la plataforma.",
    };
  if (data === "self") return { ok: false, error: "Ya eres la dueña o dueño de este evento." };
  revalidatePath(`/eventos/${eventId}/ajustes`);
  return { ok: true, message: "Co-organizador agregado." };
}

export async function removeCollaborator(eventId: string, userId: string): Promise<ActionResult> {
  const { supabase } = await getEvent(eventId);
  const { error } = await supabase.from("event_collaborators").delete().eq("event_id", eventId).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/eventos/${eventId}/ajustes`);
  return { ok: true };
}
