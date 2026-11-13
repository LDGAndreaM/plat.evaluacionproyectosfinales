import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/data";
import type { Category, FormField, FormRow } from "@/lib/types";
import { FormBuilder } from "./builder";

export const metadata: Metadata = { title: "Editar formulario" };

export default async function FormBuilderPage({ params, searchParams }: PageProps<"/eventos/[id]/formularios/[formId]">) {
  const { id, formId } = await params;
  const sp = await searchParams;
  const { supabase, event, canEdit } = await getEvent(id);
  if (!/^[0-9a-f-]{36}$/i.test(formId)) notFound();

  const { data: form } = await supabase.from("forms").select("*").eq("id", formId).eq("event_id", id).maybeSingle<FormRow>();
  if (!form) notFound();

  const [{ data: fields }, { data: categories }, { data: allForms }, { data: fcs }, { count }] = await Promise.all([
    supabase.from("form_fields").select("*").eq("form_id", formId).order("position").returns<FormField[]>(),
    supabase.from("categories").select("*").eq("event_id", id).order("position").returns<Category[]>(),
    supabase.from("forms").select("id, title").eq("event_id", id),
    supabase.from("form_categories").select("form_id, category_id, forms!inner(event_id)").eq("forms.event_id", id),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("form_id", formId).eq("status", "submitted"),
  ]);

  const cats = (categories ?? []).map((c) => {
    const link = fcs?.find((x) => x.category_id === c.id);
    const other = link && link.form_id !== formId ? (allForms?.find((f) => f.id === link.form_id)?.title ?? null) : null;
    return { ...c, otherForm: other };
  });
  const assigned = (fcs ?? []).filter((x) => x.form_id === formId).map((x) => x.category_id);

  return (
    <FormBuilder
      eventId={id}
      form={form}
      initialFields={(fields ?? []).map((f) => ({ ...f, weight: Number(f.weight) }))}
      categories={cats}
      assignedCategoryIds={assigned}
      submissionCount={count ?? 0}
      brandColor={event.primary_color}
      canEdit={canEdit}
      openImport={sp.importar === "1"}
    />
  );
}
