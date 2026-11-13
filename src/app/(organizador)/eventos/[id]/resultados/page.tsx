import { getEvent } from "@/lib/data";
import { loadResults } from "@/lib/results";
import { ResultsDashboard } from "./results-dashboard";

export default async function ResultadosPage({ params }: PageProps<"/eventos/[id]/resultados">) {
  const { id } = await params;
  const { supabase, event, canEdit } = await getEvent(id);
  const data = await loadResults(supabase, event);
  return <ResultsDashboard data={data} canEdit={canEdit} />;
}
