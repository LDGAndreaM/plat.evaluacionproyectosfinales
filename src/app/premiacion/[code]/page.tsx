import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AwardsScreen } from "@/components/results/awards-screen";
import { computeRanking } from "@/lib/scoring/ranking";
import { createClient } from "@/lib/supabase/server";
import { loadResults } from "@/lib/results";
import type { EventRow, FormField, ScoreMethod } from "@/lib/types";

export const metadata: Metadata = { title: "Premiación" };

interface PublicResults {
  event: { name: string; logo_url: string | null; primary_color: string; podium_size: number; score_method: ScoreMethod };
  categories: { id: string; name: string }[];
  projects: {
    id: string;
    name: string;
    stand: string | null;
    category_id: string | null;
    members: string[];
    semester: string | null;
    image_url: string | null;
    manual_tiebreak: number | null;
  }[];
  fields: FormField[];
  submissions: { id: string; project_id: string; form_id: string; evaluator_id: string; answers: Record<string, unknown> }[];
}

export default async function PremiacionPage({ params }: PageProps<"/premiacion/[code]">) {
  const { code } = await params;
  const supabase = await createClient();

  // 1) Resultados publicados (cualquiera puede verlos)
  const { data } = await supabase.rpc("get_published_results", { code });
  if (data) {
    const r = data as PublicResults;
    const fieldsByForm: Record<string, FormField[]> = {};
    for (const f of r.fields) (fieldsByForm[f.form_id] ??= []).push({ ...f, weight: Number(f.weight) });
    const rows = computeRanking({
      projects: r.projects,
      submissions: r.submissions,
      fieldsByForm,
      method: r.event.score_method,
    });
    return <AwardsScreen event={r.event} rows={rows} categories={r.categories} />;
  }

  // 2) Vista previa para organizadores del evento
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("short_code", code.toUpperCase())
    .maybeSingle<EventRow>();
  if (event) {
    const d = await loadResults(supabase, event);
    const rows = computeRanking({
      projects: d.projects,
      submissions: d.submissions,
      fieldsByForm: d.fieldsByForm,
      method: event.score_method,
    });
    return (
      <>
        <div className="no-print fixed left-3 top-3 z-20 max-w-xs rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 shadow">
          <strong>Vista previa.</strong> Solo tú la ves. Publica los resultados para que cualquiera con el enlace pueda verla.
        </div>
        <AwardsScreen event={event} rows={rows} categories={d.categories} />
      </>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <Lock className="size-10 text-slate-400" />
      <h1 className="text-xl font-semibold text-slate-900">Los resultados aún no están publicados</h1>
      <p className="max-w-md text-sm text-slate-500">
        Cuando el organizador publique los resultados, esta pantalla mostrará el podio. Si eres organizador,{" "}
        <Link href="/login" className="text-violet-700 underline">
          inicia sesión
        </Link>{" "}
        para ver la vista previa.
      </p>
    </main>
  );
}
