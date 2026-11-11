"use client";

import { ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { Answers, FormField } from "@/lib/types";
import { isAnswered, isVisible, splitPages } from "@/lib/fields/logic";
import { isLayout } from "@/lib/fields/types";
import { scoreSubmission } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { FieldInput, type UploadFn } from "./field-input";

export function LayoutBlock({ field }: { field: FormField }) {
  switch (field.type) {
    case "section_title":
      return (
        <div className="pt-2">
          <h2 className="text-xl font-semibold text-slate-900">{field.label}</h2>
          {field.help && <p className="mt-1 text-sm text-slate-600">{field.help}</p>}
          <div className="mt-2 h-1 w-12 rounded-full bg-[var(--brand)]" />
        </div>
      );
    case "paragraph":
      return <p className="whitespace-pre-line text-base text-slate-700">{field.label}</p>;
    case "image":
      return field.config.url ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={field.config.url} alt={field.config.alt ?? ""} className="w-full rounded-xl object-contain" />
          {field.label && <figcaption className="mt-1 text-sm text-slate-500">{field.label}</figcaption>}
        </figure>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
          Imagen sin seleccionar
        </div>
      );
    case "divider":
      return <hr className="border-slate-200" />;
    default:
      return null;
  }
}

export function FormRunner({
  fields,
  answers,
  onAnswer,
  onSubmit,
  submitLabel = "Enviar evaluación",
  readOnly,
  upload,
  showScore,
  stickyNav = true,
}: {
  fields: FormField[];
  answers: Answers;
  onAnswer: (fieldId: string, value: unknown) => void;
  onSubmit?: () => Promise<void> | void;
  submitLabel?: string;
  readOnly?: boolean;
  upload?: UploadFn;
  showScore?: boolean;
  stickyNav?: boolean;
}) {
  const pages = useMemo(() => splitPages(fields), [fields]);
  const [page, setPage] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const current = Math.min(page, pages.length - 1);
  const visible = (f: FormField) => isVisible(f, fields, answers);
  const pageFields = pages[current].filter(visible);

  const questions = fields.filter((f) => !isLayout(f.type) && f.type !== "page_break" && visible(f));
  const answeredCount = questions.filter((f) => isAnswered(f, answers[f.id])).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const score = showScore ? scoreSubmission(fields, answers) : null;

  function validate(list: FormField[]) {
    const errs: Record<string, string> = {};
    for (const f of list) {
      if (isLayout(f.type) || !visible(f)) continue;
      const v = answers[f.id];
      if (f.required && !isAnswered(f, v)) errs[f.id] = "Esta pregunta es obligatoria.";
      else if (f.required && f.type === "matrix") {
        const rows = f.config.rows ?? [];
        const ans = (v ?? {}) as Record<string, string>;
        if (rows.some((r) => !ans[r.id])) errs[f.id] = "Responde todas las filas.";
      }
      if (f.type === "number" && typeof v === "number") {
        if (f.config.min !== undefined && v < f.config.min) errs[f.id] = `El valor mínimo es ${f.config.min}.`;
        if (f.config.max !== undefined && v > f.config.max) errs[f.id] = `El valor máximo es ${f.config.max}.`;
      }
    }
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) document.getElementById(`block-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !first;
  }

  function goTo(p: number) {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    // Validar todas las páginas; ir a la primera con errores
    for (let i = 0; i < pages.length; i++) {
      const list = pages[i].filter(visible);
      if (!validate(list)) {
        if (i !== current) {
          setPage(i);
          setTimeout(() => validate(list), 50);
        }
        return;
      }
    }
    setErrors({});
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = current === pages.length - 1;

  return (
    <div ref={topRef} className="scroll-mt-4">
      <div className="mb-5 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            {pages.length > 1 ? `Paso ${current + 1} de ${pages.length} · ` : ""}
            {answeredCount} de {questions.length} respondidas
          </span>
          {score && <span className="text-slate-700">Puntaje: {score.total.toFixed(1)} / 100</span>}
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance del formulario"
        >
          <div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-6">
        {pageFields.map((f) =>
          isLayout(f.type) ? (
            <LayoutBlock key={f.id} field={f} />
          ) : (
            <div
              key={f.id}
              id={`block-${f.id}`}
              className={cn(
                "scroll-mt-24 rounded-2xl border bg-white p-4 shadow-sm sm:p-5",
                errors[f.id] ? "border-red-300 ring-2 ring-red-100" : "border-slate-200",
              )}
            >
              <label id={`f-${f.id}-label`} htmlFor={`f-${f.id}`} className="block text-base font-semibold text-slate-900">
                {f.label || "Pregunta sin título"}
                {f.required && (
                  <span className="text-red-600" aria-label="obligatoria">
                    {" "}
                    *
                  </span>
                )}
              </label>
              {f.help && <p className="mt-1 text-sm text-slate-500">{f.help}</p>}
              <div className="mt-3">
                <FieldInput
                  field={f}
                  value={answers[f.id]}
                  disabled={readOnly}
                  upload={upload}
                  onChange={(v) => {
                    onAnswer(f.id, v);
                    if (errors[f.id]) setErrors((e) => ({ ...e, [f.id]: "" }));
                  }}
                />
              </div>
              {errors[f.id] && (
                <p className="mt-2 text-sm font-medium text-red-600" role="alert">
                  {errors[f.id]}
                </p>
              )}
            </div>
          ),
        )}
        {pageFields.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Esta página no tiene preguntas visibles.
          </p>
        )}
      </div>

      {!readOnly && (
        <div
          className={cn(
            "mt-6 flex gap-2 border-t border-slate-200 bg-white/95 py-3 backdrop-blur",
            stickyNav && "sticky bottom-0 -mx-4 px-4",
          )}
        >
          {current > 0 && (
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              className="inline-flex h-12 items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 font-medium text-slate-700"
            >
              <ChevronLeft className="size-5" /> Atrás
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-base font-semibold text-[var(--brand-contrast)] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => validate(pageFields) && goTo(current + 1)}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--brand)] px-4 text-base font-semibold text-[var(--brand-contrast)]"
            >
              Siguiente <ChevronRight className="size-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
