"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult, EventRow } from "@/lib/types";
import { readableTextColor } from "@/lib/utils";

const PRESET_COLORS = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#ea580c", "#e11d48", "#db2777", "#0f172a"];

export function EventForm({
  action,
  event,
  submitLabel,
  disabled,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  event?: Partial<EventRow>;
  submitLabel: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const [color, setColor] = useState(event?.primary_color ?? "#7c3aed");
  const [name, setName] = useState(event?.name ?? "");
  const [logo, setLogo] = useState(event?.logo_url ?? "");

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <fieldset disabled={disabled} className="space-y-4">
        <Field label="Nombre del evento" htmlFor="name" required>
          <Input
            id="name"
            name="name"
            required
            maxLength={200}
            placeholder="Expodiseño AD2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Descripción" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={event?.description ?? ""}
            placeholder="Exposición de proyectos finales de la Licenciatura en Diseño Gráfico."
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha" htmlFor="event_date">
            <Input id="event_date" name="event_date" type="date" defaultValue={event?.event_date ?? ""} />
          </Field>
          <Field label="Sede" htmlFor="venue">
            <Input id="venue" name="venue" defaultValue={event?.venue ?? ""} placeholder="ITSON Unidad Guaymas" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload name="logo_url" label="Logo" defaultValue={event?.logo_url} onChange={setLogo} />
          <ImageUpload name="cover_url" label="Imagen de portada" aspect="wide" defaultValue={event?.cover_url} />
        </div>
        <Field label="Color principal" hint="Se usa en la pantalla del evaluador, los QR y los reportes.">
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="size-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: color === c ? "#0f172a" : "transparent" }}
                aria-label={`Usar color ${c}`}
                aria-pressed={color === c}
              />
            ))}
            <label className="ml-1 inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-slate-300"
                aria-label="Elegir otro color"
              />
              <span className="font-mono">{color}</span>
            </label>
          </div>
          <input type="hidden" name="primary_color" value={color} />
        </Field>
        <FormMessage state={state} />
        {!disabled && <SubmitButton>{submitLabel}</SubmitButton>}
      </fieldset>

      <aside aria-label="Vista previa" className="space-y-2">
        <span className="text-sm font-medium text-slate-800">Vista previa en celular</span>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-5" style={{ background: color, color: readableTextColor(color) }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="mb-3 size-12 rounded-lg bg-white object-contain p-1" />
            )}
            <div className="text-xs uppercase tracking-wide opacity-80">Evaluación de proyectos</div>
            <div className="text-lg font-semibold leading-tight">{name || "Nombre del evento"}</div>
          </div>
          <div className="space-y-2 p-4">
            <div className="h-3 w-2/3 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-200" />
            <div
              className="mt-3 rounded-lg py-2.5 text-center text-sm font-medium"
              style={{ background: color, color: readableTextColor(color) }}
            >
              Comenzar evaluación
            </div>
          </div>
        </div>
      </aside>
    </form>
  );
}
