export type Role = "teacher" | "student";

export const DAYS = [
  { key: "lun", label: "Lunes", short: "Lun" },
  { key: "mar", label: "Martes", short: "Mar" },
  { key: "mie", label: "Miércoles", short: "Mié" },
  { key: "jue", label: "Jueves", short: "Jue" },
  { key: "vie", label: "Viernes", short: "Vie" },
  { key: "sab", label: "Sábado", short: "Sáb" },
] as const;
export type DayKey = (typeof DAYS)[number]["key"];

export interface ScheduleSlot {
  day: DayKey;
  start: string; // "08:00"
  end: string; // "10:00"
}

export interface ClassRow {
  id: string;
  owner_id: string;
  name: string;
  subject: string | null;
  period: string | null;
  grade: string | null;
  description: string | null;
  schedule: ScheduleSlot[];
  color: string;
  join_code: string;
  join_enabled: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  student_number: string | null;
  extra_id: string | null;
  section: string | null;
  status: "invited" | "active";
  invited_at: string;
  joined_at: string | null;
}

/** Grupo visto por el estudiante (función my_classes). */
export interface MyClass {
  id: string;
  name: string;
  subject: string | null;
  period: string | null;
  grade: string | null;
  description: string | null;
  schedule: ScheduleSlot[];
  color: string;
  teacher_id: string;
  teacher: string;
  teacher_email: string | null;
  archived: boolean;
  joined_at: string | null;
}

/** Colores sugeridos para los grupos (paleta EvalúaQR). */
export const CLASS_COLORS = ["#6a11cb", "#00a891", "#a855f7", "#e0466a", "#b7791f", "#2563eb", "#0f766e", "#7c3aed"];

export function scheduleSummary(schedule: ScheduleSlot[] | null | undefined): string {
  if (!schedule?.length) return "";
  const byTime = new Map<string, string[]>();
  for (const s of sortSchedule(schedule)) {
    const t = s.start && s.end ? `${s.start}–${s.end}` : s.start || "";
    const k = t;
    const d = DAYS.find((x) => x.key === s.day)?.short ?? s.day;
    byTime.set(k, [...(byTime.get(k) ?? []), d]);
  }
  return [...byTime.entries()].map(([t, days]) => `${days.join(", ")}${t ? ` ${t}` : ""}`).join(" · ");
}

export function sortSchedule(schedule: ScheduleSlot[]): ScheduleSlot[] {
  const order = DAYS.map((d) => d.key) as string[];
  return [...schedule].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.start.localeCompare(b.start));
}

export function studentName(s: Pick<ClassStudent, "first_name" | "last_name">) {
  return `${s.first_name} ${s.last_name}`.trim();
}

/** Ordena como lista de asistencia: por apellidos y luego nombre. */
export function byLastName<T extends Pick<ClassStudent, "first_name" | "last_name">>(a: T, b: T) {
  return a.last_name.localeCompare(b.last_name, "es") || a.first_name.localeCompare(b.first_name, "es");
}
