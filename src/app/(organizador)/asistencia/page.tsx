import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileCheck2, QrCode } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/card";
import { CheckIn } from "@/components/aula/check-in";
import { ClassBadge } from "@/components/aula/stat-card";
import { requireUser } from "@/lib/auth";
import { getStudentClasses } from "@/lib/aula/data";
import { getMyAttendance } from "@/lib/aula/attendance-data";
import { ATT_INFO, countStatuses, formatRate, localDate, sessionLabel, timeLabel, type AttStatus } from "@/lib/aula/attendance";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi asistencia" };

export default async function MyAttendancePage() {
  const { role } = await requireUser();
  if (role === "teacher") redirect("/aula");
  const [classes, { sessions, records, studentIds }] = await Promise.all([getStudentClasses(), getMyAttendance()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-violet-950">Mi asistencia</h1>
        <p className="mt-1 text-slate-600">Regístrate en clase y revisa tu historial.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="h-fit rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-violet-950">
            <QrCode className="size-5 text-turquoise-700" /> Registrar asistencia
          </h2>
          <p className="mb-4 text-sm text-slate-500">Escanea el QR con la cámara de tu celular o escribe aquí el código.</p>
          <CheckIn />
        </Card>

        <div className="space-y-4">
          {classes.length === 0 && <EmptyState icon={<QrCode className="size-10" />} title="Aún no estás en ningún grupo" />}
          {classes.map((c) => {
            const mine = studentIds.get(c.id);
            const sess = sessions.filter((s) => s.class_id === c.id);
            const recs = new Map(records.filter((r) => r.student_id === mine).map((r) => [r.session_id, r]));
            const statuses = [...recs.values()].map((r) => r.status);
            const counts = countStatuses(statuses);
            return (
              <Card key={c.id} className="overflow-hidden rounded-2xl">
                <div className="flex flex-wrap items-center gap-3 p-5">
                  <ClassBadge color={c.color} name={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(["present", "late", "absent", "excused", "review"] as AttStatus[])
                        .filter((s) => counts[s] > 0)
                        .map((s) => (
                          <span key={s} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ATT_INFO[s].cls)}>
                            {ATT_INFO[s].label}: {counts[s]}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-violet-950">{formatRate(counts.rate)}</div>
                    <div className="text-xs text-slate-500">asistencia</div>
                  </div>
                </div>
                {sess.length === 0 ? (
                  <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">Todavía no hay pases de lista.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {sess.slice(0, 12).map((s) => {
                      const r = recs.get(s.id);
                      return (
                        <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                          <span className="min-w-0 flex-1 text-slate-700">
                            {sessionLabel(s.starts_at)}
                            {s.topic ? <span className="text-slate-400"> · {s.topic}</span> : null}
                          </span>
                          {r ? (
                            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", ATT_INFO[r.status].cls)}>
                              {ATT_INFO[r.status].label}
                              {r.checked_at ? ` · ${timeLabel(r.checked_at)}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{s.status === "open" ? "En curso" : "Sin registro"}</span>
                          )}
                          {r && (r.status === "absent" || r.status === "late") && (
                            <Link
                              href={`/justificantes?grupo=${c.id}&fecha=${localDate(s.starts_at)}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline"
                            >
                              <FileCheck2 className="size-3.5" /> Justificar
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
