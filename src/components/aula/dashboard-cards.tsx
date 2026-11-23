import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CAL_INFO, type CalItem } from "@/lib/aula/calendar";
import type { AttCounts } from "@/lib/aula/attendance";
import { cn } from "@/lib/utils";

/** Gráfica de dona con el porcentaje de asistencia. */
export function AttendanceDonut({ counts, title, href }: { counts: AttCounts; title: string; href: string }) {
  const parts = [
    { key: "Presentes", value: counts.present + counts.excused, color: "#00a891" },
    { key: "Retardos", value: counts.late, color: "#ffc93c" },
    { key: "Faltas", value: counts.absent, color: "#ff6b8a" },
  ];
  const total = parts.reduce((s, p) => s + p.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Card className="rounded-2xl p-5">
      <h2 className="text-lg font-extrabold text-violet-950">{title}</h2>
      {total === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aún no hay pases de lista.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-5">
          <svg viewBox="0 0 100 100" className="size-32 shrink-0 -rotate-90" role="img" aria-label={`Asistencia ${counts.rate ?? 0}%`}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
            {parts.map((p) => {
              const len = (p.value / total) * c;
              const el = <circle key={p.key} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
              offset += len;
              return el;
            })}
            <text x="50" y="50" transform="rotate(90 50 50)" textAnchor="middle" dominantBaseline="central" className="fill-violet-950 text-[20px] font-black">
              {counts.rate == null ? "—" : `${Math.round(counts.rate)}%`}
            </text>
          </svg>
          <ul className="space-y-1.5 text-sm">
            {parts.map((p) => (
              <li key={p.key} className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: p.color }} />
                <span className="text-slate-600">{p.key}:</span>
                <strong className="text-slate-900">{p.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">
        Ver detalle <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}

/** Lista de próximas fechas (entregas, pases de lista, eventos…). */
export function UpcomingDates({ items, today }: { items: CalItem[]; today: string }) {
  const list = items.filter((i) => i.kind !== "class" && i.kind !== "attendance" && i.date >= today).sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))).slice(0, 6);
  return (
    <Card className="rounded-2xl">
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <h2 className="text-lg font-extrabold text-violet-950">Próximas fechas</h2>
        <Link href="/calendario" className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">
          Ver calendario <ArrowRight className="size-4" />
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-slate-500">Nada en las próximas dos semanas.</p>
      ) : (
        <ul className="divide-y divide-slate-100 px-2 pb-3">
          {list.map((it, i) => {
            const date = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(it.date + "T12:00:00Z"));
            const row = (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-violet-50/50">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", CAL_INFO[it.kind].cls)}>
                  <CalendarDays className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">
                    {it.date === today ? "Hoy" : date}
                    {it.time ? `, ${it.time}` : ""}
                  </div>
                  <div className="truncate text-sm text-slate-600">
                    {CAL_INFO[it.kind].label}: {it.title}
                  </div>
                </div>
              </div>
            );
            return <li key={i}>{it.href ? <Link href={it.href}>{row}</Link> : row}</li>;
          })}
        </ul>
      )}
    </Card>
  );
}
