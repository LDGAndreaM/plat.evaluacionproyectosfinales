import { getEvent } from "@/lib/data";
import { isLayout, isScorable } from "@/lib/fields/types";
import type { FieldType } from "@/lib/fields/types";
import { FormsList, type FormSummary } from "./forms-list";

export default async function FormulariosPage({ params }: PageProps<"/eventos/[id]/formularios">) {
  const { id } = await params;
  const { supabase, canEdit } = await getEvent(id);
  const [{ data: forms }, { data: fields }, { data: subs }, { data: fcs }, { data: cats }] = await Promise.all([
    supabase.from("forms").select("*").eq("event_id", id).order("position").order("created_at"),
    supabase.from("form_fields").select("form_id, type, scored, weight, forms!inner(event_id)").eq("forms.event_id", id),
    supabase.from("submissions").select("form_id").eq("event_id", id).eq("status", "submitted"),
    supabase.from("form_categories").select("form_id, category_id, forms!inner(event_id)").eq("forms.event_id", id),
    supabase.from("categories").select("id, name").eq("event_id", id).order("position"),
  ]);

  const summaries: FormSummary[] = (forms ?? []).map((f) => {
    const ff = (fields ?? []).filter((x) => x.form_id === f.id);
    const scored = ff.filter((x) => x.scored && isScorable(x.type as FieldType));
    return {
      id: f.id,
      title: f.title,
      description: f.description,
      is_published: f.is_published,
      is_default: f.is_default,
      questions: ff.filter((x) => !isLayout(x.type as FieldType)).length,
      scored: scored.length,
      weight: Math.round(scored.reduce((a, x) => a + Number(x.weight), 0) * 100) / 100,
      submissions: (subs ?? []).filter((s) => s.form_id === f.id).length,
      categories: (fcs ?? [])
        .filter((x) => x.form_id === f.id)
        .map((x) => cats?.find((c) => c.id === x.category_id)?.name ?? "")
        .filter(Boolean),
    };
  });

  return <FormsList eventId={id} forms={summaries} canEdit={canEdit} />;
}
