import Link from "next/link";
import { CheckCircle2, Circle, ClipboardList, FolderKanban, Tags, Users } from "lucide-react";
import { getEvent } from "@/lib/data";
import { Card, CardHeader } from "@/components/ui/card";
import { EventLink } from "@/components/events/event-link";
import { StatusControl } from "@/components/events/status-control";

export default async function EventSummaryPage({ params }: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  const { supabase, event, canEdit } = await getEvent(id);

  const [projects, categories, forms, submissions, evaluators] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("event_id", id),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("event_id", id),
    supabase.from("forms").select("id, is_published").eq("event_id", id),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "submitted"),
    supabase.from("evaluators").select("id", { count: "exact", head: true }).eq("event_id", id),
  ]);
  const projectCount = projects.count ?? 0;
  const publishedForms = (forms.data ?? []).filter((f) => f.is_published).length;

  const stats = [
    { label: "Proyectos", value: projectCount, icon: FolderKanban, href: `/eventos/${id}/proyectos` },
    { label: "Categorías", value: categories.count ?? 0, icon: Tags, href: `/eventos/${id}/proyectos` },
    { label: "Formularios", value: forms.data?.length ?? 0, icon: ClipboardList, href: `/eventos/${id}/formularios` },
    { label: "Evaluaciones enviadas", value: submissions.count ?? 0, icon: Users, href: `/eventos/${id}/resultados` },
  ];

  const checklist = [
    { done: projectCount > 0, label: "Agrega los proyectos (o impórtalos desde CSV)", href: `/eventos/${id}/proyectos` },
    { done: publishedForms > 0, label: "Crea y publica un formulario de evaluación", href: `/eventos/${id}/formularios` },
    { done: event.status !== "draft", label: "Abre el evento para recibir evaluaciones", href: `/eventos/${id}` },
    { done: false, label: "Imprime los códigos QR y pégalos en cada stand", href: `/eventos/${id}/qr` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-4 hover:shadow-md">
              <s.icon className="size-5 text-slate-400" aria-hidden />
              <div className="mt-2 text-2xl font-semibold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title="Estado del evento" description="Avanza paso a paso conforme se desarrolla el evento." />
        <div className="p-5">
          <StatusControl eventId={id} status={event.status} canEdit={canEdit} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Lista de preparación" />
          <ul className="divide-y divide-slate-100">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                  {c.done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-slate-300" />
                  )}
                  <span className={c.done ? "text-slate-500 line-through" : "text-slate-800"}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title="Enlace para evaluadores"
            description="Compártelo o usa los códigos QR. Lleva a la lista de proyectos del evento."
          />
          <div className="space-y-3 p-5">
            <EventLink code={event.short_code} />
            <p className="text-sm text-slate-500">
              Código del evento: <strong className="font-mono text-slate-900">{event.short_code}</strong>
              {event.access_pin ? (
                <>
                  {" "}
                  · PIN: <strong className="font-mono text-slate-900">{event.access_pin}</strong>
                </>
              ) : (
                " · Sin PIN"
              )}
            </p>
            <p className="text-sm text-slate-500">
              Evaluadores registrados: <strong className="text-slate-900">{evaluators.count ?? 0}</strong>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
