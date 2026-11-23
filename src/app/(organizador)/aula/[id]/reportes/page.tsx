import { loadClassGradebook } from "@/lib/aula/gradebook-data";
import { toReportData } from "@/lib/aula/report-data";
import { ReportsPanel } from "./reports-panel";

export default async function ReportsPage({ params }: PageProps<"/aula/[id]/reportes">) {
  const { id } = await params;
  const g = await loadClassGradebook(id);
  return <ReportsPanel data={toReportData(g)} />;
}
