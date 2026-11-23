import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, EyeOff } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getMyGrades } from "@/lib/aula/gradebook-data";
import { formatScore, TRACK_INFO } from "@/lib/aula/activities";
import { formatRate } from "@/lib/aula/attendance";
import { round1 } from "@/lib/aula/grades";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mis calificaciones" };

export default async function MyGradesPage() {
  const { role } = await requireUser();
  if (role === "teacher") redirect("/aula");
  const list = (await getMyGrades()).sort((a, b) => Number(!!a.cls.archived_at) - Number(!!b.cls.archived_at));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-violet-950">Mis calificaciones</h1>
        <p className="mt-1 text-slate-600">Tu calificación en cada grupo con el desglose por rubro.</p>
      </div>
      {list.length === 0 && <EmptyState icon={<BarChart3 className="size-10" />} title="Aún no estás en ningún grupo" />}
      {list.map(({ cls, settings, grades: g }) => (
        <Card key={cls.id} className="overflow-hidden rounded-2xl">
          <div className="h-2" style={{ background: cls.color }} />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-extrabold text-violet-950">{cls.name}</h2>
                <p className="text-sm text-slate-500">
                  Escala 0–{settings.scale} · aprueba con {settings.passing}
                  {cls.archived_at ? " · periodo terminado" : ""}
                </p>
              </div>
              {g ? (
                <div className="text-right">
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-4 py-2 text-3xl font-black",
                      g.final == null ? "bg-slate-100 text-slate-400" : g.passing ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                    )}
                  >
                    {g.final ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{g.final == null ? "Aún sin calificaciones" : "Calificación actual"}</div>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  <EyeOff className="size-4" /> Tu docente aún no publica las calificaciones
                </span>
              )}
            </div>
            {g && (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {settings.categories.map((c) => {
                    const v = g.byCategory[c.id];
                    return (
                      <div key={c.id} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-800">{c.name}</span>
                          <span className="text-slate-500">{c.weight}%</span>
                        </div>
                        <div className="mt-1 text-xl font-extrabold text-violet-950">{v == null ? "—" : `${round1(v * 100)}%`}</div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-turquoise-600" style={{ width: `${Math.round((v ?? 0) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                  <span>
                    Asistencia: <strong className="text-slate-900">{formatRate(g.attendanceRate)}</strong>
                  </span>
                  <span>
                    Entregas: <strong className="text-slate-900">{g.deliveryRate == null ? "—" : `${g.deliveryRate}%`}</strong>
                  </span>
                  {g.missing > 0 && <span className="font-semibold text-red-700">{g.missing} sin entregar</span>}
                  {g.pending > 0 && <span>{g.pending} pendiente{g.pending === 1 ? "" : "s"}</span>}
                </div>
                {g.activities.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-violet-700">Ver actividades ({g.activities.length})</summary>
                    <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
                      {g.activities.map((r) => (
                        <li key={r.activity.id}>
                          <Link href={`/actividades/${r.activity.id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-violet-50/50">
                            <span className="min-w-0 flex-1 truncate">{r.activity.title}</span>
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TRACK_INFO[r.status].cls)}>
                              {r.score != null ? `${formatScore(r.score)} / ${formatScore(Number(r.activity.max_score))}` : TRACK_INFO[r.status].label}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
