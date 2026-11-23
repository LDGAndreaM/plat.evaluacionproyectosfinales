import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/card";
import { NOTICE_ICONS, timeAgo, type Notice } from "@/lib/aula/notifications";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ClearReadButton, MarkAllReadButton } from "./buttons";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificationsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, visible_at, read_at")
    .order("visible_at", { ascending: false })
    .limit(150);
  const items = (data ?? []) as Notice[];
  const unread = items.filter((n) => !n.read_at).length;
  const now = new Date().getTime();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-violet-950">Notificaciones</h1>
          <p className="mt-1 text-slate-600">{unread ? `${unread} sin leer` : "Estás al día."}</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && <MarkAllReadButton />}
          {items.some((n) => n.read_at) && <ClearReadButton />}
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="size-10" />} title="No tienes notificaciones" description="Aquí verás avisos de actividades, calificaciones, asistencia y justificantes." />
      ) : (
        <Card className="overflow-hidden rounded-2xl">
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const meta = NOTICE_ICONS[n.kind] ?? { icon: Bell, cls: "bg-slate-100 text-slate-600" };
              const Icon = meta.icon;
              const inner = (
                <div className={cn("flex gap-3 px-5 py-3.5", !n.read_at && "bg-violet-50/40")}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", meta.cls)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={cn(n.read_at ? "text-slate-700" : "font-semibold text-slate-900")}>{n.title}</div>
                    {n.body && <div className="text-sm text-slate-500">{n.body}</div>}
                    <div className="text-xs text-slate-400">{timeAgo(n.visible_at, now)}</div>
                  </div>
                  {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-violet-600" />}
                </div>
              );
              return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-violet-50/60">{inner}</Link> : inner}</li>;
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
