import Link from "next/link";
import { CalendarClock, ChevronRight, ClipboardList, LayoutList, Plus, Table2, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { getTeacherClass } from "@/lib/aula/data";
import { getClassActivities } from "@/lib/aula/activities-data";
import {
  finalScore,
  formatScore,
  isPastDue,
  isVisible,
  KIND_INFO,
  latestByOwner,
  studentTrack,
  TRACK_INFO,
  type Activity,
} from "@/lib/aula/activities";
import { dueLabel } from "@/lib/aula/attendance";
import { byLastName } from "@/lib/aula/types";
import { cn } from "@/lib/utils";

function nowMs() {
  return new Date().getTime();
}

function StatusChip({ a, now }: { a: Activity; now: number }) {
  if (a.status === "draft") return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Borrador</span>;
  if (a.status === "closed") return <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-white">Cerrada</span>;
  if (!isVisible(a, now)) return <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">Programada</span>;
  if (isPastDue(a, now)) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Venció</span>;
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Activa</span>;
}

export default async function ActivitiesPage({ params, searchParams }: PageProps<"/aula/[id]/actividades">) {
  const { id } = await params;
  const sp = await searchParams;
  const view = sp.v === "seguimiento" ? "seguimiento" : "lista";
  const { students } = await getTeacherClass(id);
  const { activities, submissions, teams } = await getClassActivities(id);
  const active = students.filter((s) => s.status === "active").sort(byLastName);
  const now = nowMs();

  const perActivity = activities.map((a) => {
    const subs = submissions.filter((s) => s.activity_id === a.id);
    const latest = latestByOwner(subs, a.mode);
    const teamOf = new Map(teams.filter((t) => t.activity_id === a.id).flatMap((t) => t.members.map((m) => [m, t.id] as const)));
    const tracks = active.map((s) => studentTrack(s.id, a, latest, teamOf, now));
    return {
      a,
      latest,
      teamOf,
      tracks,
      delivered: tracks.filter((t) => ["submitted", "late", "graded"].includes(t.status)).length,
      toGrade: [...latest.values()].filter((s) => s.status === "submitted").length,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-2" aria-label="Vistas">
          {(
            [
              ["lista", "Actividades", LayoutList],
              ["seguimiento", "Seguimiento", Table2],
            ] as const
          ).map(([k, label, Icon]) => (
            <Link
              key={k}
              href={`/aula/${id}/actividades${k === "lista" ? "" : "?v=seguimiento"}`}
              aria-current={view === k ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold",
                view === k ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50",
              )}
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <LinkButton href={`/aula/${id}/actividades/nueva`} className="rounded-xl">
          <Plus className="size-4" /> Nueva actividad
        </LinkButton>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-10" />}
          title="Aún no hay actividades"
          description="Crea tareas, investigaciones o asigna tus herramientas interactivas (fichas, trivia, sopa de letras…)."
          action={
            <LinkButton href={`/aula/${id}/actividades/nueva`}>
              <Plus className="size-4" /> Nueva actividad
            </LinkButton>
          }
        />
      ) : view === "lista" ? (
        <div className="space-y-3">
          {perActivity.map(({ a, delivered, toGrade }) => (
            <Link key={a.id} href={`/aula/${id}/actividades/${a.id}`} className="group block">
              <Card className="flex flex-wrap items-center gap-4 rounded-2xl p-4 transition-shadow group-hover:shadow-md">
                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", KIND_INFO[a.kind].cls)}>{KIND_INFO[a.kind].label}</span>
                    <StatusChip a={a} now={now} />
                    {a.mode === "team" && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Users className="size-3.5" /> En equipos
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-bold text-slate-900 group-hover:text-violet-700">{a.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                    <CalendarClock className="size-4" /> {a.due_at ? `Entrega: ${dueLabel(a.due_at)}` : "Sin fecha límite"}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-bold text-slate-900">
                    {delivered} / {active.length}
                  </div>
                  <div className="text-xs text-slate-500">entregaron</div>
                </div>
                {toGrade > 0 && <span className="rounded-full bg-coral px-2.5 py-1 text-xs font-bold text-white">{toGrade} por calificar</span>}
                <ChevronRight className="size-5 text-slate-300" />
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="sticky left-0 z-10 min-w-44 bg-slate-50 px-4 py-2.5 uppercase tracking-wide">Estudiante</th>
                  {perActivity.map(({ a }) => (
                    <th key={a.id} className="min-w-28 px-2 py-2.5 align-bottom font-semibold normal-case">
                      <Link href={`/aula/${id}/actividades/${a.id}`} className="line-clamp-2 text-slate-700 hover:text-violet-700" title={a.title}>
                        {a.title}
                      </Link>
                      <span className="block font-normal text-slate-400">/{formatScore(Number(a.max_score))}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.map((s, i) => (
                  <tr key={s.id}>
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-slate-900">
                      {s.last_name}
                      {s.last_name && ", "}
                      {s.first_name}
                    </td>
                    {perActivity.map(({ a, tracks }) => {
                      const t = tracks[i];
                      const sc = t.submission && t.status === "graded" ? finalScore(t.submission, a) : null;
                      return (
                        <td key={a.id} className="px-2 py-2">
                          <span className={cn("inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", TRACK_INFO[t.status].cls)} title={TRACK_INFO[t.status].label}>
                            {t.status === "graded" ? formatScore(sc) : TRACK_INFO[t.status].short}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3 text-xs">
            {(Object.keys(TRACK_INFO) as (keyof typeof TRACK_INFO)[]).map((k) => (
              <span key={k} className={cn("rounded-full px-2 py-0.5 font-semibold", TRACK_INFO[k].cls)}>
                {TRACK_INFO[k].short} = {TRACK_INFO[k].label}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
