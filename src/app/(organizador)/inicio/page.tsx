import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Plus,
  QrCode,
  Sparkles,
  Star,
  Trophy,
  Upload,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { ClassBadge, StatCard } from "@/components/aula/stat-card";
import { JoinForm } from "@/components/aula/join-form";
import { requireUser } from "@/lib/auth";
import { getStudentClasses, getTeacherClasses } from "@/lib/aula/data";
import { getMyAttendance } from "@/lib/aula/attendance-data";
import { getMyActivities } from "@/lib/aula/activities-data";
import { getMyGrades } from "@/lib/aula/gradebook-data";
import { dueBadge, trackStatus } from "@/lib/aula/activities";
import { countStatuses, formatRate } from "@/lib/aula/attendance";
import { scheduleSummary } from "@/lib/aula/types";
import type { EventRow } from "@/lib/types";
import { cn, formatDate, semesterLabel, STATUS_LABELS } from "@/lib/utils";

export const metadata: Metadata = { title: "Inicio" };

function firstName(full: string) {
  const parts = full.replace(/^(mtr[oa]\.?|dr[a]?\.?|lic\.?|ing\.?)\s+/i, "").split(/\s+/);
  return parts[0] && !parts[0].includes("@") ? parts[0] : "";
}

function Greeting({ name, subtitle }: { name: string; subtitle: string }) {
  const first = firstName(name);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-lavender via-[#f3ecff] to-turquoise-50 p-6 sm:p-8">
      <div className="absolute -right-8 -top-10 size-40 rounded-full bg-lilac/20" aria-hidden />
      <div className="absolute -bottom-12 right-24 size-28 rounded-full bg-turquoise/25" aria-hidden />
      <h1 className="relative text-3xl font-extrabold text-violet-950 sm:text-4xl">
        ¡Hola{first ? `, ${first}` : ""}! <span aria-hidden>👋</span>
      </h1>
      <p className="relative mt-1 text-slate-600">{subtitle}</p>
    </div>
  );
}

const QUICK_TONES = {
  violet: "bg-violet-50 text-violet-700 ring-violet-100 hover:bg-violet-100",
  turquoise: "bg-turquoise-50 text-turquoise-700 ring-turquoise-100 hover:bg-turquoise-100",
  lilac: "bg-[#f6efff] text-[#8a2be2] ring-[#ead9ff] hover:bg-[#efe2ff]",
  sun: "bg-[#fff8e6] text-[#9a6400] ring-[#ffecb8] hover:bg-[#fff1cc]",
  coral: "bg-[#fff1f4] text-[#d93a60] ring-[#ffd9e1] hover:bg-[#ffe4ea]",
};

function QuickAction({ href, icon: Icon, label, tone, soon }: { href: string; icon: LucideIcon; label: string; tone: keyof typeof QUICK_TONES; soon?: boolean }) {
  const cls = cn(
    "relative flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center text-sm font-bold ring-1 transition-colors",
    QUICK_TONES[tone],
    soon && "cursor-default opacity-60 hover:bg-inherit",
  );
  const body = (
    <>
      <Icon className="size-8" aria-hidden />
      <span className="leading-tight text-slate-800">{label}</span>
      {soon && <span className="absolute right-2 top-2 rounded-full bg-white px-1.5 text-[10px] font-semibold uppercase text-slate-500">Pronto</span>}
    </>
  );
  return soon ? (
    <div className={cls} aria-disabled>
      {body}
    </div>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

export default async function InicioPage() {
  const { role, fullName } = await requireUser();
  return role === "teacher" ? <TeacherHome name={fullName} /> : <StudentHome name={fullName} />;
}

async function TeacherHome({ name }: { name: string }) {
  const { supabase, userId } = await requireUser();
  const [classes, { data: events }, { count: toolCount }] = await Promise.all([
    getTeacherClasses(),
    supabase.from("events").select("id, name, event_date, status, primary_color").order("created_at", { ascending: false }).limit(4).returns<Pick<EventRow, "id" | "name" | "event_date" | "status" | "primary_color">[]>(),
    supabase.from("teacher_tools").select("id", { count: "exact", head: true }).eq("owner_id", userId),
  ]);
  const active = classes.filter((c) => !c.archived_at);
  const students = active.reduce((n, c) => n + c.activeCount, 0);
  const firstClass = active[0];

  return (
    <div className="space-y-7">
      <Greeting name={name} subtitle="Panel docente · Gestiona tus grupos, eventos y actividades." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={GraduationCap} value={active.length} label="Grupos activos" tone="violet" />
        <StatCard icon={Users} value={students} label="Estudiantes" tone="lilac" />
        <StatCard icon={Trophy} value={events?.length ?? 0} label="Eventos recientes" tone="sun" />
        <StatCard icon={Wrench} value={toolCount ?? 0} label="Actividades creadas" tone="turquoise" />
      </div>

      <section>
        <h2 className="mb-3 text-xl font-extrabold text-violet-950">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <QuickAction href="/aula/nuevo" icon={Plus} label="Crear grupo" tone="violet" />
          <QuickAction href={firstClass ? `/aula/${firstClass.id}` : "/aula/nuevo"} icon={UserPlus} label="Invitar estudiantes" tone="turquoise" />
          <QuickAction href={firstClass ? `/aula/${firstClass.id}/estudiantes?importar=1` : "/aula/nuevo"} icon={Upload} label="Importar lista (CSV)" tone="lilac" />
          <QuickAction href="/eventos/nuevo" icon={Trophy} label="Evaluar proyectos (feria/expo)" tone="sun" />
          <QuickAction href="/herramientas" icon={Sparkles} label="Crear actividad" tone="coral" />
          <QuickAction href={firstClass ? `/aula/${firstClass.id}/asistencia` : "/aula/nuevo"} icon={QrCode} label="Tomar asistencia" tone="turquoise" />
          <QuickAction href={firstClass ? `/aula/${firstClass.id}/actividades/nueva` : "/aula/nuevo"} icon={ClipboardList} label="Asignar tarea" tone="violet" />
          <QuickAction href="#" icon={BarChart3} label="Ver reportes" tone="lilac" soon />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h2 className="text-xl font-extrabold text-violet-950">Mis grupos</h2>
            <Link href="/aula" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </div>
          {active.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">Aún no tienes grupos. Crea uno para invitar a tus estudiantes.</p>
          ) : (
            <ul className="divide-y divide-slate-100 px-2">
              {active.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link href={`/aula/${c.id}`} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-violet-50/60">
                    <ClassBadge color={c.color} name={c.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-slate-900">{c.name}</div>
                      <div className="truncate text-sm text-slate-500">
                        {[semesterLabel(c.grade), `${c.activeCount} estudiante${c.activeCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="p-5 pt-3 text-center">
            <LinkButton href="/aula/nuevo" className="rounded-xl">
              <Plus className="size-4" /> Crear nuevo grupo
            </LinkButton>
          </div>
        </Card>

        <Card className="rounded-2xl">
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h2 className="text-xl font-extrabold text-violet-950">Evaluación de proyectos</h2>
            <Link href="/eventos" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">
              Ver eventos <ArrowRight className="size-4" />
            </Link>
          </div>
          {!events?.length ? (
            <p className="px-5 py-4 text-sm text-slate-500">Crea un evento para calificar proyectos finales con QR.</p>
          ) : (
            <ul className="divide-y divide-slate-100 px-2 pb-3">
              {events.map((e) => (
                <li key={e.id}>
                  <Link href={`/eventos/${e.id}`} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-violet-50/60">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${e.primary_color}1f`, color: e.primary_color }}>
                      <CalendarCheck className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-slate-900">{e.name}</div>
                      <div className="text-sm text-slate-500">{e.event_date ? formatDate(e.event_date) : "Sin fecha"}</div>
                    </div>
                    <Badge tone={e.status === "open" ? "green" : e.status === "published" ? "violet" : e.status === "closed" ? "amber" : "slate"}>
                      {STATUS_LABELS[e.status]}
                    </Badge>
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

function nowForBadges() {
  return new Date().getTime();
}

/** Actividades por hacer del estudiante (pendientes, vencidas o devueltas), las más próximas primero. */
function pendingActivities(
  activities: Awaited<ReturnType<typeof getMyActivities>>["activities"],
  submissions: Awaited<ReturnType<typeof getMyActivities>>["submissions"],
  classIds: Set<string>,
) {
  const now = new Date().getTime();
  return activities
    .filter((a) => classIds.has(a.class_id) && a.status === "published")
    .map((a) => {
      const latest = submissions.filter((s) => s.activity_id === a.id).sort((x, y) => Date.parse(y.submitted_at) - Date.parse(x.submitted_at))[0];
      return { a, status: trackStatus(latest, a, now) };
    })
    .filter((x) => x.status === "pending" || x.status === "missing" || x.status === "returned")
    .sort((x, y) => Date.parse(x.a.due_at ?? "9999-12-31") - Date.parse(y.a.due_at ?? "9999-12-31"));
}

/** Sesiones abiertas cuyo QR sigue vigente. */
function stillOpen<T extends { status: string; expires_at: string }>(sessions: T[]) {
  const now = new Date().getTime();
  return sessions.filter((s) => s.status === "open" && Date.parse(s.expires_at) > now);
}

async function StudentHome({ name }: { name: string }) {
  const [classes, att, acts, myGrades] = await Promise.all([getStudentClasses(), getMyAttendance(), getMyActivities(), getMyGrades()]);
  const finals = myGrades.filter((x) => !x.cls.archived_at && x.grades?.final != null).map((x) => (x.grades!.final! / x.settings.scale) * 10);
  const generalAvg = finals.length ? Math.round((finals.reduce((a, b) => a + b, 0) / finals.length) * 10) / 10 : null;
  const active = classes.filter((c) => !c.archived);
  const mine = new Set(att.studentIds.values());
  const myCounts = countStatuses(att.records.filter((r) => mine.has(r.student_id)).map((r) => r.status));
  const openNow = stillOpen(att.sessions);
  const pendingActs = pendingActivities(acts.activities, acts.submissions, new Set(active.map((c) => c.id)));
  const classById = new Map(active.map((c) => [c.id, c]));
  return (
    <div className="space-y-7">
      <Greeting name={name} subtitle="Este es el resumen de tus clases y actividades." />
      {openNow.length > 0 && (
        <Link href="/asistencia" className="flex items-center gap-4 rounded-2xl bg-turquoise-700 p-5 text-white shadow-md hover:bg-[#006b5d]">
          <QrCode className="size-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold">¡Pase de lista abierto!</div>
            <div className="text-sm text-turquoise-50">Escanea el QR de tu docente o toca aquí para escribir el código.</div>
          </div>
          <ArrowRight className="size-6" />
        </Link>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={GraduationCap} value={active.length} label="Grupos activos" tone="violet" />
        <StatCard icon={QrCode} value={formatRate(myCounts.rate)} label="Asistencia" tone="turquoise" hint={myCounts.absent ? `${myCounts.absent} falta${myCounts.absent === 1 ? "" : "s"}` : undefined} />
        <StatCard icon={ClipboardList} value={pendingActs.length} label="Tareas pendientes" tone="coral" hint={pendingActs.some((p) => p.status === "missing") ? "Tienes entregas vencidas" : undefined} />
        <StatCard icon={Star} value={generalAvg ?? "—"} label="Promedio general" tone="sun" hint={generalAvg != null ? "Escala 0–10" : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="rounded-2xl">
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h2 className="text-xl font-extrabold text-violet-950">Mis grupos</h2>
            <Link href="/aula" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </div>
          {active.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-500">
              Aún no estás en ningún grupo. Escribe el código que te dio tu docente o abre su enlace de invitación.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 px-2 pb-3">
              {active.map((c) => (
                <li key={c.id}>
                  <Link href={`/aula/${c.id}`} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-violet-50/60">
                    <ClassBadge color={c.color} name={c.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-slate-900">{c.name}</div>
                      <div className="truncate text-sm text-slate-500">
                        {[semesterLabel(c.grade), c.teacher, scheduleSummary(c.schedule)].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-6">
          <Card className="rounded-2xl p-5">
            <h2 className="text-lg font-extrabold text-violet-950">Unirme a un grupo</h2>
            <p className="mb-3 text-sm text-slate-500">Escribe el código que te dio tu docente.</p>
            <JoinForm />
          </Card>
          <Card className="rounded-2xl">
            <div className="flex items-center justify-between px-5 pb-2 pt-5">
              <h2 className="text-lg font-extrabold text-violet-950">Mis actividades</h2>
              <Link href="/actividades" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">
                Ver todas <ArrowRight className="size-4" />
              </Link>
            </div>
            {pendingActs.length === 0 ? (
              <div className="px-5 pb-5 text-center">
                <CalendarCheck className="mx-auto size-10 text-violet-300" />
                <p className="mt-1 text-sm text-slate-500">¡Estás al día! No tienes actividades pendientes.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 px-2 pb-3">
                {pendingActs.slice(0, 5).map(({ a, status }) => {
                  const due = dueBadge(a, status, nowForBadges());
                  return (
                    <li key={a.id}>
                      <Link href={`/actividades/${a.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-violet-50/60">
                        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: classById.get(a.class_id)?.color }} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-slate-900">{a.title}</div>
                          <div className="truncate text-xs text-slate-500">{classById.get(a.class_id)?.name}</div>
                        </div>
                        {status === "missing" ? (
                          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Vencida</span>
                        ) : status === "returned" ? (
                          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">Corregir</span>
                        ) : due ? (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${due.cls}`}>{due.text}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
