"use client";

import {
  CalendarClock,
  Copy,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Shuffle,
  Sparkles,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ResourceList, SubmissionFiles } from "@/components/aula/activity-bits";
import { SubmissionComments } from "@/components/aula/submission-comments";
import { WorksheetPlayer } from "@/components/worksheet/player";
import {
  finalScore,
  formatScore,
  isPastDue,
  isVisible,
  KIND_INFO,
  latestByOwner,
  rubricMax,
  rubricToScore,
  rubricTotal,
  studentTrack,
  TRACK_INFO,
  type Activity,
  type Submission,
  type Team,
} from "@/lib/aula/activities";
import { dueLabel, timeLabel } from "@/lib/aula/attendance";
import { studentName, type ClassStudent } from "@/lib/aula/types";
import { TOOL_INFO, type ToolKind } from "@/lib/tools/types";
import type { WorksheetData, WsAnswers } from "@/lib/worksheet/types";
import { gradeWorksheet } from "@/lib/worksheet/grading";
import { cn, formatDate } from "@/lib/utils";
import {
  activityFileUrl,
  addTeam,
  applyAutoGrades,
  deleteActivity,
  deleteTeam,
  duplicateActivity,
  generateTeams,
  gradeSubmission,
  moveToTeam,
  renameTeam,
  setActivityStatus,
} from "../../../activity-actions";

type Auto = Record<string, { earned: number; max: number; pendingManual: number; score: number }>;

interface Owner {
  key: string;
  label: string;
  sublabel?: string;
  avatarFor?: ClassStudent;
  memberIds: string[];
}

function nowMs() {
  return new Date().getTime();
}

export function ActivityDetail({
  classId,
  activity: a,
  students,
  submissions,
  teams,
  tool,
  auto,
  avatars,
}: {
  classId: string;
  activity: Activity;
  students: ClassStudent[];
  submissions: Submission[];
  teams: Team[];
  tool: { kind: ToolKind; title: string; worksheet: WorksheetData | null } | null;
  auto: Auto;
  avatars: Record<string, string | null>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now] = useState(nowMs);
  const [grading, setGrading] = useState<string | null>(null); // owner key
  const [msg, setMsg] = useState<string | null>(null);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const latest = useMemo(() => latestByOwner(submissions, a.mode), [submissions, a.mode]);
  const teamOf = useMemo(() => new Map(teams.flatMap((t) => t.members.map((m) => [m, t.id] as const))), [teams]);
  const tracks = students.map((s) => studentTrack(s.id, a, latest, teamOf, now));
  const counts = {
    delivered: tracks.filter((t) => ["submitted", "late", "graded"].includes(t.status)).length,
    late: tracks.filter((t) => t.status === "late" || (t.status === "graded" && t.submission?.is_late)).length,
    missing: tracks.filter((t) => t.status === "missing").length,
    graded: tracks.filter((t) => t.status === "graded").length,
  };

  const owners: Owner[] =
    a.mode === "team"
      ? teams.map((t) => ({
          key: t.id,
          label: t.name,
          sublabel: t.members.map((m) => (byId.get(m) ? studentName(byId.get(m)!) : "")).filter(Boolean).join(", ") || "Sin integrantes",
          memberIds: t.members,
        }))
      : students.map((s) => ({ key: s.id, label: `${s.last_name}${s.last_name ? ", " : ""}${s.first_name}`, avatarFor: s, memberIds: [s.id] }));

  const toGrade = [...latest.values()].filter((s) => s.status === "submitted").length;
  const visible = isVisible(a, now);
  const ownerSubs = (key: string) =>
    submissions
      .filter((s) => (a.mode === "team" ? s.team_id === key : s.student_id === key))
      .sort((x, y) => Date.parse(y.submitted_at) - Date.parse(x.submitted_at));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", KIND_INFO[a.kind].cls)}>{KIND_INFO[a.kind].label}</span>
            {a.status === "draft" ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Borrador · no la ven tus estudiantes</span>
            ) : a.status === "closed" ? (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-white">Cerrada · ya no reciben entregas</span>
            ) : !visible ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">Se publica {a.publish_at ? dueLabel(a.publish_at) : ""}</span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Publicada</span>
            )}
            {a.mode === "team" && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Users className="size-3.5" /> En equipos
              </span>
            )}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-violet-950">{a.title}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" /> {a.due_at ? `Entrega: ${dueLabel(a.due_at)}${isPastDue(a, now) ? " (venció)" : ""}` : "Sin fecha límite"}
            </span>
            <span>Máx. {formatScore(Number(a.max_score))} pts</span>
            <span>{a.max_attempts === 0 ? "Intentos ilimitados" : `${a.max_attempts} intento${a.max_attempts === 1 ? "" : "s"}`}</span>
            {a.due_at && <span>{a.allow_late ? (a.late_penalty_pct ? `Tarde: −${a.late_penalty_pct}%` : "Acepta tardías") : "No acepta tardías"}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/aula/${classId}/actividades/${a.id}/editar`} variant="secondary" size="sm">
            <Pencil className="size-4" /> Editar
          </LinkButton>
          {a.status === "draft" && (
            <Button size="sm" disabled={pending} onClick={() => start(() => setActivityStatus(classId, a.id, "published"))}>
              <Eye className="size-4" /> Publicar ahora
            </Button>
          )}
          {a.status === "published" && (
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => confirm("¿Cerrar la actividad? Ya no se recibirán entregas.") && start(() => setActivityStatus(classId, a.id, "closed"))}>
              <Lock className="size-4" /> Cerrar
            </Button>
          )}
          {a.status === "closed" && (
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(() => setActivityStatus(classId, a.id, "published"))}>
              <Unlock className="size-4" /> Reabrir
            </Button>
          )}
          {a.status !== "draft" && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => confirm("¿Regresar a borrador? Tus estudiantes dejarán de verla.") && start(() => setActivityStatus(classId, a.id, "draft"))}>
              <EyeOff className="size-4" /> Ocultar
            </Button>
          )}
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => duplicateActivity(classId, a.id))}>
            <Copy className="size-4" /> Duplicar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            disabled={pending}
            onClick={() => confirm("¿Eliminar la actividad con todas sus entregas? No se puede deshacer.") && start(() => deleteActivity(classId, a.id))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Entregaron", `${counts.delivered} / ${students.length}`, "bg-sky-50 text-sky-900"],
          ["Por calificar", String(toGrade), "bg-[#fff1f4] text-[#b4234a]"],
          ["Calificados", String(counts.graded), "bg-emerald-50 text-emerald-900"],
          ["No entregaron", String(counts.missing), "bg-red-50 text-red-900"],
        ].map(([label, value, cls]) => (
          <div key={label} className={cn("rounded-2xl p-4", cls)}>
            <div className="text-2xl font-extrabold">{value}</div>
            <div className="text-sm">{label}</div>
          </div>
        ))}
      </div>

      {(a.instructions || a.resources.length > 0 || tool) && (
        <Card className="space-y-3 rounded-2xl p-5">
          {a.instructions && <p className="whitespace-pre-line text-slate-700">{a.instructions}</p>}
          {tool && (
            <p className="text-sm text-slate-600">
              Herramienta: <strong>{TOOL_INFO[tool.kind]?.name}</strong> · {tool.title || "Sin título"}
              {tool.kind === "worksheet" ? " · se califica sola" : " · el estudiante la marca como completada"}
            </p>
          )}
          <ResourceList resources={a.resources} getUrl={activityFileUrl} />
          {a.rubric.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-violet-700">Rúbrica ({rubricMax(a.rubric)} pts)</summary>
              <ul className="mt-2 space-y-1">
                {a.rubric.map((c) => (
                  <li key={c.id}>
                    <strong>{c.criterion}</strong> · {c.points} pts{c.description ? <span className="text-slate-500"> — {c.description}</span> : null}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}

      {a.mode === "team" && <TeamsPanel classId={classId} activityId={a.id} teams={teams} students={students} onChange={() => router.refresh()} />}

      <Card className="rounded-2xl">
        <CardHeader
          title="Entregas"
          description="Toca una fila para revisar y calificar."
          actions={
            tool?.kind === "worksheet" && toGrade > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await applyAutoGrades(classId, a.id);
                    setMsg(r.ok ? `Se calificaron ${r.graded} entrega(s) con la calificación automática.` : (r.error ?? "Error"));
                  })
                }
              >
                <Sparkles className="size-4" /> Usar calificación automática
              </Button>
            ) : undefined
          }
        />
        {msg && <p className="mx-5 mt-3 rounded-lg bg-lavender px-3 py-2 text-sm text-violet-900">{msg}</p>}
        {owners.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">{a.mode === "team" ? "Primero forma los equipos." : "No hay estudiantes activos en el grupo."}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {owners.map((o) => {
              const sub = latest.get(o.key);
              const st = a.mode === "team" ? studentTrack(o.memberIds[0] ?? "", a, latest, teamOf, now).status : studentTrack(o.key, a, latest, teamOf, now).status;
              const status = a.mode === "team" && !o.memberIds.length ? (sub ? st : "pending") : st;
              const fs = sub && sub.status === "graded" ? finalScore(sub, a) : null;
              return (
                <li key={o.key}>
                  <button type="button" onClick={() => setGrading(o.key)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-left hover:bg-violet-50/50">
                    {o.avatarFor ? (
                      <Avatar url={o.avatarFor.user_id ? avatars[o.avatarFor.user_id] : null} name={studentName(o.avatarFor)} className="size-9 text-xs" />
                    ) : (
                      <span className="grid size-9 place-items-center rounded-full bg-violet-100 text-violet-700">
                        <Users className="size-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="font-medium text-slate-900">{o.label}</div>
                      <div className="truncate text-xs text-slate-500">
                        {o.sublabel ? `${o.sublabel} · ` : ""}
                        {sub ? `Intento ${sub.attempt} · ${formatDate(sub.submitted_at)} ${timeLabel(sub.submitted_at)}` : "Sin entrega"}
                        {auto[sub?.id ?? ""] ? ` · Automática: ${formatScore(auto[sub!.id].score)}` : ""}
                      </div>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", TRACK_INFO[status].cls)}>{TRACK_INFO[status].label}</span>
                    <span className="w-16 text-right font-bold text-slate-900">{fs != null ? formatScore(fs) : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={!!grading} onClose={() => setGrading(null)} title="Revisar entrega" size="xl">
        {grading && (
          <GradePanel
            key={grading}
            classId={classId}
            activity={a}
            owner={owners.find((o) => o.key === grading)!}
            subs={ownerSubs(grading)}
            byId={byId}
            tool={tool}
            auto={auto}
            onDone={() => {
              setGrading(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function GradePanel({
  classId,
  activity: a,
  owner,
  subs,
  byId,
  tool,
  auto,
  onDone,
}: {
  classId: string;
  activity: Activity;
  owner: Owner;
  subs: Submission[];
  byId: Map<string, ClassStudent>;
  tool: { kind: ToolKind; title: string; worksheet: WorksheetData | null } | null;
  auto: Auto;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const sub = subs[idx];
  const hasRubric = rubricMax(a.rubric) > 0;
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(() => sub?.rubric_scores ?? {});
  const [score, setScore] = useState<string>(() =>
    sub?.score != null ? String(sub.score) : sub && auto[sub.id] ? String(auto[sub.id].score) : "",
  );
  const [feedback, setFeedback] = useState(sub?.feedback ?? "");
  const [showAnswers, setShowAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!sub) {
    return (
      <div className="space-y-2 py-6 text-center text-slate-600">
        <p className="font-semibold text-slate-900">{owner.label}</p>
        <p>Todavía no hay entrega.</p>
      </div>
    );
  }

  const computed = hasRubric ? rubricToScore(a.rubric, rubricScores, Number(a.max_score)) : Number(score);
  const penaltyNote = sub.is_late && a.late_penalty_pct > 0 && Number.isFinite(computed)
    ? `Entregó tarde: calificación final ${formatScore(finalScore({ score: computed, is_late: true }, a))} (−${a.late_penalty_pct}%).`
    : null;
  const grade = tool?.worksheet && sub.answers ? gradeWorksheet(tool.worksheet.elements, sub.answers as WsAnswers) : null;

  function save(status: "graded" | "returned") {
    setError(null);
    start(async () => {
      const res = await gradeSubmission(classId, sub.id, {
        score: hasRubric ? null : score === "" ? null : Number(score),
        rubricScores: hasRubric ? rubricScores : null,
        feedback,
        status,
      });
      if (!res.ok) setError(res.error ?? "Error");
      else onDone();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold text-slate-900">{owner.label}</div>
          {owner.sublabel && <div className="text-sm text-slate-500">{owner.sublabel}</div>}
          <div className="text-sm text-slate-500">
            Entregó {formatDate(sub.submitted_at)} a las {timeLabel(sub.submitted_at)}
            {a.mode === "team" && byId.get(sub.student_id) ? ` · por ${studentName(byId.get(sub.student_id)!)}` : ""}
            {sub.is_late && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Tarde</span>}
          </div>
        </div>
        {subs.length > 1 && (
          <Select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="w-auto" aria-label="Intento">
            {subs.map((s, i) => (
              <option key={s.id} value={i}>
                Intento {s.attempt}
                {i === 0 ? " (último)" : ""}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
        {sub.body && <p className="whitespace-pre-line text-slate-800">{sub.body}</p>}
        {sub.link && (
          <a href={sub.link} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 break-all text-sm font-medium text-violet-700 hover:underline">
            <Link2 className="size-4 shrink-0" /> {sub.link}
          </a>
        )}
        <SubmissionFiles files={sub.files ?? []} getUrl={activityFileUrl} />
        {tool && tool.kind !== "worksheet" && sub.answers && <p className="text-sm text-slate-600">Marcó la actividad como completada.</p>}
        {grade && (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Ficha: <strong>{grade.score} / {grade.max}</strong> puntos → <strong>{formatScore(auto[sub.id]?.score)}</strong> de {formatScore(Number(a.max_score))}
              {grade.pendingManual > 0 && <span className="text-amber-700"> · {grade.pendingManual} pts de respuestas abiertas por revisar</span>}
            </p>
            <Button variant="secondary" size="sm" onClick={() => setShowAnswers((v) => !v)}>
              <Eye className="size-4" /> {showAnswers ? "Ocultar respuestas" : "Ver respuestas"}
            </Button>
            {showAnswers && tool?.worksheet && (
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                <WorksheetPlayer data={tool.worksheet} answers={sub.answers as WsAnswers} grade={grade} readOnly />
              </div>
            )}
          </div>
        )}
      </div>

      <SubmissionComments key={sub.id} submissionId={sub.id} classId={classId} />

      {idx === 0 ? (
        <div className="space-y-4">
          {hasRubric ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-900">Rúbrica</div>
              {a.rubric.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900">{c.criterion}</div>
                    {c.description && <div className="text-xs text-slate-500">{c.description}</div>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={c.points}
                      step="0.5"
                      value={rubricScores[c.id] ?? ""}
                      onChange={(e) => setRubricScores((r) => ({ ...r, [c.id]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                      className="w-20"
                      aria-label={`Puntos en ${c.criterion}`}
                    />
                    <span className="text-sm text-slate-500">/ {c.points}</span>
                  </div>
                </div>
              ))}
              <p className="text-sm text-slate-700">
                Rúbrica: {rubricTotal(a.rubric, rubricScores)} / {rubricMax(a.rubric)} → <strong>{formatScore(computed)}</strong> de {formatScore(Number(a.max_score))}
              </p>
            </div>
          ) : (
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-900">
              Calificación
              <Input type="number" min={0} max={Number(a.max_score)} step="0.1" value={score} onChange={(e) => setScore(e.target.value)} className="w-28" />
              <span className="font-normal text-slate-500">de {formatScore(Number(a.max_score))}</span>
            </label>
          )}
          {penaltyNote && <p className="text-sm text-amber-700">{penaltyNote}</p>}
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={5000} placeholder="Comentarios para el estudiante" aria-label="Comentarios" />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save("graded")} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Guardar calificación
            </Button>
            <Button variant="secondary" onClick={() => save("returned")} disabled={pending}>
              <RotateCcw className="size-4" /> Devolver para corregir
            </Button>
          </div>
          <p className="text-xs text-slate-500">“Devolver para corregir” permite un intento más aunque ya haya usado todos.</p>
        </div>
      ) : (
        <div className="text-sm text-slate-600">
          {sub.status === "graded" && <p>Calificación de este intento: {formatScore(finalScore(sub, a))}</p>}
          {sub.feedback && <p className="whitespace-pre-line">Comentario: {sub.feedback}</p>}
        </div>
      )}
    </div>
  );
}

function TeamsPanel({
  classId,
  activityId,
  teams,
  students,
  onChange,
}: {
  classId: string;
  activityId: string;
  teams: Team[];
  students: ClassStudent[];
  onChange: () => void;
}) {
  const [size, setSize] = useState(4);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const teamOf = new Map(teams.flatMap((t) => t.members.map((m) => [m, t.id] as const)));
  const unassigned = students.filter((s) => !teamOf.has(s.id));
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      onChange();
    });

  return (
    <Card className="rounded-2xl">
      <CardHeader
        title="Equipos"
        description={`${teams.length} equipo${teams.length === 1 ? "" : "s"}${unassigned.length ? ` · ${unassigned.length} sin equipo` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              de
              <Input type="number" min={1} max={20} value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-8 w-16" aria-label="Integrantes por equipo" />
            </label>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => (!teams.length || confirm("Se reemplazarán los equipos actuales. ¿Continuar?")) && run(() => generateTeams(classId, activityId, size))}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Shuffle className="size-4" />} Formar al azar
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => addTeam(classId, activityId))}>
              <Plus className="size-4" /> Equipo
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              {editing === t.id ? (
                <form
                  className="flex flex-1 gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEditing(null);
                    run(() => renameTeam(classId, t.id, name));
                  }}
                >
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-8" autoFocus aria-label="Nombre del equipo" />
                  <Button type="submit" size="sm">
                    OK
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 font-bold text-slate-900">{t.name}</span>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label={`Renombrar ${t.name}`}
                    onClick={() => {
                      setEditing(t.id);
                      setName(t.name);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:text-red-600"
                    aria-label={`Eliminar ${t.name}`}
                    onClick={() => confirm(`¿Eliminar ${t.name}?`) && run(() => deleteTeam(classId, t.id))}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
            <ul className="space-y-1">
              {t.members.map((m) => {
                const s = students.find((x) => x.id === m);
                if (!s) return null;
                return (
                  <li key={m} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{studentName(s)}</span>
                    <Select
                      value={t.id}
                      onChange={(e) => run(() => moveToTeam(classId, activityId, m, e.target.value || null))}
                      className="h-7 w-28 py-0 text-xs"
                      aria-label={`Equipo de ${studentName(s)}`}
                    >
                      {teams.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                      <option value="">Sin equipo</option>
                    </Select>
                  </li>
                );
              })}
              {!t.members.length && <li className="text-xs text-slate-400">Sin integrantes</li>}
            </ul>
          </div>
        ))}
        {unassigned.length > 0 && (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3">
            <div className="mb-2 font-bold text-amber-900">Sin equipo</div>
            <ul className="space-y-1">
              {unassigned.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{studentName(s)}</span>
                  {teams.length > 0 && (
                    <Select
                      value=""
                      onChange={(e) => e.target.value && run(() => moveToTeam(classId, activityId, s.id, e.target.value))}
                      className="h-7 w-28 py-0 text-xs"
                      aria-label={`Asignar equipo a ${studentName(s)}`}
                    >
                      <option value="">Asignar…</option>
                      {teams.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
