"use client";

import { FileUp, Loader2, Paperclip, Pencil, Trash2 } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { dateRangeLabel, EXCUSE_INFO, localDate, type Excuse } from "@/lib/aula/attendance";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";
import { openAfter } from "@/lib/qr";
import { myExcuseFileUrl, resubmitExcuse, submitExcuse, withdrawExcuse } from "../asistencia/actions";

const TYPES = ["application/pdf", "image/jpeg", "image/png"];

function FilePicker({ classId, userId, current }: { classId: string; userId: string; current?: string | null }) {
  const [path, setPath] = useState("");
  const [name, setName] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f?: File) {
    setError(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError("Solo PDF, JPG o PNG.");
    if (f.size > 5 * 1024 * 1024) return setError("El archivo debe pesar menos de 5 MB.");
    if (!classId) return setError("Primero elige el grupo.");
    setBusy(true);
    const ext = f.type === "application/pdf" ? "pdf" : f.type === "image/png" ? "png" : "jpg";
    const p = `${classId}/${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: up } = await createClient().storage.from("excuses").upload(p, f, { contentType: f.type });
    setBusy(false);
    if (up) return setError("No se pudo subir el archivo.");
    setPath(p);
    setName(f.name.slice(0, 200));
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-800">Comprobante (PDF, JPG o PNG, máx. 5 MB)</span>
      <input type="hidden" name="file_path" value={path} />
      <input type="hidden" name="file_name" value={name} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} {name ? "Cambiar archivo" : "Adjuntar archivo"}
        </Button>
        {name && (
          <span className="inline-flex min-w-0 items-center gap-1 truncate text-sm text-slate-600">
            <Paperclip className="size-4 shrink-0" /> {name}
          </span>
        )}
      </div>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Elegir comprobante" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">Recomendado: receta, constancia médica, citatorio u otro documento.</p>
    </div>
  );
}

export function ExcuseForm({
  userId,
  classes,
  defaultClass,
  defaultDate,
}: {
  userId: string;
  classes: { id: string; name: string }[];
  defaultClass?: string;
  defaultDate?: string;
}) {
  const [state, action] = useActionState(submitExcuse, null);
  const [classId, setClassId] = useState(classes.some((c) => c.id === defaultClass) ? defaultClass! : classes[0]?.id ?? "");
  const today = localDate(new Date());
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [last, setLast] = useState(state);
  if (state !== last) {
    setLast(state);
    if (state?.ok) setFormKey((k) => k + 1);
  }
  return (
    <form key={formKey} ref={formRef} action={action} className="space-y-4">
      <Field label="Grupo" htmlFor="ex-class" required>
        <Select id="ex-class" name="class_id" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Desde" htmlFor="ex-from" required>
          <Input id="ex-from" name="date_from" type="date" required max={today} defaultValue={defaultDate ?? today} />
        </Field>
        <Field label="Hasta" htmlFor="ex-to">
          <Input id="ex-to" name="date_to" type="date" defaultValue={defaultDate ?? today} />
        </Field>
      </div>
      <Field label="Motivo" htmlFor="ex-reason" required>
        <Textarea id="ex-reason" name="reason" required minLength={3} maxLength={1500} placeholder="Explica brevemente por qué faltaste." />
      </Field>
      <FilePicker key={classId} classId={classId} userId={userId} />
      <FormMessage state={state} />
      <SubmitButton size="lg" className="rounded-xl" pendingText="Enviando…">
        Enviar justificante
      </SubmitButton>
    </form>
  );
}

export function MyExcuseCard({ e, className, userId }: { e: Excuse; className: string; userId: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [opening, setOpening] = useState(false);
  const [state, action] = useActionState(resubmitExcuse, null);
  const [last, setLast] = useState(state);
  if (state !== last) {
    setLast(state);
    if (state?.ok) setEditing(false);
  }
  const canEdit = e.status === "pending" || e.status === "needs_info";
  return (
    <Card className={cn("rounded-2xl p-5", e.status === "needs_info" && "ring-2 ring-violet-300")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-bold text-slate-900">{className}</div>
          <div className="text-sm text-slate-600">
            {dateRangeLabel(e.date_from, e.date_to)} · enviado {formatDate(e.created_at)}
          </div>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", EXCUSE_INFO[e.status].cls)}>{EXCUSE_INFO[e.status].label}</span>
      </div>
      {!editing && <p className="mt-3 whitespace-pre-line text-slate-700">{e.reason}</p>}
      {e.teacher_comment && (
        <p className="mt-3 rounded-xl bg-lavender px-3 py-2 text-sm text-violet-950">
          <strong>Tu docente:</strong> {e.teacher_comment}
        </p>
      )}
      {editing ? (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={e.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde" htmlFor={`f-${e.id}`}>
              <Input id={`f-${e.id}`} name="date_from" type="date" defaultValue={e.date_from} required />
            </Field>
            <Field label="Hasta" htmlFor={`t-${e.id}`}>
              <Input id={`t-${e.id}`} name="date_to" type="date" defaultValue={e.date_to} />
            </Field>
          </div>
          <Field label="Motivo" htmlFor={`r-${e.id}`}>
            <Textarea id={`r-${e.id}`} name="reason" defaultValue={e.reason} maxLength={1500} required />
          </Field>
          <FilePicker classId={e.class_id} userId={userId} current={e.file_name} />
          <FormMessage state={state} />
          <div className="flex gap-2">
            <SubmitButton size="sm">Enviar de nuevo</SubmitButton>
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {e.file_path && (
            <Button
              variant="secondary"
              size="sm"
              disabled={opening}
              onClick={async () => {
                setOpening(true);
                await openAfter(() => myExcuseFileUrl(e.file_path!));
                setOpening(false);
              }}
            >
              {opening ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />} Ver archivo
            </Button>
          )}
          {canEdit && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> {e.status === "needs_info" ? "Agregar información" : "Editar"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                disabled={pending}
                onClick={() => confirm("¿Retirar este justificante?") && start(() => withdrawExcuse(e.id))}
              >
                <Trash2 className="size-4" /> Retirar
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
