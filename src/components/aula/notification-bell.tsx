"use client";

import { AlarmClock, Bell, CheckCheck, X } from "lucide-react";
import { NOTICE_ICONS, timeAgo, type Notice, type Reminder } from "@/lib/aula/notifications";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type { Notice, Reminder };

export function NotificationBell({ reminders = [] }: { reminders?: Reminder[] }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [now, setNow] = useState(() => new Date().getTime());
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [{ data }, { count }] = await Promise.all([
      supabase.from("notifications").select("id, kind, title, body, link, visible_at, read_at").order("visible_at", { ascending: false }).limit(15),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    setItems((data ?? []) as Notice[]);
    setUnread(count ?? 0);
    setNow(new Date().getTime());
  }, [supabase]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("evalqr:notifications", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("evalqr:notifications", onFocus);
    };
  }, [load]);

  // Al cambiar de página, recargar y cerrar
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [pathname, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => panel.current && !panel.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(id: number) {
    setItems((x) => x.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - (items.find((n) => n.id === id && !n.read_at) ? 1 : 0)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }
  async function markAll() {
    setItems((x) => x.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  }

  const badge = unread + reminders.length;
  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-violet-50 hover:text-violet-800"
        aria-label={badge ? `Notificaciones: ${badge} sin leer` : "Notificaciones"}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {badge > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold leading-4 text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-bold text-slate-900">Notificaciones</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button type="button" onClick={markAll} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                  <CheckCheck className="size-4" /> Marcar todo leído
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 sm:hidden" aria-label="Cerrar">
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {reminders.map((r) => (
              <Link key={r.id} href={r.href} className="flex gap-3 border-b border-slate-100 bg-[#fff8e6]/60 px-4 py-3 hover:bg-[#fff8e6]">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fff1cc] text-[#9a6400]">
                  <AlarmClock className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{r.title}</span>
                  <span className="block text-xs text-slate-600">{r.subtitle}</span>
                </span>
              </Link>
            ))}
            {items.length === 0 && reminders.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No tienes notificaciones.</p>}
            {items.map((n) => {
              const meta = NOTICE_ICONS[n.kind] ?? { icon: Bell, cls: "bg-slate-100 text-slate-600" };
              const Icon = meta.icon;
              const content = (
                <>
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", meta.cls)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", n.read_at ? "text-slate-700" : "font-semibold text-slate-900")}>{n.title}</span>
                    {n.body && <span className="block truncate text-xs text-slate-500">{n.body}</span>}
                    <span className="block text-[11px] text-slate-400">{timeAgo(n.visible_at, now)}</span>
                  </span>
                  {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-violet-600" aria-label="Sin leer" />}
                </>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => markRead(n.id)} className={cn("flex gap-3 border-b border-slate-100 px-4 py-3 hover:bg-violet-50/60", !n.read_at && "bg-violet-50/40")}>
                  {content}
                </Link>
              ) : (
                <button key={n.id} type="button" onClick={() => markRead(n.id)} className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-violet-50/60">
                  {content}
                </button>
              );
            })}
          </div>
          <Link href="/notificaciones" className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-violet-700 hover:bg-violet-50">
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
