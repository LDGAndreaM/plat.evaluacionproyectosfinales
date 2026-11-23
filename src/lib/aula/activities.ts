import type { ToolKind } from "@/lib/tools/types";
import { dueLabel } from "./attendance";

export type ActivityKind = "task" | "interactive" | "research";
export type ActivityStatus = "draft" | "published" | "closed";
export type SubmissionStatus = "submitted" | "returned" | "graded";
/** Estado de un estudiante en una actividad (tabla de seguimiento). */
export type TrackStatus = "pending" | "missing" | "submitted" | "late" | "returned" | "graded";

export interface RubricCriterion {
  id: string;
  criterion: string;
  description?: string;
  points: number;
}

export interface Resource {
  type: "file" | "link";
  name: string;
  path?: string;
  url?: string;
}

export interface SubmissionFile {
  path: string;
  name: string;
  size?: number;
  type?: string;
}

export interface Activity {
  id: string;
  class_id: string;
  title: string;
  instructions: string | null;
  kind: ActivityKind;
  tool_id: string | null;
  mode: "individual" | "team";
  status: ActivityStatus;
  publish_at: string | null;
  due_at: string | null;
  allow_late: boolean;
  late_penalty_pct: number;
  max_attempts: number;
  max_score: number;
  rubric: RubricCriterion[];
  accept_text: boolean;
  accept_files: boolean;
  accept_link: boolean;
  resources: Resource[];
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  activity_id: string;
  class_id: string;
  student_id: string;
  team_id: string | null;
  attempt: number;
  body: string | null;
  link: string | null;
  files: SubmissionFile[];
  answers: Record<string, unknown> | null;
  submitted_at: string;
  is_late: boolean;
  status: SubmissionStatus;
  score: number | null;
  rubric_scores: Record<string, number> | null;
  feedback: string | null;
  graded_at: string | null;
}

export interface Team {
  id: string;
  activity_id: string;
  name: string;
  members: string[]; // class_students.id
}

export const KIND_INFO: Record<ActivityKind, { label: string; hint: string; cls: string }> = {
  task: { label: "Tarea", hint: "Entrega de texto, archivos o enlace.", cls: "bg-violet-100 text-violet-800" },
  research: { label: "Investigación", hint: "Investigación con fuentes; ideal con rúbrica.", cls: "bg-[#fff1f4] text-[#c2365a]" },
  interactive: { label: "Interactiva", hint: "Asigna una de tus herramientas: ficha, trivia, sopa de letras…", cls: "bg-turquoise-50 text-turquoise-700" },
};

export const TRACK_INFO: Record<TrackStatus, { label: string; short: string; cls: string }> = {
  pending: { label: "Pendiente", short: "Pend.", cls: "bg-slate-100 text-slate-600" },
  missing: { label: "No entregado", short: "No ent.", cls: "bg-red-100 text-red-800" },
  submitted: { label: "Entregado", short: "Entr.", cls: "bg-sky-100 text-sky-800" },
  late: { label: "Entregado tarde", short: "Tarde", cls: "bg-amber-100 text-amber-800" },
  returned: { label: "Devuelto para corregir", short: "Devuelto", cls: "bg-violet-100 text-violet-800" },
  graded: { label: "Calificado", short: "Calif.", cls: "bg-emerald-100 text-emerald-800" },
};

/** Herramientas que se pueden asignar y si se califican solas. */
export const AUTO_GRADED: ToolKind[] = ["worksheet"];

export function isVisible(a: Pick<Activity, "status" | "publish_at">, now: number) {
  return a.status !== "draft" && (!a.publish_at || Date.parse(a.publish_at) <= now);
}

export function isPastDue(a: Pick<Activity, "due_at">, now: number) {
  return !!a.due_at && Date.parse(a.due_at) < now;
}

/** Puntos máximos de la rúbrica. */
export function rubricMax(rubric: RubricCriterion[]) {
  return round2(rubric.reduce((s, c) => s + (Number(c.points) || 0), 0));
}

/** Suma de puntos de rúbrica, limitando cada criterio a su máximo. */
export function rubricTotal(rubric: RubricCriterion[], scores: Record<string, number> | null | undefined) {
  if (!scores) return 0;
  return round2(rubric.reduce((s, c) => s + Math.min(Math.max(0, Number(scores[c.id]) || 0), Number(c.points) || 0), 0));
}

/** Convierte los puntos de la rúbrica a la escala de la actividad. */
export function rubricToScore(rubric: RubricCriterion[], scores: Record<string, number> | null | undefined, maxScore: number) {
  const max = rubricMax(rubric);
  if (!max) return 0;
  return round2((rubricTotal(rubric, scores) / max) * maxScore);
}

/** Calificación final aplicando el descuento por entrega tardía. */
export function finalScore(sub: Pick<Submission, "score" | "is_late">, a: Pick<Activity, "late_penalty_pct">) {
  if (sub.score == null) return null;
  const pct = sub.is_late ? Math.min(100, Math.max(0, a.late_penalty_pct)) : 0;
  return round2(Number(sub.score) * (1 - pct / 100));
}

/** Escala un puntaje (obtenido/máximo) a la calificación máxima de la actividad. */
export function scaleScore(earned: number, max: number, maxScore: number) {
  if (!max) return 0;
  return round2((Math.max(0, earned) / max) * maxScore);
}

/** Última entrega de cada "dueño" (estudiante o equipo). */
export function latestByOwner(subs: Submission[], mode: Activity["mode"]) {
  const map = new Map<string, Submission>();
  for (const s of subs) {
    const key = mode === "team" ? (s.team_id ?? `s:${s.student_id}`) : s.student_id;
    const prev = map.get(key);
    if (!prev || Date.parse(s.submitted_at) > Date.parse(prev.submitted_at)) map.set(key, s);
  }
  return map;
}

export function trackStatus(latest: Submission | undefined, a: Pick<Activity, "due_at">, now: number): TrackStatus {
  if (!latest) return isPastDue(a, now) ? "missing" : "pending";
  if (latest.status === "graded") return "graded";
  if (latest.status === "returned") return "returned";
  return latest.is_late ? "late" : "submitted";
}

/** Estado de un estudiante concreto, considerando su equipo si la actividad es en equipo. */
export function studentTrack(
  studentId: string,
  a: Pick<Activity, "mode" | "due_at">,
  latest: Map<string, Submission>,
  teamOf: Map<string, string>,
  now: number,
) {
  const key = a.mode === "team" ? teamOf.get(studentId) : studentId;
  const sub = key ? latest.get(key) : undefined;
  return { status: trackStatus(sub, a, now), submission: sub };
}

/** Intentos restantes (null = ilimitados). */
export function attemptsLeft(a: Pick<Activity, "max_attempts">, used: number, lastStatus?: SubmissionStatus) {
  if (a.max_attempts === 0) return null;
  if (lastStatus === "returned") return Math.max(1, a.max_attempts - used);
  return Math.max(0, a.max_attempts - used);
}

/** Reparte estudiantes al azar en equipos de un tamaño dado (los sobrantes se reparten). */
export function randomTeams<T>(items: T[], size: number, rand: () => number = Math.random): T[][] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const s = Math.max(1, Math.floor(size));
  const count = Math.max(1, Math.floor(arr.length / s));
  const teams: T[][] = Array.from({ length: count }, () => []);
  arr.forEach((x, i) => teams[i % count].push(x));
  return teams.filter((t) => t.length);
}

export function formatScore(n: number | null | undefined) {
  if (n == null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Aviso de vencimiento para el estudiante (rojo < 24 h, ámbar < 72 h). */
export function dueBadge(a: Activity, status: TrackStatus, now: number) {
  if (!a.due_at || !["pending", "returned"].includes(status)) return null;
  const ms = Date.parse(a.due_at) - now;
  const h = ms / 3600000;
  if (h < 0) return null;
  if (h < 24) return { text: `Vence hoy, ${dueLabel(a.due_at).split(", ").pop()}`, cls: "bg-red-100 text-red-800" };
  if (h < 72) return { text: `Vence ${dueLabel(a.due_at)}`, cls: "bg-amber-100 text-amber-800" };
  return { text: `Vence ${dueLabel(a.due_at)}`, cls: "bg-slate-100 text-slate-700" };
}
