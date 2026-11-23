import "server-only";
import { requireUser } from "@/lib/auth";
import type { Activity } from "./activities";
import { getMyActivities } from "./activities-data";
import { getMyAttendance } from "./attendance-data";
import { localDate, timeLabel } from "./attendance";
import { activityItems, scheduleItems, type CalItem } from "./calendar";
import { getStudentClasses, getTeacherClasses } from "./data";

/** Fechas del calendario del usuario entre `from` y `to` (YYYY-MM-DD, hora de Sonora). */
export async function getCalendarItems(from: string, to: string): Promise<CalItem[]> {
  const { supabase, role } = await requireUser();
  const now = new Date().getTime();
  const inRange = (d: string) => d >= from && d <= to;
  let items: CalItem[] = [];

  if (role === "teacher") {
    const classes = await getTeacherClasses();
    const ids = classes.map((c) => c.id);
    const byId = new Map(classes.map((c) => [c.id, { name: c.name, color: c.color }]));
    const [{ data: acts }, { data: sessions }, { data: events }] = await Promise.all([
      ids.length ? supabase.from("activities").select("*").in("class_id", ids) : Promise.resolve({ data: [] }),
      ids.length
        ? supabase.from("attendance_sessions").select("id, class_id, starts_at, topic").in("class_id", ids).gte("starts_at", `${from}T00:00:00-07:00`).lte("starts_at", `${to}T23:59:59-07:00`)
        : Promise.resolve({ data: [] }),
      supabase.from("events").select("id, name, event_date").not("event_date", "is", null).gte("event_date", from).lte("event_date", to),
    ]);
    items = [
      ...classes.flatMap((c) => scheduleItems(c, from, to, `/aula/${c.id}`)),
      ...activityItems((acts ?? []) as Activity[], byId, "teacher", now),
      ...(sessions ?? []).map((s) => ({
        date: localDate(s.starts_at),
        time: timeLabel(s.starts_at),
        title: byId.get(s.class_id)?.name ?? "Grupo",
        subtitle: s.topic ?? undefined,
        kind: "attendance" as const,
        href: `/aula/${s.class_id}/asistencia/${s.id}`,
        color: byId.get(s.class_id)?.color,
      })),
      ...(events ?? []).map((e) => ({ date: e.event_date as string, title: e.name as string, kind: "event" as const, href: `/eventos/${e.id}` })),
    ];
  } else {
    const [classes, acts, att] = await Promise.all([getStudentClasses(), getMyActivities(), getMyAttendance()]);
    const active = classes.filter((c) => !c.archived);
    const byId = new Map(active.map((c) => [c.id, { name: c.name, color: c.color }]));
    items = [
      ...active.flatMap((c) => scheduleItems(c, from, to, `/aula/${c.id}`)),
      ...activityItems(acts.activities, byId, "student", now),
      ...att.sessions
        .filter((s) => byId.has(s.class_id))
        .map((s) => ({
          date: localDate(s.starts_at),
          time: timeLabel(s.starts_at),
          title: byId.get(s.class_id)?.name ?? "Grupo",
          kind: "attendance" as const,
          href: "/asistencia",
          color: byId.get(s.class_id)?.color,
        })),
    ];
  }
  return items.filter((i) => inRange(i.date));
}
