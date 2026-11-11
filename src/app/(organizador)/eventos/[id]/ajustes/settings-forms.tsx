"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult, EventRow, ScoreMethod } from "@/lib/types";
import { SCORE_METHOD_LABELS } from "@/lib/utils";
import {
  addCollaborator,
  deleteEvent,
  duplicateEvent,
  removeCollaborator,
  updateEvaluationSettings,
} from "../../actions";

export function EvaluationSettingsForm({ event, disabled }: { event: EventRow; disabled: boolean }) {
  const [state, action] = useActionState(updateEvaluationSettings.bind(null, event.id), null as ActionResult);
  return (
    <form action={action}>
      <fieldset disabled={disabled} className="space-y-4">
        <Field
          label="PIN de acceso (opcional)"
          htmlFor="access_pin"
          hint="Si lo defines, los evaluadores deberán escribirlo para entrar. Déjalo vacío para no pedir PIN."
        >
          <Input
            id="access_pin"
            name="access_pin"
            defaultValue={event.access_pin ?? ""}
            placeholder="Ej. EXPO26"
            maxLength={12}
            className="max-w-48 font-mono uppercase"
          />
        </Field>
        <Field label="Método de cálculo del puntaje final" htmlFor="score_method">
          <Select id="score_method" name="score_method" defaultValue={event.score_method} className="max-w-md">
            {(Object.keys(SCORE_METHOD_LABELS) as ScoreMethod[]).map((m) => (
              <option key={m} value={m}>
                {SCORE_METHOD_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lugares a premiar (podio)" htmlFor="podium_size" hint="1 = solo ganador, 3 = top 3, etc.">
            <Input
              id="podium_size"
              name="podium_size"
              type="number"
              min={1}
              max={20}
              defaultValue={event.podium_size}
              className="max-w-32"
            />
          </Field>
          <Field
            label="Mínimo de evaluaciones por proyecto"
            htmlFor="min_evaluations"
            hint="Te avisaremos si un proyecto tiene menos."
          >
            <Input
              id="min_evaluations"
              name="min_evaluations"
              type="number"
              min={0}
              max={100}
              defaultValue={event.min_evaluations}
              className="max-w-32"
            />
          </Field>
        </div>
        <FormMessage state={state} />
        {!disabled && <SubmitButton>Guardar configuración</SubmitButton>}
      </fieldset>
    </form>
  );
}

export function CollaboratorsForm({
  eventId,
  collaborators,
  isOwner,
}: {
  eventId: string;
  collaborators: { user_id: string; role: string; name: string; email: string }[];
  isOwner: boolean;
}) {
  const [state, action] = useActionState(addCollaborator.bind(null, eventId), null as ActionResult);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {collaborators.length === 0 && (
          <li className="px-3 py-3 text-sm text-slate-500">Aún no compartes este evento con nadie.</li>
        )}
        {collaborators.map((c) => (
          <li key={c.user_id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.name || c.email}</div>
              <div className="truncate text-xs text-slate-500">{c.email}</div>
            </div>
            <span className="text-xs text-slate-500">{c.role === "editor" ? "Puede editar" : "Solo lectura"}</span>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={`Quitar a ${c.name || c.email}`}
                onClick={() => {
                  if (window.confirm("¿Quitar a esta persona del evento?"))
                    start(async () => {
                      await removeCollaborator(eventId, c.user_id);
                    });
                }}
              >
                <Trash2 className="size-4 text-red-600" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {isOwner && (
        <form action={action} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              name="email"
              type="email"
              placeholder="correo@itson.edu.mx"
              className="min-w-56 flex-1"
              aria-label="Correo del co-organizador"
              required
            />
            <Select name="role" className="w-auto" aria-label="Permiso">
              <option value="editor">Puede editar</option>
              <option value="viewer">Solo lectura</option>
            </Select>
            <SubmitButton pendingText="Agregando…">
              <UserPlus className="size-4" /> Agregar
            </SubmitButton>
          </div>
          <p className="text-xs text-slate-500">La persona debe tener una cuenta de organizador en la plataforma.</p>
          <FormMessage state={state} />
        </form>
      )}
    </div>
  );
}

export function DuplicateForm({ event }: { event: EventRow }) {
  const [state, action] = useActionState(duplicateEvent.bind(null, event.id), null as ActionResult);
  return (
    <form action={action} className="space-y-3">
      <Field label="Nombre del nuevo evento" htmlFor="dup-name">
        <Input id="dup-name" name="name" defaultValue={`${event.name} (copia)`} className="max-w-md" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="include_projects" className="size-4 rounded border-slate-300" />
        Copiar también los proyectos (normalmente no, porque cada semestre cambian)
      </label>
      <p className="text-xs text-slate-500">
        Se copian los datos del evento, las categorías y los formularios. No se copian evaluaciones ni evaluadores.
      </p>
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Duplicando…">
        Duplicar evento
      </SubmitButton>
    </form>
  );
}

export function DeleteForm({ event }: { event: EventRow }) {
  const [state, action] = useActionState(deleteEvent.bind(null, event.id), null as ActionResult);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-slate-600">
        Se borrarán permanentemente el evento, sus proyectos, formularios y todas las evaluaciones. Para confirmar, escribe:{" "}
        <strong className="select-all">{event.name}</strong>
      </p>
      <Input name="confirm" className="max-w-md" aria-label="Nombre del evento para confirmar" autoComplete="off" />
      <FormMessage state={state} />
      <SubmitButton variant="danger" pendingText="Eliminando…">
        <Trash2 className="size-4" /> Eliminar evento
      </SubmitButton>
    </form>
  );
}
