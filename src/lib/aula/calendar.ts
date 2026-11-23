import { isVisible, type Activity } from "./activities";
import { APP_TZ, localDate } from "./attendance";
import { DAYS, type ScheduleSlot } from "./types";

export type CalKind = "due" | "publish" | "class" | "attendance" | "event";

export interface CalItem {
  date: string; // YYYY-MM-DD (hora de Sonora)
  time?: string; // HH:MM
  endTime?: string;
  title: string;
  subtitle?: string;
  kind: CalKind;
  href?: string;
  color?: string;
  /** Para .ics: instante exacto (ISO) si aplica. */
  at?: string;
}

export const CAL_INFO: Record<CalKind, { label: string; cls: string }> = {
  due: { label: "Entrega", cls: "bg-[#fff1f4] text-[#b4234a]" },
  publish: { label: "Publicación", cls: "bg-sky-100 text-sky-800" },
  class: { label: "Clase", cls: "bg-violet-50 text-violet-800" },
  attendance: { label: "Pase de lista", cls: "bg-turquoise-50 text-turquoise-700" },
  event: { label: "Evento", cls: "bg-[#fff8e6] text-[#8a5a00]" },
};

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: APP_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

/** Días del mes (YYYY-MM) en una cuadrícula que empieza en lunes. */
export function monthGrid(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const start = new Date(Date.UTC(y, m - 1, 1 - offset));
  const days: { date: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    days.push({ date: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === m - 1 });
  }
  // Quitar la última semana si quedó entera fuera del mes
  while (days.length > 35 && days.slice(-7).every((d) => !d.inMonth)) days.splice(-7);
  return days;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  const s = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Días de clase según el horario del grupo, dentro de un rango [from, to]. */
export function scheduleItems(
  cls: { id: string; name: string; color: string; schedule: ScheduleSlot[]; archived_at?: string | null },
  from: string,
  to: string,
  href?: string,
): CalItem[] {
  if (cls.archived_at || !cls.schedule?.length) return [];
  const keys = DAYS.map((d) => d.key) as string[];
  const out: CalItem[] = [];
  for (let t = Date.parse(from + "T12:00:00Z"); t <= Date.parse(to + "T12:00:00Z"); t += 86400000) {
    const d = new Date(t);
    const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
    for (const s of cls.schedule) {
      if (keys.indexOf(s.day) !== dow) continue;
      out.push({ date: d.toISOString().slice(0, 10), time: s.start || undefined, endTime: s.end || undefined, title: cls.name, kind: "class", color: cls.color, href });
    }
  }
  return out;
}

export function activityItems(
  activities: Activity[],
  classes: Map<string, { name: string; color: string }>,
  role: "teacher" | "student",
  now: number,
): CalItem[] {
  const out: CalItem[] = [];
  for (const a of activities) {
    const c = classes.get(a.class_id);
    if (!c) continue;
    if (role === "student" && (a.status === "draft" || !isVisible(a, now))) continue;
    const href = role === "teacher" ? `/aula/${a.class_id}/actividades/${a.id}` : `/actividades/${a.id}`;
    if (a.due_at && a.status !== "draft")
      out.push({ date: localDate(a.due_at), time: hhmm(a.due_at), title: a.title, subtitle: c.name, kind: "due", href, color: c.color, at: a.due_at });
    if (role === "teacher" && a.publish_at && a.status === "published" && Date.parse(a.publish_at) > now)
      out.push({ date: localDate(a.publish_at), time: hhmm(a.publish_at), title: a.title, subtitle: `Se publica · ${c.name}`, kind: "publish", href, color: c.color, at: a.publish_at });
  }
  return out;
}

export function groupByDate(items: CalItem[]) {
  const map = new Map<string, CalItem[]>();
  for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it]);
  for (const list of map.values()) list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "") || a.kind.localeCompare(b.kind));
  return map;
}

/** Archivo .ics (iCalendar) con entregas y eventos. */
export function toIcs(items: CalItem[], calName: string, origin: string) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EvaluaQR//Aula//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(calName)}`];
  items.forEach((it, i) => {
    lines.push("BEGIN:VEVENT", `UID:${it.kind}-${i}-${it.date}@evaluaqr`, `DTSTAMP:${stamp}`);
    if (it.at) {
      const t = new Date(it.at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      lines.push(`DTSTART:${t}`, `DTEND:${t}`);
    } else {
      const d = it.date.replace(/-/g, "");
      const next = new Date(Date.parse(it.date + "T12:00:00Z") + 86400000).toISOString().slice(0, 10).replace(/-/g, "");
      lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`);
    }
    const prefix = it.kind === "due" ? "Entrega: " : it.kind === "event" ? "Evento: " : "";
    lines.push(`SUMMARY:${esc(prefix + it.title)}`);
    if (it.subtitle) lines.push(`DESCRIPTION:${esc(it.subtitle)}`);
    if (it.href) lines.push(`URL:${origin}${it.href}`);
    if (it.kind === "due") lines.push("BEGIN:VALARM", "TRIGGER:-PT24H", "ACTION:DISPLAY", "DESCRIPTION:Vence mañana", "END:VALARM");
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  // Líneas largas se dejan así; los calendarios comunes las aceptan
  return lines.join("\r\n");
}
