"use client";

import { AlertTriangle, CheckCircle2, FileUp, Link2, Loader2, Lock, MessageSquareText, Paperclip, RotateCcw, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/form";
import { ResourceList, SubmissionFiles } from "@/components/aula/activity-bits";
import { WorksheetPlayer } from "@/components/worksheet/player";
import { SharedTool } from "@/app/h/[code]/shared-tool";
import {
  attemptsLeft,
  finalScore,
  formatScore,
  isPastDue,
  rubricMax,
  rubricTotal,
  TRACK_INFO,
  trackStatus,
  type Activity,
  type Submission,
  type SubmissionFile,
} from "@/lib/aula/activities";
import { timeLabel } from "@/lib/aula/attendance";
import { createClient } from "@/lib/supabase/client";
import type { ToolKind, WorksheetData } from "@/lib/tools/types";
import type { WsAnswers } from "@/lib/worksheet/types";
import { cn, formatDate } from "@/lib/utils";
import { fileUrl, submitActivity } from "../actions";

function nowMs() {
  return new Date().getTime();
}

export function StudentActivity({
  activity: a,
  submissions,
  tool,
  auto,
  userId,
  canSubmitTeam,
}: {
  activity: Activity;
  submissions: Submission[];
  tool: { kind: ToolKind; title: string; data: unknown } | null;
  auto: Record<string, number>;
  userId: string;
  canSubmitTeam: boolean;
}) {
  const [now] = useState(nowMs);
  const latest = submissions[0];
  const status = trackStatus(latest, a, now);
  const left = attemptsLeft(a, submissions.length, latest?.status);
  const late = isPastDue(a, now);
  let blocked: string | null = null;
  if (a.status === "closed") blocked = "La actividad está cerrada.";
  else if (late && !a.allow_late) blocked = "La fecha límite ya pasó y no se aceptan entregas tardías.";
  else if (left === 0) blocked = latest?.status === "graded" ? null : "Ya usaste todos tus intentos.";
  else if (!canSubmitTeam) blocked = "Necesitas estar en un equipo para entregar.";
  const canSubmit = !blocked && left !== 0;
  const graded = latest?.status === "graded";

  return (
    <div className="space-y-5">
      {(a.instructions || a.resources.length > 0) && (
        <Card className="space-y-3 rounded-2xl p-5">
          <h2 className="font-bold text-slate-900">Instrucciones</h2>
          {a.instructions && <p className="whitespace-pre-line text-slate-700">{a.instructions}</p>}
          <ResourceList resources={a.resources} getUrl={fileUrl} />
          {a.rubric.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-violet-700">Cómo se evaluará ({rubricMax(a.rubric)} pts)</summary>
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

      {graded && latest && (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <CheckCircle2 className="size-10 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Calificación</div>
              <div className="text-3xl font-black text-emerald-900">
                {formatScore(finalScore(latest, a))} <span className="text-lg font-semibold text-emerald-700">/ {formatScore(Number(a.max_score))}</span>
              </div>
              {latest.is_late && a.late_penalty_pct > 0 && (
                <div className="text-sm text-amber-800">
                  Incluye −{a.late_penalty_pct}% por entrega tardía (sin descuento: {formatScore(Number(latest.score))}).
                </div>
              )}
            </div>
          </div>
          {latest.rubric_scores && a.rubric.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-emerald-950">
              {a.rubric.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 border-b border-emerald-100 py-1">
                  <span>{c.criterion}</span>
                  <span className="font-semibold">
                    {latest.rubric_scores?.[c.id] ?? 0} / {c.points}
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-3 pt-1 font-bold">
                <span>Total rúbrica</span>
                <span>
                  {rubricTotal(a.rubric, latest.rubric_scores)} / {rubricMax(a.rubric)}
                </span>
              </li>
            </ul>
          )}
          {latest.feedback && (
            <p className="mt-3 flex gap-2 rounded-xl bg-white px-4 py-3 text-slate-800">
              <MessageSquareText className="mt-0.5 size-5 shrink-0 text-violet-600" />
              <span className="whitespace-pre-line">{latest.feedback}</span>
            </p>
          )}
        </Card>
      )}

      {latest?.status === "returned" && (
        <Card className="rounded-2xl border-violet-200 bg-violet-50 p-5">
          <div className="flex items-center gap-2 font-bold text-violet-950">
            <RotateCcw className="size-5" /> Tu docente pidió correcciones
          </div>
          {latest.feedback && <p className="mt-2 whitespace-pre-line text-slate-800">{latest.feedback}</p>}
          <p className="mt-2 text-sm text-violet-800">Corrige y vuelve a entregar abajo.</p>
        </Card>
      )}

      {canSubmit ? (
        <Card className="rounded-2xl">
          <CardHeader
            title={submissions.length ? "Entregar de nuevo" : a.kind === "interactive" ? "Resolver la actividad" : "Tu entrega"}
            description={[
              left == null ? "Intentos ilimitados" : `Te queda${left === 1 ? "" : "n"} ${left} intento${left === 1 ? "" : "s"}`,
              late ? "La fecha límite ya pasó: se marcará como entrega tardía" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <div className="p-5">
            {a.kind === "interactive" ? (
              tool ? (
                <InteractiveSubmit activity={a} tool={tool} />
              ) : (
                <p className="text-sm text-slate-500">La herramienta de esta actividad ya no está disponible. Avísale a tu docente.</p>
              )
            ) : (
              <TaskSubmit activity={a} userId={userId} />
            )}
          </div>
        </Card>
      ) : (
        blocked && (
          <p className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            <Lock className="size-4" /> {blocked}
          </p>
        )
      )}

      {submissions.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader title="Mis entregas" description={`Estado: ${TRACK_INFO[status].label}`} />
          <ul className="divide-y divide-slate-100">
            {submissions.map((s) => (
              <li key={s.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-900">Intento {s.attempt}</span>
                  <span className="text-slate-500">
                    {formatDate(s.submitted_at)} · {timeLabel(s.submitted_at)}
                  </span>
                  {s.is_late && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Tarde</span>}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      s.status === "graded" ? TRACK_INFO.graded.cls : s.status === "returned" ? TRACK_INFO.returned.cls : TRACK_INFO.submitted.cls,
                    )}
                  >
                    {s.status === "graded" ? `Calificado: ${formatScore(finalScore(s, a))}` : s.status === "returned" ? "Devuelto" : "En revisión"}
                  </span>
                  {auto[s.id] != null && s.status !== "graded" && (
                    <span className="text-xs text-slate-500">Calificación automática: {formatScore(auto[s.id])}</span>
                  )}
                </div>
                {s.body && <p className="line-clamp-4 whitespace-pre-line text-sm text-slate-700">{s.body}</p>}
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 break-all text-sm text-violet-700 hover:underline">
                    <Link2 className="size-4 shrink-0" /> {s.link}
                  </a>
                )}
                <SubmissionFiles files={s.files ?? []} getUrl={fileUrl} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function TaskSubmit({ activity: a, userId }: { activity: Activity; userId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const added: SubmissionFile[] = [];
    for (const f of Array.from(list).slice(0, 10 - files.length)) {
      if (f.size > 25 * 1024 * 1024) {
        setError(`"${f.name}" pesa más de 25 MB.`);
        continue;
      }
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
      const path = `${a.class_id}/${a.id}/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: up } = await supabase.storage.from("activity-files").upload(path, f, { contentType: f.type || "application/octet-stream" });
      if (up) setError(`No se pudo subir "${f.name}".`);
      else added.push({ path, name: f.name.slice(0, 200), size: f.size, type: f.type });
    }
    setFiles((x) => [...x, ...added]);
    setUploading(false);
  }

  async function send() {
    setError(null);
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) return setError("El enlace debe empezar con https://");
    if (!body.trim() && !link.trim() && !files.length) return setError("Tu entrega está vacía.");
    if (!confirm("¿Enviar tu entrega a tu docente?")) return;
    setSending(true);
    const res = await submitActivity({ activityId: a.id, body, link, files });
    setSending(false);
    if (!res.ok) return setError(res.error ?? "No se pudo entregar.");
    setBody("");
    setLink("");
    setFiles([]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {a.accept_text && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-800">Respuesta</span>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} className="min-h-32" placeholder="Escribe tu respuesta…" />
        </label>
      )}
      {a.accept_link && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-800">Enlace (Drive, Canva, Figma, YouTube…)</span>
          <Input value={link} onChange={(e) => setLink(e.target.value)} maxLength={1000} placeholder="https://" inputMode="url" />
        </label>
      )}
      {a.accept_files && (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-slate-800">Archivos (máx. 10, hasta 25 MB c/u)</span>
          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((f, i) => (
                <li key={f.path} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <Paperclip className="size-4 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-600" aria-label={`Quitar ${f.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length < 10 && (
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-300">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} Adjuntar archivos
              <input type="file" multiple className="sr-only" onChange={(e) => upload(e.target.files)} aria-label="Adjuntar archivos" />
            </label>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      <Button size="lg" className="rounded-xl bg-turquoise-700 hover:bg-[#006b5d]" onClick={send} disabled={sending || uploading}>
        {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />} Entregar
      </Button>
    </div>
  );
}

function InteractiveSubmit({ activity: a, tool }: { activity: Activity; tool: { kind: ToolKind; title: string; data: unknown } }) {
  const router = useRouter();
  const key = `evalqr:act:${a.id}`;
  const [answers, setAnswers] = useState<WsAnswers>({});
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tool.kind !== "worksheet") return;
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
  }, [key, tool.kind]);
  useEffect(() => {
    if (tool.kind !== "worksheet") return;
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch {}
  }, [key, answers, tool.kind]);

  async function send() {
    setError(null);
    const isWs = tool.kind === "worksheet";
    if (isWs && !Object.keys(answers).length) return setError("Aún no contestas nada.");
    if (!confirm(isWs ? "¿Enviar tus respuestas a tu docente?" : "¿Marcar la actividad como completada?")) return;
    setSending(true);
    const res = await submitActivity({ activityId: a.id, body: comment || null, answers: isWs ? answers : { completed: true } });
    setSending(false);
    if (!res.ok) return setError(res.error ?? "No se pudo entregar.");
    try {
      localStorage.removeItem(key);
    } catch {}
    setAnswers({});
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {tool.kind === "worksheet" ? (
        <WorksheetPlayer data={tool.data as WorksheetData} answers={answers} onAnswers={setAnswers} />
      ) : (
        <div className="rounded-2xl border border-slate-200 p-3">
          <SharedTool kind={tool.kind} title={tool.title} data={tool.data} code={a.id} />
        </div>
      )}
      {tool.kind !== "worksheet" && (
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="Comentario para tu docente (opcional)" className="min-h-16" />
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <Button size="lg" className="rounded-xl bg-turquoise-700 hover:bg-[#006b5d]" onClick={send} disabled={sending}>
        {sending ? <Loader2 className="size-5 animate-spin" /> : tool.kind === "worksheet" ? <Send className="size-5" /> : <CheckCircle2 className="size-5" />}
        {tool.kind === "worksheet" ? "Enviar respuestas" : "Marcar como completada"}
      </Button>
      {tool.kind === "worksheet" && <p className="text-xs text-slate-500">Tus respuestas se guardan en este dispositivo hasta que las envíes.</p>}
    </div>
  );
}
