import { getEvent } from "@/lib/data";
import { resolveFormId } from "@/lib/forms";
import type { Category, Project } from "@/lib/types";
import { QrManager } from "./qr-manager";

export default async function QrPage({ params }: PageProps<"/eventos/[id]/qr">) {
  const { id } = await params;
  const { supabase, event } = await getEvent(id);
  const [{ data: projects }, { data: categories }, { data: forms }, { data: fcs }] = await Promise.all([
    supabase.from("projects").select("*").eq("event_id", id).returns<Project[]>(),
    supabase.from("categories").select("*").eq("event_id", id).order("position").returns<Category[]>(),
    supabase.from("forms").select("id, is_published, is_default").eq("event_id", id),
    supabase.from("form_categories").select("form_id, category_id, forms!inner(event_id)").eq("forms.event_id", id),
  ]);
  const collator = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });
  const list = (projects ?? [])
    .sort((a, b) => collator.compare(a.stand ?? "~", b.stand ?? "~") || collator.compare(a.name, b.name))
    .map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      stand: p.stand,
      categoryId: p.category_id,
      category: categories?.find((c) => c.id === p.category_id)?.name ?? null,
      hasForm: !!resolveFormId(p.category_id, forms ?? [], fcs ?? []),
    }));
  return (
    <QrManager
      event={{
        name: event.name,
        short_code: event.short_code,
        primary_color: event.primary_color,
        logo_url: event.logo_url,
        access_pin: event.access_pin,
        status: event.status,
      }}
      projects={list}
      categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
      publishedForms={(forms ?? []).filter((f) => f.is_published).length}
    />
  );
}
