import type { Metadata } from "next";
import Link from "next/link";
import { Archive, ChevronRight, GraduationCap, Plus, Upload, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { ClassBadge } from "@/components/aula/stat-card";
import { JoinForm } from "@/components/aula/join-form";
import { requireUser } from "@/lib/auth";
import { getStudentClasses, getTeacherClasses } from "@/lib/aula/data";
import { scheduleSummary } from "@/lib/aula/types";
import { cn, semesterLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Aula" };

export default async function AulaPage({ searchParams }: PageProps<"/aula">) {
  const { role } = await requireUser();
  if (role === "student") return <StudentGroups />;
  const sp = await searchParams;
  const showArchived = sp.ver === "archivados";
  const all = await getTeacherClasses();
  const list = all.filter((c) => (showArchived ? c.archived_at : !c.archived_at));
  const archivedCount = all.filter((c) => c.archived_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-violet-950">Mis grupos</h1>
          <p className="mt-1 text-slate-600">Tus clases, estudiantes e invitaciones.</p>
        </div>
        <LinkButton href="/aula/nuevo" size="lg" className="rounded-xl">
          <Plus className="size-5" /> Crear nuevo grupo
        </LinkButton>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Filtrar grupos">
        {[
          { href: "/aula", label: "Activos", active: !showArchived, n: all.length - archivedCount },
          { href: "/aula?ver=archivados", label: "Archivados", active: showArchived, n: archivedCount },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={t.active}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold",
              t.active ? "bg-turquoise-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50",
            )}
          >
            {t.label} ({t.n})
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        showArchived ? (
          <EmptyState icon={<Archive className="size-10" />} title="No tienes grupos archivados" description="Cuando termine un periodo, archiva el grupo para conservar su información." />
        ) : (
          <EmptyState
            icon={<GraduationCap className="size-10" />}
            title="Crea tu primer grupo"
            description="Agrega a tus estudiantes con un CSV o compárteles un enlace o código para que se unan."
            action={
              <LinkButton href="/aula/nuevo">
                <Plus className="size-4" /> Crear grupo
              </LinkButton>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} href={`/aula/${c.id}`} className="group">
              <Card className="h-full overflow-hidden rounded-2xl transition-shadow group-hover:shadow-md">
                <div className="h-2" style={{ background: c.color }} />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <ClassBadge color={c.color} name={c.name} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold leading-tight text-slate-900 group-hover:text-violet-700">{c.name}</h2>
                      {c.isCoTeacher && <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">Co-docente</span>}
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {[c.subject, semesterLabel(c.grade)].filter(Boolean).join(" · ") || "Sin materia"}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-slate-300 group-hover:text-violet-600" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-4 text-turquoise-700" /> {c.activeCount} estudiante{c.activeCount === 1 ? "" : "s"}
                    </span>
                    {c.invitedCount > 0 && <span className="text-amber-700">{c.invitedCount} invitación{c.invitedCount === 1 ? "" : "es"} pendiente{c.invitedCount === 1 ? "" : "s"}</span>}
                  </div>
                  {(c.period || c.schedule.length > 0) && (
                    <p className="mt-2 truncate text-xs text-slate-500">{[c.period, scheduleSummary(c.schedule)].filter(Boolean).join(" · ")}</p>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    Código: <span className="font-mono font-bold tracking-wider text-violet-700">{c.join_code}</span>
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!showArchived && all.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Upload className="size-4" /> Para importar una lista CSV, entra al grupo → Estudiantes.
        </p>
      )}
    </div>
  );
}

async function StudentGroups() {
  const classes = await getStudentClasses();
  const active = classes.filter((c) => !c.archived);
  const archived = classes.filter((c) => c.archived);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-violet-950">Mis grupos</h1>
        <p className="mt-1 text-slate-600">Las clases a las que perteneces.</p>
      </div>
      <Card className="rounded-2xl p-5">
        <h2 className="font-bold text-slate-900">Unirme a un grupo</h2>
        <p className="mb-3 text-sm text-slate-500">Escribe el código que te dio tu docente.</p>
        <JoinForm />
      </Card>
      {active.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-10" />}
          title="Aún no estás en ningún grupo"
          description="Pide a tu docente el código o el enlace del grupo. Si te invitó con tu correo, aparecerá aquí automáticamente."
        />
      ) : (
        <StudentClassGrid classes={active} />
      )}
      {archived.length > 0 && (
        <div>
          <h2 className="mb-3 font-bold text-slate-700">Periodos anteriores</h2>
          <StudentClassGrid classes={archived} />
        </div>
      )}
    </div>
  );
}

function StudentClassGrid({ classes }: { classes: Awaited<ReturnType<typeof getStudentClasses>> }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {classes.map((c) => (
        <Link key={c.id} href={`/aula/${c.id}`} className="group">
          <Card className="h-full overflow-hidden rounded-2xl transition-shadow group-hover:shadow-md">
            <div className="h-2" style={{ background: c.color }} />
            <div className="flex items-start gap-3 p-5">
              <ClassBadge color={c.color} name={c.name} />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold leading-tight text-slate-900 group-hover:text-violet-700">{c.name}</h3>
                <p className="mt-0.5 text-sm text-slate-500">{[c.subject, semesterLabel(c.grade)].filter(Boolean).join(" · ")}</p>
                <p className="mt-2 text-sm text-slate-700">{c.teacher}</p>
                {c.schedule.length > 0 && <p className="mt-1 text-xs text-slate-500">{scheduleSummary(c.schedule)}</p>}
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-300 group-hover:text-violet-600" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
