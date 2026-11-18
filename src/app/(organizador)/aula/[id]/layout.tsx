import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, CalendarClock, GraduationCap, Mail } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ClassBadge } from "@/components/aula/stat-card";
import { requireUser } from "@/lib/auth";
import { getStudentClasses, getTeacherClass } from "@/lib/aula/data";
import { scheduleSummary } from "@/lib/aula/types";
import { semesterLabel } from "@/lib/utils";
import { ClassTabs } from "./tabs";
import { ClipboardList, QrCode, BarChart3 } from "lucide-react";

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
  const soon = [
    { icon: ClipboardList, title: "Actividades y tareas", text: "Aquí verás tus tareas, fechas de entrega y calificaciones." },
    { icon: QrCode, title: "Asistencia", text: "Registrarás tu asistencia escaneando el QR de la clase." },
    { icon: BarChart3, title: "Calificaciones", text: "Tu avance y promedio del grupo." },
  ];
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
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="size-4 text-violet-600" /> {c.teacher}
              </span>
              {c.teacher_email && (
                <a href={`mailto:${c.teacher_email}`} className="inline-flex items-center gap-1.5 text-violet-700 hover:underline">
                  <Mail className="size-4" /> {c.teacher_email}
                </a>
              )}
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
      {c.archived && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Este grupo pertenece a un periodo que ya terminó.</p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {soon.map((s) => (
          <EmptyState key={s.title} icon={<s.icon className="size-9 text-violet-300" />} title={s.title} description={`${s.text} Muy pronto.`} />
        ))}
      </div>
    </div>
  );
}
