/** Zona horaria de la escuela (Sonora, sin horario de verano). */
export const APP_TZ = "America/Hermosillo";

export type AttStatus = "present" | "late" | "absent" | "excused" | "review";
export type ExcuseStatus = "pending" | "approved" | "rejected" | "needs_info";

export const ATT_STATUSES: AttStatus[] = ["present", "late", "absent", "excused", "review"];

export const ATT_INFO: Record<AttStatus, { label: string; short: string; cls: string; dot: string }> = {
  present: { label: "Presente", short: "P", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  late: { label: "Retardo", short: "R", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-400" },
  absent: { label: "Falta", short: "F", cls: "bg-red-100 text-red-800", dot: "bg-red-500" },
  excused: { label: "Falta justificada", short: "J", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  review: { label: "Pendiente de revisión", short: "?", cls: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
};

export const EXCUSE_INFO: Record<ExcuseStatus, { label: string; cls: string }> = {
  pending: { label: "En revisión", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Aprobado", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rechazado", cls: "bg-red-100 text-red-800" },
  needs_info: { label: "Requiere más información", cls: "bg-violet-100 text-violet-800" },
};

export const METHOD_LABEL: Record<string, string> = {
  qr: "QR",
  code: "Código",
  manual: "Manual",
  auto: "Al cerrar",
  excuse: "Justificante",
};

export interface AttSession {
  id: string;
  class_id: string;
  topic: string | null;
  starts_at: string;
  late_after_min: number;
  qr_minutes: number;
  expires_at: string;
  status: "open" | "closed";
  closed_at: string | null;
}

export interface AttRecord {
  id: string;
  session_id: string;
  class_id: string;
  student_id: string;
  status: AttStatus;
  method: string;
  checked_at: string | null;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
  location_ok: boolean | null;
  note: string | null;
  updated_at: string;
}

export interface Excuse {
  id: string;
  class_id: string;
  student_id: string;
  user_id: string;
  date_from: string;
  date_to: string;
  reason: string;
  file_path: string | null;
  file_name: string | null;
  status: ExcuseStatus;
  teacher_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  review: number;
  total: number;
  /** % de asistencia: (presentes + retardos + justificadas) / registros decididos. null si no hay datos. */
  rate: number | null;
}

export function countStatuses(statuses: AttStatus[]): AttCounts {
  const c: AttCounts = { present: 0, late: 0, absent: 0, excused: 0, review: 0, total: statuses.length, rate: null };
  for (const s of statuses) c[s]++;
  const decided = c.total - c.review;
  c.rate = decided > 0 ? Math.round(((c.present + c.late + c.excused) / decided) * 1000) / 10 : null;
  return c;
}

export function formatRate(rate: number | null) {
  return rate == null ? "—" : `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`;
}

/** "lun 18 nov · 08:05" en hora de Sonora. */
export function sessionLabel(iso: string) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
  const time = new Intl.DateTimeFormat("es-MX", { timeZone: APP_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  const label = `${day} · ${time}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function timeLabel(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-MX", { timeZone: APP_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** Fecha local (YYYY-MM-DD) en la zona de la escuela. */
export function localDate(iso: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(typeof iso === "string" ? new Date(iso) : iso);
}

export function dateRangeLabel(from: string, to: string) {
  const f = (s: string) =>
    new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(s + "T12:00:00Z"));
  return from === to ? f(from) : `${f(from)} – ${f(to)}`;
}
