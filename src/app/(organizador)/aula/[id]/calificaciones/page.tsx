import { loadClassGradebook } from "@/lib/aula/gradebook-data";
import { toReportData } from "@/lib/aula/report-data";
import { Gradebook } from "./gradebook";

export default async function GradesPage({ params }: PageProps<"/aula/[id]/calificaciones">) {
  const { id } = await params;
  const g = await loadClassGradebook(id);
  return (
    <Gradebook
      classId={id}
      data={toReportData(g)}
      manual={g.manual}
      allActivities={g.allActivities.map((a) => ({ id: a.id, title: a.title, status: a.status, grade_category: a.grade_category ?? null }))}
    />
  );
}
