import Link from "next/link";
import { CheckCircle2, ClipboardList, Hourglass, QrCode, Upload, UserPlus, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { InvitePanel } from "@/components/aula/invite-panel";
import { StatCard } from "@/components/aula/stat-card";
import { getTeacherClass } from "@/lib/aula/data";
import { getClassAttendance } from "@/lib/aula/attendance-data";
import { getClassActivities } from "@/lib/aula/activities-data";
import { isPastDue, isVisible, latestByOwner } from "@/lib/aula/activities";
import { countStatuses, formatRate } from "@/lib/aula/attendance";
import { studentName } from "@/lib/aula/types";
import { formatDate } from "@/lib/utils";

export default async function ClassSummaryPage({ params }: PageProps<"/aula/[id]">) {
  const { id } = await params;
  const { cls, students } = await getTeacherClass(id);
  const att = await getClassAttendance(id);
  const attRate = countStatuses(att.records.map((r) => r.status)).rate;
  const pendingExcuses = att.excuses.filter((e) => e.status === "pending").length;
  const acts = await getClassActivities(id);
  const now = new Date().getTime();
  const openActs = acts.activities.filter((a) => a.status === "published" && isVisible(a, now) && !isPastDue(a, now)).length;
  const toGrade = acts.activities.reduce(
    (n, a) => n + [...latestByOwner(acts.submissions.filter((s) => s.activity_id === a.id), a.mode).values()].filter((s) => s.status === "submitted").length,
    0,
  );
  const active = students.filter((s) => s.status === "active");
  const invited = students.filter((s) => s.status === "invited");
  const recent = [...active].sort((a, b) => (b.joined_at ?? "").localeCompare(a.joined_at ?? "")).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} value={active.length} label="Estudiantes activos" tone="violet" />
        <StatCard icon={Hourglass} value={invited.length} label="Invitaciones pendientes" tone="sun" />
        <StatCard
          icon={QrCode}
          value={formatRate(attRate)}
          label="Asistencia promedio"
          tone="turquoise"
          hint={`${att.sessions.length} sesión${att.sessions.length === 1 ? "" : "es"}${pendingExcuses ? ` · ${pendingExcuses} justificante${pendingExcuses === 1 ? "" : "s"} por revisar` : ""}`}
        />
        <StatCard icon={ClipboardList} value={openActs} label="Actividades activas" tone="coral" hint={toGrade ? `${toGrade} entrega${toGrade === 1 ? "" : "s"} por calificar` : `${acts.activities.length} en total`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl">
          <CardHeader title="Invita a tus estudiantes" description="Comparte el enlace, el código o proyecta el QR en clase." />
          <div className="p-5">
            <InvitePanel code={cls.join_code} enabled={cls.join_enabled && !cls.archived_at} />
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <LinkButton href={`/aula/${id}/estudiantes?importar=1`} variant="secondary" size="sm">
                <Upload className="size-4" /> Importar lista (CSV)
              </LinkButton>
              <LinkButton href={`/aula/${id}/asistencia`} size="sm" className="bg-turquoise-700 hover:bg-[#006b5d]">
                <QrCode className="size-4" /> Tomar asistencia
              </LinkButton>
              <LinkButton href={`/aula/${id}/estudiantes?agregar=1`} variant="secondary" size="sm">
                <UserPlus className="size-4" /> Agregar estudiante
              </LinkButton>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader
            title="Se unieron recientemente"
            actions={
              <Link href={`/aula/${id}/estudiantes`} className="text-sm font-semibold text-violet-700 hover:underline">
                Ver todos →
              </Link>
            }
          />
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Todavía nadie se ha unido. Cuando entren con el código o el enlace, aparecerán aquí.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="size-5 shrink-0 text-turquoise-600" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{studentName(s)}</div>
                    <div className="truncate text-xs text-slate-500">{s.email}</div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(s.joined_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {cls.description && (
        <Card className="rounded-2xl p-5">
          <h2 className="font-semibold text-slate-900">Descripción</h2>
          <p className="mt-1 whitespace-pre-line text-slate-700">{cls.description}</p>
        </Card>
      )}
    </div>
  );
}
