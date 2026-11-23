import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, CalendarClock, GraduationCap, Mail } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { ClassBadge } from "@/components/aula/stat-card";
import { requireUser } from "@/lib/auth";
import { getStudentClasses, getTeacherClass } from "@/lib/aula/data";
import { scheduleSummary } from "@/lib/aula/types";
import { semesterLabel } from "@/lib/utils";
import { ClassTabs } from "./tabs";
import { ClipboardList, QrCode, BarChart3, Phone, AtSign } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getProfile } from "@/lib/profile";
import { getMyAttendance } from "@/lib/aula/attendance-data";
import { getMyActivities } from "@/lib/aula/activities-data";
import { getMyGrades } from "@/lib/aula/gradebook-data";
import { finalScore, formatScore, trackStatus, TRACK_INFO } from "@/lib/aula/activities";
import { dueLabel } from "@/lib/aula/attendance";
import { countStatuses, formatRate } from "@/lib/aula/attendance";

export default async function ClassLayout({ children, params }: LayoutProps<"/aula/[id]">) {
  const { id } = await params;
  const { role } = await requireUser();
  if (role === "student") return <StudentClassView id={id} />;

  const { cls } = await getTeacherClass(id);
  return (
    <div className="space-y-5">
      <Link href="/aula" className="no-print inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Mis grupos
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <ClassBadge color={cls.color} name={cls.name} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold leading-tight text-violet-950 sm:text-3xl">{cls.name}</h1>
            {cls.archived_at && (
              <Badge tone="amber">
                <Archive className="size-3" /> Archivado
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-slate-600">
            {[cls.subject, semesterLabel(cls.grade), cls.period].filter(Boolean).join(" · ") || "Sin materia"}
          </p>
          {cls.schedule.length > 0 && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarClock className="size-4" /> {scheduleSummary(cls.schedule)}
            </p>
          )}
        </div>
      </div>
      <ClassTabs id={id} />
      <div>{children}</div>
    </div>
  );
}

/** Lo que ve un estudiante de su grupo. */
async function StudentClassView({ id }: { id: string }) {
  const classes = await getStudentClasses();
  const c = classes.find((x) => x.id === id);
  if (!c) notFound();
  const { supabase } = await requireUser();
  const tp = c.teacher_id ? await getProfile(supabase, c.teacher_id) : null;
  const att = await getMyAttendance();
  const myRate = countStatuses(att.records.filter((r) => r.student_id === att.studentIds.get(c.id)).map((r) => r.status)).rate;
  const acts = await getMyActivities();
  const myGrade = (await getMyGrades()).find((x) => x.cls.id === c.id);
  const now = new Date().getTime();
  const classActs = acts.activities
    .filter((a) => a.class_id === c.id)
    .map((a) => {
      const latest = acts.submissions.filter((s) => s.activity_id === a.id).sort((x, y) => Date.parse(y.submitted_at) - Date.parse(x.submitted_at))[0];
      return { a, latest, status: trackStatus(latest, a, now) };
    });
  return (
    <div className="space-y-5">
      <Link href="/aula" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Mis grupos
      </Link>
      <Card className="overflow-hidden rounded-2xl">
        <div className="h-2.5" style={{ background: c.color }} />
        <div className="flex flex-wrap items-start gap-4 p-5 sm:p-6">
          <ClassBadge color={c.color} name={c.name} className="size-16 text-xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-violet-950 sm:text-3xl">{c.name}</h1>
            <p className="text-slate-600">{[c.subject, semesterLabel(c.grade), c.period].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700">
              {c.schedule.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-turquoise-700" /> {scheduleSummary(c.schedule)}
                </span>
              )}
            </div>
            {c.description && <p className="mt-3 whitespace-pre-line text-slate-700">{c.description}</p>}
          </div>
        </div>
      </Card>
      <Card className="rounded-2xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tu docente</h2>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <Avatar url={tp?.avatar_url} name={c.teacher} className="size-16 text-lg ring-4 ring-lavender" />
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <div className="flex items-center gap-1.5 text-base font-bold text-slate-900">
              <GraduationCap className="size-5 text-violet-600" /> {c.teacher}
            </div>
            {tp?.program && <div className="text-slate-600">{tp.program}</div>}
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {(tp?.contact_email || c.teacher_email) && (
                <a href={`mailto:${tp?.contact_email || c.teacher_email}`} className="inline-flex items-center gap-1.5 break-all text-violet-700 hover:underline">
                  {tp?.contact_email ? <AtSign className="size-4" /> : <Mail className="size-4" />} {tp?.contact_email || c.teacher_email}
                </a>
              )}
              {tp?.phone && (
                <a href={`tel:${tp.phone}`} className="inline-flex items-center gap-1.5 text-violet-700 hover:underline">
                  <Phone className="size-4" /> {tp.phone}
                </a>
              )}
            </div>
            {tp?.about && <p className="whitespace-pre-line pt-1 text-slate-700">{tp.about}</p>}
          </div>
        </div>
      </Card>
      {c.archived && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Este grupo pertenece a un periodo que ya terminó.</p>
      )}
      <Link href="/asistencia" className="block">
        <Card className="flex items-center gap-4 rounded-2xl p-5 hover:shadow-md">
          <span className="grid size-12 place-items-center rounded-2xl bg-turquoise-50 text-turquoise-700">
            <QrCode className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900">Mi asistencia</div>
            <div className="text-sm text-slate-500">Regístrate con el QR, revisa tus faltas y envía justificantes.</div>
          </div>
          <span className="text-2xl font-extrabold text-violet-950">{formatRate(myRate)}</span>
        </Card>
      </Link>
      <Card className="rounded-2xl">
        <div className="flex items-center gap-2 px-5 pb-2 pt-5">
          <ClipboardList className="size-5 text-violet-600" />
          <h2 className="text-lg font-extrabold text-violet-950">Actividades del grupo</h2>
        </div>
        {classActs.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Tu docente aún no publica actividades en este grupo.</p>
        ) : (
          <ul className="divide-y divide-slate-100 px-2 pb-3">
            {classActs.map(({ a, latest, status }) => {
              const sc = latest?.status === "graded" ? finalScore(latest, a) : null;
              return (
                <li key={a.id}>
                  <Link href={`/actividades/${a.id}`} className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-violet-50/60">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-900">{a.title}</div>
                      <div className="text-xs text-slate-500">{a.due_at ? `Entrega: ${dueLabel(a.due_at)}` : "Sin fecha límite"}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TRACK_INFO[status].cls}`}>
                      {sc != null ? `${formatScore(sc)} / ${formatScore(Number(a.max_score))}` : TRACK_INFO[status].label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Link href="/calificaciones" className="block">
        <Card className="flex items-center gap-4 rounded-2xl p-5 hover:shadow-md">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#fff8e6] text-[#9a6400]">
            <BarChart3 className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900">Mi calificación</div>
            <div className="text-sm text-slate-500">
              {myGrade?.grades ? "Desglose por rubro, asistencia y entregas." : "Tu docente aún no publica las calificaciones."}
            </div>
          </div>
          {myGrade?.grades && <span className="text-2xl font-extrabold text-violet-950">{myGrade.grades.final ?? "—"}</span>}
        </Card>
      </Link>
    </div>
  );
}
