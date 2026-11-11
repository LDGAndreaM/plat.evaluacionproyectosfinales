import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FolderKanban, MapPin, Plus, Users } from "lucide-react";
import { requireOrganizer } from "@/lib/auth";
import { Card, EmptyState } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/events/status-badge";
import type { EventRow } from "@/lib/types";
import { formatDate, readableTextColor } from "@/lib/utils";
import { DemoButton } from "./demo-button";

export const metadata: Metadata = { title: "Mis eventos" };

type EventWithCounts = EventRow & { projects: { count: number }[]; submissions: { count: number }[] };

export default async function EventosPage() {
  const { supabase, userId } = await requireOrganizer();
  const { data } = await supabase
    .from("events")
    .select("*, projects(count), submissions(count)")
    .order("created_at", { ascending: false })
    .returns<EventWithCounts[]>();
  const events = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mis eventos</h1>
          <p className="text-sm text-slate-500">Crea un evento, agrega los proyectos y comparte los códigos QR.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {events.length > 0 && <DemoButton />}
          <LinkButton href="/eventos/nuevo">
            <Plus className="size-4" /> Nuevo evento
          </LinkButton>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-10" />}
          title="Aún no tienes eventos"
          description="Crea tu primer evento o carga uno de demostración (Expodiseño AD2026 con 8 proyectos y 3 evaluadores) para conocer la plataforma."
          action={
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <LinkButton href="/eventos/nuevo">
                <Plus className="size-4" /> Nuevo evento
              </LinkButton>
              <DemoButton />
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <Link key={ev.id} href={`/eventos/${ev.id}`} className="group">
              <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                <div
                  className="flex h-20 items-center gap-3 px-4"
                  style={{
                    background: ev.cover_url ? `center / cover url(${ev.cover_url})` : ev.primary_color,
                    color: readableTextColor(ev.primary_color),
                  }}
                >
                  {ev.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.logo_url} alt="" className="size-12 rounded-lg bg-white object-contain p-1 shadow" />
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-snug text-slate-900 group-hover:underline">{ev.name}</h2>
                    <StatusBadge status={ev.status} />
                  </div>
                  <div className="space-y-1 text-sm text-slate-500">
                    {ev.event_date && (
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="size-4" /> {formatDate(ev.event_date)}
                      </p>
                    )}
                    {ev.venue && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="size-4" /> {ev.venue}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-4 border-t border-slate-100 pt-2 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="size-4" /> {ev.projects?.[0]?.count ?? 0} proyectos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" /> {ev.submissions?.[0]?.count ?? 0} evaluaciones
                    </span>
                  </div>
                  {ev.owner_id !== userId && <p className="text-xs text-violet-700">Compartido contigo</p>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
