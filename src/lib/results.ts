import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Evaluator, EventRow, FormField, Project, Submission } from "@/lib/types";

export interface ResultsData {
  event: EventRow;
  projects: Project[];
  categories: Category[];
  forms: { id: string; title: string }[];
  fieldsByForm: Record<string, FormField[]>;
  submissions: Submission[];
  evaluators: Evaluator[];
  drafts: number;
}

/** Carga todo lo necesario para resultados (con permisos de organizador vía RLS). */
export async function loadResults(supabase: SupabaseClient, event: EventRow): Promise<ResultsData> {
  const id = event.id;
  const [projects, categories, forms, fields, subs, evaluators] = await Promise.all([
    supabase.from("projects").select("*").eq("event_id", id),
    supabase.from("categories").select("*").eq("event_id", id).order("position"),
    supabase.from("forms").select("id, title").eq("event_id", id).order("position"),
    supabase.from("form_fields").select("*, forms!inner(event_id)").eq("forms.event_id", id).order("position"),
    supabase.from("submissions").select("*").eq("event_id", id),
    supabase.from("evaluators").select("*").eq("event_id", id).order("created_at"),
  ]);
  const fieldsByForm: Record<string, FormField[]> = {};
  for (const raw of (fields.data ?? []) as (FormField & { forms?: unknown })[]) {
    const { forms: _ignored, ...f } = raw;
    void _ignored;
    (fieldsByForm[f.form_id] ??= []).push({ ...f, weight: Number(f.weight) });
  }
  const all = (subs.data ?? []) as Submission[];
  return {
    event,
    projects: (projects.data ?? []) as Project[],
    categories: (categories.data ?? []) as Category[],
    forms: forms.data ?? [],
    fieldsByForm,
    submissions: all.filter((s) => s.status === "submitted"),
    evaluators: (evaluators.data ?? []) as Evaluator[],
    drafts: all.filter((s) => s.status === "draft").length,
  };
}
