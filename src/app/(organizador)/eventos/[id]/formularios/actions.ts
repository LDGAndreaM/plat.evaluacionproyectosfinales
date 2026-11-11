"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEvent } from "@/lib/data";
import { FORM_TEMPLATES } from "@/lib/fields/templates";
import type { FieldType } from "@/lib/fields/types";
import type { ActionResult, FormField } from "@/lib/types";
import { cloneField } from "@/lib/fields/registry";

const VALID_TYPES: FieldType[] = [
  "short_text", "long_text", "number", "single_choice", "multiple_choice", "dropdown", "likert",
  "linear_scale", "rating", "matrix", "yes_no", "datetime", "signature", "file",
  "section_title", "paragraph", "image", "divider", "page_break",
];

async function editable(eventId: string) {
  const ctx = await getEvent(eventId);
  if (!ctx.canEdit) throw new Error("No tienes permiso para editar este evento.");
  return ctx;
}

export async function createForm(eventId: string, templateId: string): Promise<ActionResult> {
  const { supabase } = await editable(eventId);
  const template = FORM_TEMPLATES.find((t) => t.id === templateId) ?? FORM_TEMPLATES[2];
  const { count } = await supabase.from("forms").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  const { data: form, error } = await supabase
    .from("forms")
    .insert({
      event_id: eventId,
      title: template.id === "blanco" ? "Formulario de evaluación" : template.title,
      description: template.formDescription || null,
      is_default: (count ?? 0) === 0,
      position: count ?? 0,
    })
    .select("id")
    .single();
  if (error || !form) return { ok: false, error: `No se pudo crear el formulario: ${error?.message}` };
  const fields = template.fields();
  if (fields.length) {
    const { error: fe } = await supabase
      .from("form_fields")
      .insert(fields.map((f, i) => ({ ...f, form_id: form.id, position: i })));
    if (fe) return { ok: false, error: fe.message };
  }
  revalidatePath(`/eventos/${eventId}`, "layout");
  redirect(`/eventos/${eventId}/formularios/${form.id}`);
}

export async function duplicateForm(eventId: string, formId: string): Promise<ActionResult> {
  const { supabase } = await editable(eventId);
  const { data: form } = await supabase.from("forms").select("*").eq("id", formId).eq("event_id", eventId).single();
  if (!form) return { ok: false, error: "Formulario no encontrado." };
  const { data: copy, error } = await supabase
    .from("forms")
    .insert({ event_id: eventId, title: `${form.title} (copia)`, description: form.description, position: form.position + 1 })
    .select("id")
    .single();
  if (error || !copy) return { ok: false, error: error?.message ?? "Error" };
  const { data: fields } = await supabase.from("form_fields").select("*").eq("form_id", formId).order("position").returns<FormField[]>();
  if (fields?.length) {
    const clones = fields.map((f) => ({ old: f.id, field: { ...cloneField(f), label: f.label } }));
    const idMap = new Map(clones.map((c) => [c.old, c.field.id]));
    await supabase.from("form_fields").insert(
      clones.map(({ field }) => ({
        id: field.id,
        form_id: copy.id,
        position: field.position,
        type: field.type,
        label: field.label,
        help: field.help,
        required: field.required,
        scored: field.scored,
        weight: field.weight,
        config: field.config,
        logic: field.logic && idMap.get(field.logic.fieldId) ? { ...field.logic, fieldId: idMap.get(field.logic.fieldId) } : null,
      })),
    );
  }
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { ok: true, message: "Formulario duplicado." };
}

export async function deleteForm(eventId: string, formId: string): Promise<ActionResult> {
  const { supabase } = await editable(eventId);
  const { error } = await supabase.from("forms").delete().eq("id", formId).eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { ok: true };
}

export async function setFormPublished(eventId: string, formId: string, published: boolean): Promise<ActionResult> {
  const { supabase } = await editable(eventId);
  if (published) {
    const { data: fields } = await supabase.from("form_fields").select("type").eq("form_id", formId);
    const hasQuestions = (fields ?? []).some(
      (f) => !["section_title", "paragraph", "image", "divider", "page_break"].includes(f.type),
    );
    if (!hasQuestions) return { ok: false, error: "Agrega al menos una pregunta antes de publicar." };
  }
  const { error } = await supabase.from("forms").update({ is_published: published }).eq("id", formId).eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { ok: true };
}

export interface SaveFormPayload {
  title: string;
  description: string;
  isDefault: boolean;
  categoryIds: string[];
  fields: FormField[];
}

export async function saveForm(eventId: string, formId: string, payload: SaveFormPayload): Promise<ActionResult> {
  let ctx;
  try {
    ctx = await editable(eventId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const { supabase } = ctx;
  const title = payload.title.trim() || "Formulario de evaluación";

  const { data: form } = await supabase.from("forms").select("id").eq("id", formId).eq("event_id", eventId).maybeSingle();
  if (!form) return { ok: false, error: "Formulario no encontrado." };

  const fields = payload.fields
    .filter((f) => VALID_TYPES.includes(f.type) && /^[0-9a-f-]{36}$/i.test(f.id))
    .slice(0, 300)
    .map((f, i) => {
    return {
      id: f.id,
      form_id: formId,
      position: i,
      type: f.type,
      label: String(f.label ?? "").slice(0, 2000),
      help: f.help ? String(f.help).slice(0, 2000) : null,
      required: !!f.required,
      scored: !!f.scored,
      weight: Math.max(0, Math.min(9999, Number(f.weight) || 0)),
      config: f.config ?? {},
      logic: f.logic?.fieldId ? f.logic : null,
    };
  });

  // 1) Datos generales
  const { error: fe } = await supabase
    .from("forms")
    .update({ title, description: payload.description.trim() || null, is_default: payload.isDefault })
    .eq("id", formId);
  if (fe) return { ok: false, error: fe.message };
  if (payload.isDefault) {
    await supabase.from("forms").update({ is_default: false }).eq("event_id", eventId).neq("id", formId);
  }

  // 2) Campos: borrar los que ya no están y guardar el resto
  const { data: existing } = await supabase.from("form_fields").select("id").eq("form_id", formId);
  const keep = new Set(fields.map((f) => f.id));
  const toDelete = (existing ?? []).map((f) => f.id).filter((id) => !keep.has(id));
  if (toDelete.length) {
    const { error } = await supabase.from("form_fields").delete().in("id", toDelete);
    if (error) return { ok: false, error: error.message };
  }
  if (fields.length) {
    const { error } = await supabase.from("form_fields").upsert(fields, { onConflict: "id" });
    if (error) return { ok: false, error: `No se pudieron guardar las preguntas: ${error.message}` };
  }

  // 3) Categorías asignadas (una categoría solo puede tener un formulario)
  const { data: cats } = await supabase.from("categories").select("id").eq("event_id", eventId);
  const validCats = payload.categoryIds.filter((id) => cats?.some((c) => c.id === id));
  await supabase.from("form_categories").delete().eq("form_id", formId);
  if (validCats.length) {
    await supabase.from("form_categories").delete().in("category_id", validCats);
    const { error } = await supabase
      .from("form_categories")
      .insert(validCats.map((category_id) => ({ form_id: formId, category_id })));
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/eventos/${eventId}`, "layout");
  return { ok: true, message: "Formulario guardado." };
}
