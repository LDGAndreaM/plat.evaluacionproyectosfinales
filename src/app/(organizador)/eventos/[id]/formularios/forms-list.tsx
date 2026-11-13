"use client";

import { ClipboardList, Copy, Eye, EyeOff, FilePlus2, FileUp, Pencil, Star, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FORM_TEMPLATES } from "@/lib/fields/templates";
import { createForm, deleteForm, duplicateForm, setFormPublished } from "./actions";

export interface FormSummary {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  is_default: boolean;
  questions: number;
  scored: number;
  weight: number;
  submissions: number;
  categories: string[];
}

export function FormsList({ eventId, forms, canEdit }: { eventId: string; forms: FormSummary[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string } | null>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res && !res.ok) setError(res.error ?? "Ocurrió un error.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-500">
          Cada proyecto se evalúa con el formulario asignado a su categoría. Si su categoría no tiene uno, se usa el{" "}
          <strong>formulario general</strong>. Solo los formularios <strong>publicados</strong> los ven los evaluadores.
        </p>
        {canEdit && (
          <Button onClick={() => setOpen(true)}>
            <FilePlus2 className="size-4" /> Nuevo formulario
          </Button>
        )}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {forms.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-10" />}
          title="Aún no hay formularios"
          description="Empieza con la rúbrica precargada (Creatividad, Concepto, Ejecución técnica, Presentación y Viabilidad) y ajústala a tu gusto."
          action={
            canEdit && (
              <Button onClick={() => setOpen(true)}>
                <FilePlus2 className="size-4" /> Nuevo formulario
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {forms.map((f) => (
            <Card key={f.id} className="flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-auto font-semibold text-slate-900">{f.title}</h2>
                {f.is_published ? <Badge tone="green">Publicado</Badge> : <Badge>Borrador</Badge>}
                {f.is_default && (
                  <Badge tone="violet">
                    <Star className="size-3" /> General
                  </Badge>
                )}
              </div>
              {f.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{f.description}</p>}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500">Preguntas</dt>
                  <dd className="font-semibold">{f.questions}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500">Criterios</dt>
                  <dd className="font-semibold">
                    {f.scored} <span className="text-xs font-normal text-slate-500">({f.weight}%)</span>
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500">Respuestas</dt>
                  <dd className="font-semibold">{f.submissions}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-slate-600">
                <span className="text-slate-500">Categorías: </span>
                {f.categories.length ? f.categories.join(", ") : f.is_default ? "todas las que no tengan formulario propio" : "ninguna asignada"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <LinkButton href={`/eventos/${eventId}/formularios/${f.id}`} size="sm" variant={canEdit ? "primary" : "secondary"}>
                  {canEdit ? <Pencil className="size-4" /> : <Eye className="size-4" />} {canEdit ? "Editar" : "Ver"}
                </LinkButton>
                {canEdit && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => run(() => setFormPublished(eventId, f.id, !f.is_published))}
                    >
                      {f.is_published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      {f.is_published ? "Despublicar" : "Publicar"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => duplicateForm(eventId, f.id))}>
                      <Copy className="size-4" /> Duplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        const extra = f.submissions ? ` Se borrarán también sus ${f.submissions} respuestas.` : "";
                        if (window.confirm(`¿Eliminar “${f.title}”?${extra}`)) run(() => deleteForm(eventId, f.id));
                      }}
                    >
                      <Trash2 className="size-4 text-red-600" /> Eliminar
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo formulario" size="lg">
        <p className="mb-4 text-sm text-slate-500">Elige una plantilla. Podrás modificar todo después.</p>
        <div className="grid gap-3">
          {FORM_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={pending}
              onClick={() => run(() => createForm(eventId, t.id))}
              className="rounded-xl border border-slate-200 p-4 text-left hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              <div className="font-semibold text-slate-900">{t.title}</div>
              <div className="mt-0.5 text-sm text-slate-500">{t.description}</div>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => createForm(eventId, "blanco", true))}
          className="mt-3 w-full rounded-xl border border-dashed border-slate-300 p-4 text-left hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
        >
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <FileUp className="size-4" /> Importar desde Excel (CSV)
          </div>
          <div className="mt-0.5 text-sm text-slate-500">
            Descarga la plantilla, llena tus preguntas en Excel y súbela. Ideal para rúbricas largas.
          </div>
        </button>
        {pending && <p className="mt-3 text-sm text-slate-500">Creando formulario…</p>}
      </Modal>
    </div>
  );
}
