"use client";

import { ClipboardList, FileUp, FlaskConical, Link2, Loader2, Paperclip, Plus, Puzzle, Trash2, Users, User } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { KIND_INFO, rubricMax, type Activity, type ActivityKind, type Resource, type RubricCriterion } from "@/lib/aula/activities";
import { toLocalInput } from "@/lib/aula/attendance";
import { createClient } from "@/lib/supabase/client";
import { TOOL_INFO, type ToolKind } from "@/lib/tools/types";
import { cn } from "@/lib/utils";
import { saveActivity } from "../../activity-actions";

const KIND_ICONS: Record<ActivityKind, typeof ClipboardList> = { task: ClipboardList, research: FlaskConical, interactive: Puzzle };

function initialPublish(activity?: Activity): "draft" | "now" | "schedule" {
  if (!activity) return "now";
  if (activity.status === "draft") return "draft";
  return activity.publish_at && Date.parse(activity.publish_at) > new Date().getTime() ? "schedule" : "now";
}

export interface ToolOption {
  id: string;
  kind: ToolKind;
  title: string;
}

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-5 accent-violet-600" />
      <span className="text-sm">
        <span className="font-medium text-slate-900">{label}</span>
        {hint && <span className="block text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function ActivityForm({
  classId,
  activity,
  newId,
  tools,
}: {
  classId: string;
  activity?: Activity;
  newId?: string;
  tools: ToolOption[];
}) {
  const [state, action] = useActionState(saveActivity, null);
  const activityId = activity?.id ?? newId!;
  const [kind, setKind] = useState<ActivityKind>(activity?.kind ?? "task");
  const [mode, setMode] = useState(activity?.mode ?? "individual");
  const [publish, setPublish] = useState<"draft" | "now" | "schedule">(() => initialPublish(activity));
  const [rubric, setRubric] = useState<RubricCriterion[]>(activity?.rubric ?? []);
  const [resources, setResources] = useState<Resource[]>(activity?.resources ?? []);
  const [maxScore, setMaxScore] = useState(String(activity?.max_score ?? 10));
  const [allowLate, setAllowLate] = useState(activity?.allow_late ?? true);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploadError(null);
    setUploading(true);
    const supabase = createClient();
    const added: Resource[] = [];
    for (const f of Array.from(list).slice(0, 10)) {
      if (f.size > 25 * 1024 * 1024) {
        setUploadError(`"${f.name}" pesa más de 25 MB.`);
        continue;
      }
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
      const path = `${classId}/${activityId}/recursos/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("activity-files").upload(path, f, { contentType: f.type || "application/octet-stream" });
      if (error) setUploadError(`No se pudo subir "${f.name}".`);
      else added.push({ type: "file", name: f.name.slice(0, 200), path });
    }
    setResources((r) => [...r, ...added]);
    setUploading(false);
  }

  const toolsForKind = tools;
  const rMax = rubricMax(rubric);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="class_id" value={classId} />
      {activity ? <input type="hidden" name="id" value={activity.id} /> : <input type="hidden" name="new_id" value={newId} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="publish" value={publish} />
      <input type="hidden" name="rubric" value={JSON.stringify(rubric)} />
      <input type="hidden" name="resources" value={JSON.stringify(resources)} />

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">Tipo de actividad</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(KIND_INFO) as ActivityKind[]).map((k) => {
            const Icon = KIND_ICONS[k];
            return (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 p-3 text-left transition-colors",
                  kind === k ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-300",
                )}
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", KIND_INFO[k].cls)}>
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-bold text-slate-900">{KIND_INFO[k].label}</span>
                  <span className="block text-xs text-slate-500">{KIND_INFO[k].hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-4">
        <Field label="Título" htmlFor="title" required>
          <Input id="title" name="title" required maxLength={200} defaultValue={activity?.title} placeholder="Ej. Análisis de caso: identidad de marca" />
        </Field>
        <Field label="Instrucciones" htmlFor="instructions" hint="Qué deben hacer, cómo y qué se evaluará.">
          <Textarea id="instructions" name="instructions" maxLength={10000} defaultValue={activity?.instructions ?? ""} className="min-h-32" />
        </Field>
        {kind === "interactive" && (
          <Field label="Herramienta" htmlFor="tool_id" required hint="Solo las fichas interactivas se califican solas; las demás se marcan como completadas.">
            {toolsForKind.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Aún no tienes herramientas guardadas. Crea una en <strong>Herramientas de actividades</strong> y vuelve aquí.
              </p>
            ) : (
              <Select id="tool_id" name="tool_id" defaultValue={activity?.tool_id ?? ""} required>
                <option value="">Elige una de tus creaciones…</option>
                {toolsForKind.map((t) => (
                  <option key={t.id} value={t.id}>
                    {TOOL_INFO[t.kind]?.name ?? t.kind} · {t.title || "Sin título"}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-900">Recursos para el estudiante (opcional)</legend>
        {resources.length > 0 && (
          <ul className="space-y-1.5">
            {resources.map((r, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                {r.type === "file" ? <Paperclip className="size-4 text-slate-400" /> : <Link2 className="size-4 text-slate-400" />}
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <button type="button" onClick={() => setResources((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-600" aria-label={`Quitar ${r.name}`}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-300">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} Subir archivos
            <input type="file" multiple className="sr-only" onChange={(e) => uploadFiles(e.target.files)} />
          </label>
          <div className="flex min-w-0 flex-1 gap-2">
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… (enlace a video, lectura, Drive)" aria-label="Enlace" className="h-9 min-w-0" />
            <Button
              variant="secondary"
              size="sm"
              className="h-9"
              disabled={!/^https?:\/\/\S+\.\S+/i.test(linkUrl.trim())}
              onClick={() => {
                setResources((r) => [...r, { type: "link", name: linkUrl.trim(), url: linkUrl.trim() }]);
                setLinkUrl("");
              }}
            >
              <Plus className="size-4" /> Enlace
            </Button>
          </div>
        </div>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-900">¿Cómo se trabaja?</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["individual", "Individual", User],
              ["team", "En equipos", Users],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ring-1", mode === m ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-700 ring-slate-300")}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        {mode === "team" && <p className="text-sm text-slate-500">Después de guardar podrás formar los equipos (al azar o a mano). Cualquier integrante entrega por todo el equipo.</p>}
      </fieldset>

      {kind !== "interactive" && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-slate-900">Formas de entrega</legend>
          <Toggle name="accept_text" label="Texto" hint="Escribir la respuesta directamente." defaultChecked={activity?.accept_text ?? true} />
          <Toggle name="accept_files" label="Archivos" hint="PDF, imágenes, documentos (hasta 25 MB c/u)." defaultChecked={activity?.accept_files ?? true} />
          <Toggle name="accept_link" label="Enlace" hint="Drive, Canva, Figma, YouTube…" defaultChecked={activity?.accept_link ?? true} />
        </fieldset>
      )}

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Fechas</legend>
        <Field label="Publicación" htmlFor="publish-sel">
          <Select id="publish-sel" value={publish} onChange={(e) => setPublish(e.target.value as typeof publish)}>
            <option value="now">Publicar ahora</option>
            <option value="schedule">Programar fecha</option>
            <option value="draft">Guardar como borrador</option>
          </Select>
        </Field>
        {publish === "schedule" ? (
          <Field label="Se publica el" htmlFor="publish_at" required>
            <Input id="publish_at" name="publish_at" type="datetime-local" required defaultValue={toLocalInput(activity?.publish_at)} />
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Fecha límite" htmlFor="due_at" hint="Hora de Sonora. Déjala vacía si no tiene fecha límite.">
          <Input id="due_at" name="due_at" type="datetime-local" defaultValue={toLocalInput(activity?.due_at)} />
        </Field>
        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="allow_late" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} className="mt-1 size-5 accent-violet-600" />
            <span className="text-sm font-medium text-slate-900">Aceptar entregas tardías</span>
          </label>
          {allowLate && (
            <Field label="Descuento por entrega tardía (%)" htmlFor="late_penalty_pct">
              <Input id="late_penalty_pct" name="late_penalty_pct" type="number" min={0} max={100} defaultValue={activity?.late_penalty_pct ?? 0} className="w-28" />
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Calificación</legend>
        <Field label="Calificación máxima" htmlFor="max_score" hint="Ej. 10 o 100.">
          <Input id="max_score" name="max_score" type="number" min={0.1} max={1000} step="0.1" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} required className="w-32" />
        </Field>
        <Field label="Intentos permitidos" htmlFor="max_attempts" hint="0 = ilimitados. Si devuelves una entrega, se permite un intento más.">
          <Input id="max_attempts" name="max_attempts" type="number" min={0} max={20} defaultValue={activity?.max_attempts ?? 1} className="w-28" />
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-900">Rúbrica (opcional)</legend>
        <p className="text-sm text-slate-500">
          Cada criterio con sus puntos. Al calificar, la suma se convierte a la calificación máxima ({maxScore || "—"}).
          {rMax > 0 && <strong className="text-slate-700"> Total de la rúbrica: {rMax} pts.</strong>}
        </p>
        {rubric.map((c, i) => (
          <div key={c.id} className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
            <Input
              value={c.criterion}
              onChange={(e) => setRubric((r) => r.map((x, j) => (j === i ? { ...x, criterion: e.target.value } : x)))}
              placeholder="Criterio (ej. Contenido)"
              aria-label={`Criterio ${i + 1}`}
              maxLength={200}
            />
            <Input
              type="number"
              min={0}
              step="0.5"
              value={c.points}
              onChange={(e) => setRubric((r) => r.map((x, j) => (j === i ? { ...x, points: Number(e.target.value) } : x)))}
              aria-label={`Puntos del criterio ${i + 1}`}
            />
            <button type="button" onClick={() => setRubric((r) => r.filter((_, j) => j !== i))} className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Quitar criterio ${i + 1}`}>
              <Trash2 className="size-4" />
            </button>
            <Textarea
              value={c.description ?? ""}
              onChange={(e) => setRubric((r) => r.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
              placeholder="Qué se espera (opcional)"
              aria-label={`Descripción del criterio ${i + 1}`}
              className="min-h-14 sm:col-span-3"
              maxLength={1000}
            />
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setRubric((r) => [...r, { id: crypto.randomUUID(), criterion: "", points: 5 }])}>
          <Plus className="size-4" /> Agregar criterio
        </Button>
      </fieldset>

      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton size="lg" className="rounded-xl" disabled={uploading}>
          {activity ? "Guardar cambios" : publish === "draft" ? "Guardar borrador" : publish === "schedule" ? "Programar actividad" : "Publicar actividad"}
        </SubmitButton>
      </div>
    </form>
  );
}
