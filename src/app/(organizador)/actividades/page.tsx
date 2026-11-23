import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ChevronRight, ClipboardList, Users } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getStudentClasses } from "@/lib/aula/data";
import { getMyActivities } from "@/lib/aula/activities-data";
import { dueBadge, finalScore, formatScore, KIND_INFO, trackStatus, TRACK_INFO, type Submission, type TrackStatus } from "@/lib/aula/activities";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mis actividades" };

const TABS = [
  { key: "pendientes", label: "Pendientes", match: ["pending", "missing", "returned"] as TrackStatus[] },
  { key: "entregadas", label: "Entregadas", match: ["submitted", "late"] as TrackStatus[] },
  { key: "calificadas", label: "Calificadas", match: ["graded"] as TrackStatus[] },
];

function nowMs() {
  return new Date().getTime();
}

export default async function MyActivitiesPage({ searchParams }: PageProps<"/actividades">) {
  const { role } = await requireUser();
  if (role === "teacher") redirect("/aula");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.v) ?? TABS[0];
  const [classes, { activities, submissions }] = await Promise.all([getStudentClasses(), getMyActivities()]);
  const className = new Map(classes.map((c) => [c.id, c]));
  const now = nowMs();

  const items = activities
    .filter((a) => className.has(a.class_id))
    .map((a) => {
      const mine = submissions.filter((s) => s.activity_id === a.id).sort((x, y) => Date.parse(y.submitted_at) - Date.parse(x.submitted_at));
      const latest: Submission | undefined = mine[0];
      return { a, latest, status: trackStatus(latest, a, now) };
    });
  const count = (t: (typeof TABS)[number]) => items.filter((i) => t.match.includes(i.status)).length;
  const list = items
    .filter((i) => tab.match.includes(i.status))
    .sort((x, y) => (Date.parse(x.a.due_at ?? "9999-12-31") - Date.parse(y.a.due_at ?? "9999-12-31")) * (tab.key === "calificadas" ? -1 : 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-violet-950">Mis actividades</h1>
        <p className="mt-1 text-slate-600">Tareas, investigaciones y actividades interactivas de tus grupos.</p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "pendientes" ? "/actividades" : `/actividades?v=${t.key}`}
            aria-current={tab.key === t.key ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold",
              tab.key === t.key ? "bg-turquoise-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50",
            )}
          >
            {t.label} ({count(t)})
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-10" />}
          title={tab.key === "pendientes" ? "¡No tienes pendientes!" : "Nada por aquí todavía"}
          description={tab.key === "pendientes" ? "Cuando tu docente publique una actividad, aparecerá aquí." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {list.map(({ a, latest, status }) => {
            const c = className.get(a.class_id)!;
            const due = dueBadge(a, status, now);
            const score = latest?.status === "graded" ? finalScore(latest, a) : null;
            return (
              <Link key={a.id} href={`/actividades/${a.id}`} className="group block">
                <Card className="flex flex-wrap items-center gap-4 rounded-2xl p-4 transition-shadow group-hover:shadow-md">
                  <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", KIND_INFO[a.kind].cls)}>{KIND_INFO[a.kind].label}</span>
                      {a.mode === "team" && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Users className="size-3.5" /> En equipo
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-bold text-slate-900 group-hover:text-violet-700">{a.title}</div>
                    <div className="text-sm text-slate-500">{c.name}</div>
                  </div>
                  {due ? (
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", due.cls)}>{due.text}</span>
                  ) : (
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", TRACK_INFO[status].cls)}>{TRACK_INFO[status].label}</span>
                  )}
                  {score != null && (
                    <span className="text-lg font-extrabold text-violet-950">
                      {formatScore(score)}
                      <span className="text-sm font-normal text-slate-400">/{formatScore(Number(a.max_score))}</span>
                    </span>
                  )}
                  {!a.due_at && !due && status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <CalendarClock className="size-3.5" /> Sin fecha
                    </span>
                  )}
                  <ChevronRight className="size-5 text-slate-300" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
