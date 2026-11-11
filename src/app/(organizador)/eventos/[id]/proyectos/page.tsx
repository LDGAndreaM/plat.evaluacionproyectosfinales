import { getEvent } from "@/lib/data";
import type { Category, Project } from "@/lib/types";
import { ProjectsManager } from "./projects-manager";

export default async function ProyectosPage({ params }: PageProps<"/eventos/[id]/proyectos">) {
  const { id } = await params;
  const { supabase, canEdit } = await getEvent(id);
  const [{ data: projects }, { data: categories }, { data: subs }] = await Promise.all([
    supabase.from("projects").select("*").eq("event_id", id).order("stand", { nullsFirst: false }).order("name").returns<Project[]>(),
    supabase.from("categories").select("*").eq("event_id", id).order("position").returns<Category[]>(),
    supabase.from("submissions").select("project_id").eq("event_id", id).eq("status", "submitted"),
  ]);
  const counts = new Map<string, number>();
  subs?.forEach((s) => counts.set(s.project_id, (counts.get(s.project_id) ?? 0) + 1));

  // Orden natural por stand (A2 antes que A10)
  const collator = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });
  const sorted = (projects ?? [])
    .map((p) => ({ ...p, evaluations: counts.get(p.id) ?? 0 }))
    .sort((a, b) => collator.compare(a.stand ?? "~", b.stand ?? "~") || collator.compare(a.name, b.name));

  return <ProjectsManager eventId={id} projects={sorted} categories={categories ?? []} canEdit={canEdit} />;
}
