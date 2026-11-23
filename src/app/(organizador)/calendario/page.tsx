import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getCalendarItems } from "@/lib/aula/calendar-data";
import { CAL_INFO, groupByDate, monthGrid, monthLabel, shiftMonth, type CalItem, type CalKind } from "@/lib/aula/calendar";
import { localDate } from "@/lib/aula/attendance";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendario" };

const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function Chip({ it }: { it: CalItem }) {
  const body = (
    <span className={cn("flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-tight", CAL_INFO[it.kind].cls)}>
      {it.color && <span className="size-1.5 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden />}
      <span className="truncate">
        {it.time && it.kind !== "class" ? `${it.time} ` : ""}
        {it.title}
      </span>
    </span>
  );
  return it.href ? (
    <Link href={it.href} className="block min-w-0 hover:opacity-80" title={[CAL_INFO[it.kind].label, it.title, it.subtitle].filter(Boolean).join(" · ")}>
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  const { role } = await requireUser();
  const sp = await searchParams;
  const today = localDate(new Date());
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const hidden = new Set(typeof sp.ocultar === "string" ? sp.ocultar.split(",") : []);
  const grid = monthGrid(month);
  const items = (await getCalendarItems(grid[0].date, grid[grid.length - 1].date)).filter((i) => !hidden.has(i.kind));
  const byDate = groupByDate(items);
  const monthItems = items.filter((i) => i.date.startsWith(month) && i.kind !== "class").sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  const kinds: CalKind[] = role === "teacher" ? ["due", "publish", "attendance", "class", "event"] : ["due", "attendance", "class"];
  const toggleHref = (k: CalKind) => {
    const next = new Set(hidden);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    const q = new URLSearchParams({ m: month, ...(next.size ? { ocultar: [...next].join(",") } : {}) });
    return `/calendario?${q}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-violet-950">{role === "teacher" ? "Calendario académico" : "Calendario"}</h1>
          <p className="mt-1 text-slate-600">{role === "teacher" ? "Entregas, publicaciones, clases, pases de lista y eventos." : "Tus entregas, clases y pases de lista."}</p>
        </div>
        <a href="/calendario/ics" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
          <Download className="size-4" /> Agregar a mi calendario (.ics)
        </a>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-1">
            <Link href={`/calendario?m=${shiftMonth(month, -1)}`} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Mes anterior">
              <ChevronLeft className="size-5" />
            </Link>
            <Link href={`/calendario?m=${shiftMonth(month, 1)}`} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Mes siguiente">
              <ChevronRight className="size-5" />
            </Link>
          </div>
          <h2 className="text-lg font-extrabold text-violet-950">{monthLabel(month)}</h2>
          {month !== today.slice(0, 7) && (
            <Link href="/calendario" className="rounded-lg px-2.5 py-1 text-sm font-semibold text-violet-700 hover:bg-violet-50">
              Hoy
            </Link>
          )}
          <div className="ml-auto flex flex-wrap gap-1.5">
            {kinds.map((k) => (
              <Link
                key={k}
                href={toggleHref(k)}
                className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-black/5", hidden.has(k) ? "bg-white text-slate-400 line-through" : CAL_INFO[k].cls)}
                aria-pressed={!hidden.has(k)}
              >
                {CAL_INFO[k].label}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {WEEK.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d) => {
            const list = byDate.get(d.date) ?? [];
            const isToday = d.date === today;
            return (
              <div key={d.date} className={cn("min-h-16 min-w-0 border-b border-r border-slate-100 p-1 sm:min-h-28 sm:p-1.5", !d.inMonth && "bg-slate-50/70")}>
                <div
                  className={cn(
                    "mb-1 grid size-6 place-items-center rounded-full text-xs font-semibold",
                    isToday ? "bg-turquoise-700 text-white" : d.inMonth ? "text-slate-700" : "text-slate-300",
                  )}
                >
                  {Number(d.date.slice(8))}
                </div>
                {/* Celular: puntos */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {list.slice(0, 6).map((it, i) => (
                    <span key={i} className={cn("size-1.5 rounded-full", it.kind === "due" ? "bg-coral" : it.kind === "attendance" ? "bg-turquoise" : it.kind === "event" ? "bg-sun" : "bg-violet-300")} />
                  ))}
                </div>
                {/* Escritorio: detalle */}
                <div className="hidden space-y-0.5 sm:block">
                  {list.slice(0, 4).map((it, i) => (
                    <Chip key={i} it={it} />
                  ))}
                  {list.length > 4 && <div className="px-1 text-[11px] text-slate-500">+{list.length - 4} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-2xl">
        <div className="flex items-center gap-2 px-5 pb-2 pt-5">
          <CalendarDays className="size-5 text-violet-600" />
          <h2 className="text-lg font-extrabold text-violet-950">Fechas de {monthLabel(month).split(" ")[0].toLowerCase()}</h2>
        </div>
        {monthItems.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-slate-500">No hay entregas ni eventos este mes.</p>
        ) : (
          <ul className="divide-y divide-slate-100 px-2 pb-3">
            {monthItems.map((it, i) => {
              const date = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
                .format(new Date(it.date + "T12:00:00Z"))
                .replace(" de ", " ")
                .replace(",", "");
              const row = (
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-violet-50/50">
                  <div className={cn("w-24 shrink-0 whitespace-nowrap text-sm font-semibold", it.date < today ? "text-slate-400" : "text-slate-700")}>
                    {date}
                    {it.time && <div className="text-xs font-normal text-slate-500">{it.time}</div>}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", CAL_INFO[it.kind].cls)}>{CAL_INFO[it.kind].label}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{it.title}</div>
                    {it.subtitle && <div className="truncate text-xs text-slate-500">{it.subtitle}</div>}
                  </div>
                  {it.color && <span className="size-2.5 shrink-0 rounded-full" style={{ background: it.color }} aria-hidden />}
                </div>
              );
              return <li key={i}>{it.href ? <Link href={it.href}>{row}</Link> : row}</li>;
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
