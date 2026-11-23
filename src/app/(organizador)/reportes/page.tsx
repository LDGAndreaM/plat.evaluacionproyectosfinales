import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ChevronRight, FileSpreadsheet, Trophy } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { ClassBadge } from "@/components/aula/stat-card";
import { requireTeacher } from "@/lib/auth";
import { getTeacherClasses } from "@/lib/aula/data";
import { formatDate, STATUS_LABELS } from "@/lib/utils";
import type { EventRow } from "@/lib/types";

export const metadata: Metadata = { title: "Reportes y resultados" };

export default async function TeacherReportsPage() {
  const { supabase } = await requireTeacher();
  const [classes, { data: events }] = await Promise.all([
    getTeacherClasses(),
    supabase.from("events").select("id, name, event_date, status").order("created_at", { ascending: false }).returns<Pick<EventRow, "id" | "name" | "event_date" | "status">[]>(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-violet-950">Reportes y resultados</h1>
        <p className="mt-1 text-slate-600">Calificaciones y reportes de tus grupos, y resultados de tus eventos.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader title="Grupos" description="Calificaciones con ponderación y 9 reportes en Excel, CSV y PDF." />
          {classes.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Aún no tienes grupos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {classes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <ClassBadge color={c.color} name={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.activeCount} estudiantes{c.archived_at ? " · archivado" : ""}
                    </div>
                  </div>
                  <Link href={`/aula/${c.id}/calificaciones`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50">
                    <BarChart3 className="size-4" /> Calificaciones
                  </Link>
                  <Link href={`/aula/${c.id}/reportes`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-turquoise-700 hover:bg-turquoise-50">
                    <FileSpreadsheet className="size-4" /> Reportes
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="rounded-2xl">
          <CardHeader title="Eventos" description="Ranking, podio y exportación de cada evaluación de proyectos." />
          {!events?.length ? (
            <p className="p-5 text-sm text-slate-500">Aún no tienes eventos.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li key={e.id}>
                  <Link href={`/eventos/${e.id}/resultados`} className="flex items-center gap-3 px-5 py-3 hover:bg-violet-50/50">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#fff8e6] text-[#9a6400]">
                      <Trophy className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-slate-900">{e.name}</div>
                      <div className="text-xs text-slate-500">
                        {e.event_date ? formatDate(e.event_date) : "Sin fecha"} · {STATUS_LABELS[e.status]}
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
