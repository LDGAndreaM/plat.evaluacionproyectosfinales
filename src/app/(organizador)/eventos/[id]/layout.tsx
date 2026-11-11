import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEvent } from "@/lib/data";
import { EventTabs } from "@/components/events/event-tabs";
import { StatusBadge } from "@/components/events/status-badge";
import { Badge } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function EventLayout({ children, params }: LayoutProps<"/eventos/[id]">) {
  const { id } = await params;
  const { event, role } = await getEvent(id);
  return (
    <div className="space-y-6">
      <div className="no-print space-y-3">
        <Link href="/eventos" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="size-4" /> Mis eventos
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          {event.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logo_url} alt="" className="size-14 rounded-xl border border-slate-200 bg-white object-contain p-1" />
          ) : (
            <div className="size-14 rounded-xl" style={{ background: event.primary_color }} aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{event.name}</h1>
              <StatusBadge status={event.status} />
              {role !== "owner" && <Badge tone="blue">{role === "editor" ? "Co-organizador" : "Solo lectura"}</Badge>}
            </div>
            <p className="text-sm text-slate-500">
              {[formatDate(event.event_date), event.venue].filter(Boolean).join(" · ") || "Sin fecha ni sede"}
            </p>
          </div>
        </div>
        <EventTabs eventId={event.id} />
      </div>
      {children}
    </div>
  );
}
