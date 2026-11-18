import Link from "next/link";
import { CalendarCheck, ChevronRight, FileCheck2, Radio, Settings2, Users } from "lucide-react";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { getTeacherClass } from "@/lib/aula/data";
import { getClassAttendance } from "@/lib/aula/attendance-data";
import { ATT_INFO, countStatuses, formatRate, sessionLabel, type AttStatus } from "@/lib/aula/attendance";
import { byLastName, studentName } from "@/lib/aula/types";
import { requireUser } from "@/lib/auth";
import { getProfiles } from "@/lib/profile";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { OpenAttendanceForm } from "./open-form";
import { AttendanceSettings } from "./settings-form";
import { ExcusesInbox } from "./excuses-inbox";
import { ExportAttendance } from "./export-button";

const VIEWS = [
  { key: "sesiones", label: "Sesiones", icon: CalendarCheck },
  { key: "resumen", label: "Por estudiante", icon: Users },
  { key: "justificantes", label: "Justificantes", icon: FileCheck2 },
  { key: "ajustes", label: "Ajustes", icon: Settings2 },
] as const;

const SHORT_HEAD: Record<AttStatus, string> = { present: "Presente", late: "Retardo", absent: "Falta", excused: "Justif.", review: "Revisión" };

function Counts({ statuses }: { statuses: AttStatus[] }) {
  const c = countStatuses(statuses);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(["present", "late", "absent", "excused", "review"] as AttStatus[])
        .filter((s) => c[s] > 0)
        .map((s) => (
          <span key={s} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ATT_INFO[s].cls)} title={ATT_INFO[s].label}>
            {ATT_INFO[s].short} {c[s]}
          </span>
        ))}
    </div>
  );
}

export default async function AttendancePage({ params, searchParams }: PageProps<"/aula/[id]/asistencia">) {
  const { id } = await params;
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.key === sp.v) ? (sp.v as string) : "sesiones";
  const { cls, students } = await getTeacherClass(id);
  const { sessions, records, excuses } = await getClassAttendance(id);
  const active = students.filter((s) => s.status === "active").sort(byLastName);
  const open = sessions.find((s) => s.status === "open");
  const pendingExcuses = excuses.filter((e) => e.status === "pending").length;
  const reviewCount = records.filter((r) => r.status === "review").length;

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2" aria-label="Vistas de asistencia">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/aula/${id}/asistencia${v.key === "sesiones" ? "" : `?v=${v.key}`}`}
            aria-current={view === v.key ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold",
              view === v.key ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50",
            )}
          >
            <v.icon className="size-4" /> {v.label}
            {v.key === "justificantes" && pendingExcuses > 0 && (
              <span className="rounded-full bg-coral px-1.5 text-xs font-bold text-white">{pendingExcuses}</span>
            )}
          </Link>
        ))}
      </nav>

      {view === "sesiones" && (
        <>
          {open ? (
            <Link href={`/aula/${id}/asistencia/${open.id}`} className="block">
              <Card className="flex items-center gap-4 rounded-2xl border-turquoise-100 bg-turquoise-50 p-5 hover:shadow-md">
                <span className="relative grid size-12 place-items-center rounded-2xl bg-white text-turquoise-700">
                  <Radio className="size-6" />
                  <span className="absolute right-1 top-1 size-2.5 animate-ping rounded-full bg-turquoise" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-violet-950">Pase de lista en curso</div>
                  <div className="text-sm text-slate-600">
                    {sessionLabel(open.starts_at)}
                    {open.topic ? ` · ${open.topic}` : ""} · {records.filter((r) => r.session_id === open.id).length} de {active.length} registrados
                  </div>
                </div>
                <ChevronRight className="size-5 text-turquoise-700" />
              </Card>
            </Link>
          ) : (
            <Card className="rounded-2xl">
              <CardHeader title="Tomar asistencia" description="Proyecta el QR; tus estudiantes lo escanean con su celular." />
              <div className="p-5">
                {active.length === 0 ? (
                  <p className="text-sm text-slate-500">Primero agrega estudiantes al grupo (deben entrar con su cuenta).</p>
                ) : cls.archived_at ? (
                  <p className="text-sm text-slate-500">El grupo está archivado.</p>
                ) : (
                  <OpenAttendanceForm classId={id} lateAfter={cls.att_late_after_min} />
                )}
              </div>
            </Card>
          )}

          {reviewCount > 0 && (
            <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
              Hay <strong>{reviewCount}</strong> registro{reviewCount === 1 ? "" : "s"} pendiente{reviewCount === 1 ? "" : "s"} de revisión (ubicación fuera del aula o
              sin ubicación). Ábrelos en cada sesión para decidir.
            </p>
          )}

          <Card className="rounded-2xl">
            <CardHeader title="Historial de sesiones" actions={sessions.length > 0 ? <ExportAttendance classId={id} /> : undefined} />
            {sessions.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<CalendarCheck className="size-10" />} title="Aún no hay pases de lista" description="Cuando tomes asistencia, cada sesión aparecerá aquí." />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sessions.map((s) => {
                  const st = records.filter((r) => r.session_id === s.id).map((r) => r.status);
                  return (
                    <li key={s.id}>
                      <Link href={`/aula/${id}/asistencia/${s.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-violet-50/50">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900">
                            {sessionLabel(s.starts_at)}
                            {s.status === "open" && <span className="ml-2 rounded-full bg-turquoise px-2 py-0.5 text-xs font-bold normal-case text-violet-950">En curso</span>}
                          </div>
                          {s.topic && <div className="truncate text-sm text-slate-500">{s.topic}</div>}
                        </div>
                        <Counts statuses={st} />
                        <span className="w-14 text-right text-sm font-bold text-slate-700">{formatRate(countStatuses(st).rate)}</span>
                        <ChevronRight className="size-4 text-slate-300" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {view === "resumen" && <StudentSummary classId={id} students={active} records={records} sessionsCount={sessions.length} />}

      {view === "justificantes" && <ExcusesInbox classId={id} excuses={excuses} students={students} />}

      {view === "ajustes" && <AttendanceSettings cls={cls} />}
    </div>
  );
}

async function StudentSummary({
  classId,
  students,
  records,
  sessionsCount,
}: {
  classId: string;
  students: Awaited<ReturnType<typeof getTeacherClass>>["students"];
  records: Awaited<ReturnType<typeof getClassAttendance>>["records"];
  sessionsCount: number;
}) {
  const { supabase } = await requireUser();
  const profiles = await getProfiles(supabase, students.map((s) => s.user_id ?? ""));
  const rows = students.map((s) => ({ s, c: countStatuses(records.filter((r) => r.student_id === s.id).map((r) => r.status)) }));
  return (
    <Card className="rounded-2xl">
      <CardHeader
        title="Asistencia por estudiante"
        description={`${sessionsCount} sesión${sessionsCount === 1 ? "" : "es"} registrada${sessionsCount === 1 ? "" : "s"}. El porcentaje no cuenta los pendientes de revisión.`}
        actions={sessionsCount > 0 ? <ExportAttendance classId={classId} /> : undefined}
      />
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No hay estudiantes activos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Estudiante</th>
                {(["present", "late", "absent", "excused", "review"] as AttStatus[]).map((s) => (
                  <th key={s} className="px-2 py-2.5 text-center" title={ATT_INFO[s].label}>
                    {SHORT_HEAD[s]}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right">Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ s, c }) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar url={s.user_id ? profiles.get(s.user_id)?.avatar_url : null} name={studentName(s)} className="size-8 text-xs" />
                      <span className="font-medium text-slate-900">
                        {s.last_name}
                        {s.last_name && ", "}
                        {s.first_name}
                      </span>
                    </div>
                  </td>
                  {(["present", "late", "absent", "excused", "review"] as AttStatus[]).map((st) => (
                    <td key={st} className="px-2 py-2.5 text-center text-slate-700">
                      {c[st] || <span className="text-slate-300">0</span>}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-bold",
                        c.rate == null ? "text-slate-400" : c.rate >= 80 ? "bg-emerald-100 text-emerald-800" : c.rate >= 60 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800",
                      )}
                    >
                      {formatRate(c.rate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
