"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { fromLocalInput } from "@/lib/aula/attendance";
import { randomTeams, rubricMax, rubricToScore, scaleScore, type RubricCriterion, type Resource } from "@/lib/aula/activities";
import { gradeWorksheet } from "@/lib/worksheet/grading";
import type { WorksheetData, WsAnswers } from "@/lib/worksheet/types";
import type { ActionResult } from "@/lib/types";

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  try {
    return JSON.parse(String(raw ?? "")) as T;
  } catch {
    return fallback;
  }
}

function cleanRubric(list: RubricCriterion[]): RubricCriterion[] {
  return (Array.isArray(list) ? list : [])
    .map((c) => ({
      id: String(c.id || crypto.randomUUID()).slice(0, 40),
      criterion: String(c.criterion ?? "").trim().slice(0, 200),
      description: String(c.description ?? "").trim().slice(0, 1000) || undefined,
      points: Math.max(0, Math.min(1000, Number(c.points) || 0)),
    }))
    .filter((c) => c.criterion)
    .slice(0, 30);
}

function cleanResources(list: Resource[], classId: string): Resource[] {
  return (Array.isArray(list) ? list : [])
    .map((r) =>
      r.type === "link"
        ? { type: "link" as const, name: String(r.name ?? "").trim().slice(0, 200) || String(r.url), url: String(r.url ?? "").trim().slice(0, 1000) }
        : { type: "file" as const, name: String(r.name ?? "").slice(0, 200), path: String(r.path ?? "") },
    )
    .filter((r) => (r.type === "link" ? /^https?:\/\//i.test(r.url ?? "") : (r.path ?? "").startsWith(`${classId}/`)))
    .slice(0, 20);
}

export async function saveActivity(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const id = String(fd.get("id") ?? "");
  const classId = String(fd.get("class_id") ?? "");
  const title = String(fd.get("title") ?? "").trim().slice(0, 200);
  if (!title) return { ok: false, error: "Escribe el título de la actividad." };
  const kind = String(fd.get("kind"));
  if (!["task", "interactive", "research"].includes(kind)) return { ok: false, error: "Elige el tipo de actividad." };
  const toolId = kind === "interactive" ? String(fd.get("tool_id") ?? "") || null : null;
  if (kind === "interactive" && !toolId) return { ok: false, error: "Elige la herramienta que harán tus estudiantes." };

  const publish = String(fd.get("publish") ?? "draft");
  const publishAt = publish === "schedule" ? fromLocalInput(String(fd.get("publish_at") ?? "")) : null;
  if (publish === "schedule" && !publishAt) return { ok: false, error: "Elige la fecha y hora de publicación." };
  const dueAt = fromLocalInput(String(fd.get("due_at") ?? ""));
  if (publishAt && dueAt && dueAt < publishAt) return { ok: false, error: "La fecha límite debe ser después de la publicación." };

  const rubric = cleanRubric(parseJson<RubricCriterion[]>(fd.get("rubric"), []));
  const maxScore = Number(fd.get("max_score"));
  if (!(maxScore > 0 && maxScore <= 1000)) return { ok: false, error: "La calificación máxima debe estar entre 0.1 y 1000." };
  const attempts = Math.round(Number(fd.get("max_attempts")));
  if (!(attempts >= 0 && attempts <= 20)) return { ok: false, error: "Los intentos deben estar entre 0 (ilimitados) y 20." };
  const penalty = Math.round(Number(fd.get("late_penalty_pct") || 0));
  if (!(penalty >= 0 && penalty <= 100)) return { ok: false, error: "El descuento por retraso debe estar entre 0 y 100 %." };

  const accept_text = fd.get("accept_text") === "on";
  const accept_files = fd.get("accept_files") === "on";
  const accept_link = fd.get("accept_link") === "on";
  if (kind !== "interactive" && !accept_text && !accept_files && !accept_link)
    return { ok: false, error: "Elige al menos una forma de entrega (texto, archivos o enlace)." };

  const row = {
    class_id: classId,
    title,
    instructions: String(fd.get("instructions") ?? "").slice(0, 10000) || null,
    kind,
    tool_id: toolId,
    mode: fd.get("mode") === "team" ? "team" : "individual",
    status: publish === "draft" ? "draft" : "published",
    publish_at: publishAt,
    due_at: dueAt,
    allow_late: fd.get("allow_late") === "on",
    late_penalty_pct: penalty,
    max_attempts: attempts,
    max_score: maxScore,
    rubric,
    accept_text,
    accept_files,
    accept_link,
    resources: cleanResources(parseJson<Resource[]>(fd.get("resources"), []), classId),
  };

  let activityId = id;
  if (id) {
    const { error } = await supabase.from("activities").update(row).eq("id", id);
    if (error) return { ok: false, error: "No se pudo guardar la actividad." };
  } else {
    const newId = String(fd.get("new_id") ?? "");
    const withId = /^[0-9a-f-]{36}$/i.test(newId) ? { id: newId, ...row } : row;
    const { data, error } = await supabase.from("activities").insert(withId).select("id").single();
    if (error) return { ok: false, error: "No se pudo crear la actividad." };
    activityId = data.id;
  }
  revalidatePath(`/aula/${classId}`, "layout");
  redirect(`/aula/${classId}/actividades/${activityId}`);
}

export async function setActivityStatus(classId: string, id: string, status: "draft" | "published" | "closed") {
  const { supabase } = await requireTeacher();
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.publish_at = null;
  await supabase.from("activities").update(patch).eq("id", id);
  revalidatePath(`/aula/${classId}`, "layout");
}

export async function deleteActivity(classId: string, id: string) {
  const { supabase } = await requireTeacher();
  const { data } = await supabase.from("activities").select("resources").eq("id", id).maybeSingle();
  await supabase.from("activities").delete().eq("id", id);
  const paths = ((data?.resources ?? []) as Resource[]).filter((r) => r.type === "file" && r.path).map((r) => r.path!);
  if (paths.length) await supabase.storage.from("activity-files").remove(paths);
  revalidatePath(`/aula/${classId}`, "layout");
  redirect(`/aula/${classId}/actividades`);
}

export async function duplicateActivity(classId: string, id: string) {
  const { supabase } = await requireTeacher();
  const { data: a } = await supabase.from("activities").select("*").eq("id", id).maybeSingle();
  if (!a) return;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _i, created_at: _c, updated_at: _u, ...rest } = a;
  const { data } = await supabase
    .from("activities")
    .insert({ ...rest, title: `${a.title} (copia)`.slice(0, 200), status: "draft", publish_at: null })
    .select("id")
    .single();
  revalidatePath(`/aula/${classId}`, "layout");
  if (data) redirect(`/aula/${classId}/actividades/${data.id}/editar`);
}

/* ---------------- Equipos ---------------- */

export async function generateTeams(classId: string, activityId: string, size: number) {
  const { supabase } = await requireTeacher();
  const { data: students } = await supabase.from("class_students").select("id").eq("class_id", classId).eq("status", "active");
  const ids = (students ?? []).map((s) => s.id);
  if (!ids.length) return { ok: false, error: "No hay estudiantes activos." };
  await supabase.from("activity_teams").delete().eq("activity_id", activityId);
  const groups = randomTeams(ids, Math.max(1, Math.min(20, size)));
  for (let i = 0; i < groups.length; i++) {
    const { data: t, error } = await supabase
      .from("activity_teams")
      .insert({ activity_id: activityId, class_id: classId, name: `Equipo ${i + 1}` })
      .select("id")
      .single();
    if (error || !t) return { ok: false, error: "No se pudieron crear los equipos." };
    await supabase.from("activity_team_members").insert(groups[i].map((sid) => ({ team_id: t.id, activity_id: activityId, student_id: sid })));
  }
  revalidatePath(`/aula/${classId}`, "layout");
  return { ok: true };
}

export async function addTeam(classId: string, activityId: string) {
  const { supabase } = await requireTeacher();
  const { count } = await supabase.from("activity_teams").select("id", { count: "exact", head: true }).eq("activity_id", activityId);
  await supabase.from("activity_teams").insert({ activity_id: activityId, class_id: classId, name: `Equipo ${(count ?? 0) + 1}` });
  revalidatePath(`/aula/${classId}`, "layout");
}

export async function renameTeam(classId: string, teamId: string, name: string) {
  const { supabase } = await requireTeacher();
  const n = name.trim().slice(0, 80);
  if (n) await supabase.from("activity_teams").update({ name: n }).eq("id", teamId);
  revalidatePath(`/aula/${classId}`, "layout");
}

export async function deleteTeam(classId: string, teamId: string) {
  const { supabase } = await requireTeacher();
  await supabase.from("activity_teams").delete().eq("id", teamId);
  revalidatePath(`/aula/${classId}`, "layout");
}

/** Mueve a un estudiante a otro equipo (o lo saca si teamId es null). */
export async function moveToTeam(classId: string, activityId: string, studentId: string, teamId: string | null) {
  const { supabase } = await requireTeacher();
  await supabase.from("activity_team_members").delete().eq("activity_id", activityId).eq("student_id", studentId);
  if (teamId) await supabase.from("activity_team_members").insert({ team_id: teamId, activity_id: activityId, student_id: studentId });
  revalidatePath(`/aula/${classId}`, "layout");
}

/* ---------------- Calificar ---------------- */

export async function gradeSubmission(
  classId: string,
  submissionId: string,
  input: { score: number | null; rubricScores: Record<string, number> | null; feedback: string; status: "graded" | "returned" },
) {
  const { supabase, userId } = await requireTeacher();
  const { data: sub } = await supabase.from("activity_submissions").select("activity_id").eq("id", submissionId).maybeSingle();
  if (!sub) return { ok: false, error: "No se encontró la entrega." };
  const { data: a } = await supabase.from("activities").select("max_score, rubric").eq("id", sub.activity_id).maybeSingle();
  if (!a) return { ok: false, error: "No se encontró la actividad." };
  const rubric = (a.rubric ?? []) as RubricCriterion[];
  let score = input.score;
  if (input.rubricScores && rubricMax(rubric) > 0) score = rubricToScore(rubric, input.rubricScores, Number(a.max_score));
  if (input.status === "graded") {
    if (score == null || !Number.isFinite(score)) return { ok: false, error: "Escribe la calificación." };
    if (score < 0 || score > Number(a.max_score)) return { ok: false, error: `La calificación debe estar entre 0 y ${a.max_score}.` };
  }
  if (input.status === "returned" && !input.feedback.trim()) return { ok: false, error: "Escribe qué debe corregir el estudiante." };
  const { error } = await supabase
    .from("activity_submissions")
    .update({
      status: input.status,
      score: input.status === "graded" ? score : null,
      rubric_scores: input.rubricScores,
      feedback: input.feedback.trim().slice(0, 5000) || null,
      graded_at: new Date().toISOString(),
      graded_by: userId,
    })
    .eq("id", submissionId);
  revalidatePath(`/aula/${classId}`, "layout");
  return error ? { ok: false, error: "No se pudo guardar la calificación." } : { ok: true };
}

/** Calificación automática de una ficha (se calcula aquí, en el servidor, a partir de las respuestas). */
export async function worksheetAutoScore(toolData: WorksheetData | null, answers: unknown, maxScore: number) {
  if (!toolData?.elements || !answers) return null;
  const g = gradeWorksheet(toolData.elements, answers as WsAnswers);
  return { earned: g.score, max: g.max, pendingManual: g.pendingManual, score: scaleScore(g.score, g.max, maxScore) };
}

/** Pone la calificación automática a todas las entregas de ficha que aún no están calificadas. */
export async function applyAutoGrades(classId: string, activityId: string) {
  const { supabase, userId } = await requireTeacher();
  const { data: a } = await supabase.from("activities").select("max_score, tool_id").eq("id", activityId).maybeSingle();
  if (!a?.tool_id) return { ok: false, error: "La actividad no tiene ficha." };
  const { data: tool } = await supabase.from("teacher_tools").select("kind, data").eq("id", a.tool_id).maybeSingle();
  if (tool?.kind !== "worksheet") return { ok: false, error: "Solo las fichas se califican solas." };
  const { data: subs } = await supabase.from("activity_submissions").select("id, answers, status").eq("activity_id", activityId).neq("status", "graded");
  let n = 0;
  for (const s of subs ?? []) {
    const auto = await worksheetAutoScore(tool.data as WorksheetData, s.answers, Number(a.max_score));
    if (!auto) continue;
    const { error } = await supabase
      .from("activity_submissions")
      .update({ status: "graded", score: auto.score, graded_at: new Date().toISOString(), graded_by: userId })
      .eq("id", s.id);
    if (!error) n++;
  }
  revalidatePath(`/aula/${classId}`, "layout");
  return { ok: true, graded: n };
}

export async function activityFileUrl(path: string) {
  const { supabase } = await requireTeacher();
  const { data } = await supabase.storage.from("activity-files").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
