"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { LIKERT_PRESETS, fieldTypeInfo, optionsFromLabels, shortId } from "@/lib/fields/registry";
import { logicSources, logicValueOptions } from "@/lib/fields/logic";
import type { ChoiceOption, FieldConfig, LogicOperator, MatrixRow } from "@/lib/fields/types";
import { isLayout, isScorable } from "@/lib/fields/types";
import { maxPoints } from "@/lib/scoring";
import type { FormField } from "@/lib/types";

function move<T>(arr: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-slate-900" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5" : "left-0.5"}`}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

function OptionsEditor({
  options,
  onChange,
  showPoints,
  labelPlaceholder = "Opción",
}: {
  options: ChoiceOption[];
  onChange: (o: ChoiceOption[]) => void;
  showPoints: boolean;
  labelPlaceholder?: string;
}) {
  return (
    <div className="space-y-2">
      {showPoints && (
        <div className="flex gap-2 px-1 text-xs font-medium text-slate-500">
          <span className="flex-1">Etiqueta</span>
          <span className="w-16 text-center">Puntos</span>
          <span className="w-[84px]" />
        </div>
      )}
      {options.map((o, i) => (
        <div key={o.id} className="flex items-center gap-2">
          <Input
            value={o.label}
            placeholder={`${labelPlaceholder} ${i + 1}`}
            onChange={(e) => onChange(options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))}
            aria-label={`Etiqueta de ${labelPlaceholder.toLowerCase()} ${i + 1}`}
            className="h-9"
          />
          {showPoints && (
            <Input
              type="number"
              value={Number.isFinite(o.points) ? o.points : 0}
              step="any"
              onChange={(e) =>
                onChange(options.map((x) => (x.id === o.id ? { ...x, points: Number(e.target.value) || 0 } : x)))
              }
              className="h-9 w-16 shrink-0 px-2 text-center"
              aria-label={`Puntos de ${o.label || `opción ${i + 1}`}`}
            />
          )}
          <div className="flex shrink-0">
            <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => onChange(move(options, i, -1))} aria-label="Subir">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === options.length - 1} onClick={() => onChange(move(options, i, 1))} aria-label="Bajar">
              <ArrowDown className="size-4" />
            </button>
            <button type="button" className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-30" disabled={options.length <= 1} onClick={() => onChange(options.filter((x) => x.id !== o.id))} aria-label="Eliminar opción">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const maxPts = Math.max(0, ...options.map((o) => o.points));
          onChange([...options, { id: shortId(), label: "", points: showPoints ? maxPts + 1 : 0 }]);
        }}
        className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline"
      >
        <Plus className="size-4" /> Agregar {labelPlaceholder.toLowerCase()}
      </button>
    </div>
  );
}

function RowsEditor({ rows, onChange }: { rows: MatrixRow[]; onChange: (r: MatrixRow[]) => void }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-center gap-2">
          <Input
            value={r.label}
            placeholder={`Criterio ${i + 1}`}
            onChange={(e) => onChange(rows.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
            className="h-9"
            aria-label={`Fila ${i + 1}`}
          />
          <div className="flex shrink-0">
            <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => onChange(move(rows, i, -1))} aria-label="Subir">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === rows.length - 1} onClick={() => onChange(move(rows, i, 1))} aria-label="Bajar">
              <ArrowDown className="size-4" />
            </button>
            <button type="button" className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-30" disabled={rows.length <= 1} onClick={() => onChange(rows.filter((x) => x.id !== r.id))} aria-label="Eliminar fila">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { id: shortId(), label: "" }])}
        className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline"
      >
        <Plus className="size-4" /> Agregar fila
      </button>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step="any"
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="h-9"
      />
    </Field>
  );
}

export function FieldSettings({
  field,
  fields,
  onChange,
}: {
  field: FormField;
  fields: FormField[];
  onChange: (patch: Partial<FormField>) => void;
}) {
  const c = field.config;
  const setConfig = (patch: Partial<FieldConfig>) => onChange({ config: { ...c, ...patch } });
  const layout = isLayout(field.type);
  const scorable = isScorable(field.type);
  const info = fieldTypeInfo(field.type);
  const sources = logicSources(field, fields);
  const source = field.logic ? fields.find((f) => f.id === field.logic!.fieldId) : undefined;
  const valueOptions = source ? logicValueOptions(source) : null;

  return (
    <div className="space-y-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{info.label}</div>

      {/* Texto principal */}
      {field.type === "paragraph" ? (
        <Field label="Texto" htmlFor="fs-label">
          <Textarea id="fs-label" value={field.label} rows={5} onChange={(e) => onChange({ label: e.target.value })} />
        </Field>
      ) : !["divider", "page_break"].includes(field.type) ? (
        <Field
          label={field.type === "section_title" ? "Título de la sección" : field.type === "image" ? "Pie de imagen (opcional)" : "Pregunta o criterio"}
          htmlFor="fs-label"
        >
          <Input id="fs-label" value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
        </Field>
      ) : (
        <p className="text-sm text-slate-500">
          {field.type === "divider"
            ? "Una línea para separar visualmente las preguntas."
            : "Divide el formulario en pasos. El evaluador avanzará con el botón “Siguiente”."}
        </p>
      )}

      {(!layout || field.type === "section_title") && (
        <Field label="Descripción o ayuda" htmlFor="fs-help" hint="Texto breve debajo de la pregunta.">
          <Textarea id="fs-help" value={field.help ?? ""} rows={2} className="min-h-0" onChange={(e) => onChange({ help: e.target.value || null })} />
        </Field>
      )}

      {field.type === "image" && (
        <>
          <ImageUpload name="fs-image" label="Imagen" aspect="wide" defaultValue={c.url} onChange={(url) => setConfig({ url })} />
          <Field label="Texto alternativo" hint="Describe la imagen para lectores de pantalla.">
            <Input value={c.alt ?? ""} onChange={(e) => setConfig({ alt: e.target.value })} className="h-9" />
          </Field>
        </>
      )}

      {!layout && (
        <Toggle checked={field.required} onChange={(required) => onChange({ required })} label="Obligatoria" description="El evaluador no podrá enviar sin responderla." />
      )}

      {/* Configuración por tipo */}
      {(field.type === "short_text" || field.type === "long_text") && (
        <Field label="Texto de ejemplo (placeholder)">
          <Input value={c.placeholder ?? ""} onChange={(e) => setConfig({ placeholder: e.target.value })} className="h-9" />
        </Field>
      )}

      {field.type === "number" && (
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="Mínimo" value={c.min} onChange={(min) => setConfig({ min })} />
          <NumberInput label="Máximo" value={c.max} onChange={(max) => setConfig({ max })} />
          <NumberInput label="Incremento" value={c.step} onChange={(step) => setConfig({ step })} min={0} />
        </div>
      )}

      {["single_choice", "multiple_choice", "dropdown"].includes(field.type) && (
        <Field label="Opciones">
          <OptionsEditor options={c.options ?? []} onChange={(options) => setConfig({ options })} showPoints={field.scored} />
        </Field>
      )}

      {field.type === "multiple_choice" && (
        <NumberInput
          label="Máximo de selecciones (vacío = sin límite)"
          value={c.maxSelections}
          min={1}
          onChange={(maxSelections) => setConfig({ maxSelections })}
        />
      )}

      {field.type === "likert" && (
        <>
          <Field label="Usar una escala predefinida">
            <Select
              value=""
              onChange={(e) => {
                const preset = LIKERT_PRESETS[Number(e.target.value)];
                if (preset) setConfig({ options: optionsFromLabels(preset.labels) });
              }}
              className="h-9"
            >
              <option value="">Elegir…</option>
              {LIKERT_PRESETS.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Niveles (de menor a mayor)">
            <OptionsEditor options={c.options ?? []} onChange={(options) => setConfig({ options })} showPoints labelPlaceholder="Nivel" />
          </Field>
        </>
      )}

      {field.type === "linear_scale" && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <NumberInput label="Desde" value={c.min} onChange={(min) => setConfig({ min })} />
            <NumberInput label="Hasta" value={c.max} onChange={(max) => setConfig({ max })} />
            <NumberInput label="Incremento" value={c.step} min={0} onChange={(step) => setConfig({ step })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Etiqueta inicial">
              <Input value={c.minLabel ?? ""} onChange={(e) => setConfig({ minLabel: e.target.value })} className="h-9" />
            </Field>
            <Field label="Etiqueta final">
              <Input value={c.maxLabel ?? ""} onChange={(e) => setConfig({ maxLabel: e.target.value })} className="h-9" />
            </Field>
          </div>
          <p className="text-xs text-slate-500">Con 11 valores o menos se muestran botones; con más, un control deslizante.</p>
        </>
      )}

      {field.type === "rating" && (
        <Field label="Número de estrellas">
          <Select value={c.max ?? 5} onChange={(e) => setConfig({ max: Number(e.target.value) })} className="h-9">
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {field.type === "matrix" && (
        <>
          <Field label="Filas (criterios)">
            <RowsEditor rows={c.rows ?? []} onChange={(rows) => setConfig({ rows })} />
          </Field>
          <Field label="Columnas (escala)">
            <OptionsEditor options={c.columns ?? []} onChange={(columns) => setConfig({ columns })} showPoints labelPlaceholder="Nivel" />
          </Field>
        </>
      )}

      {field.type === "yes_no" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Texto para Sí">
            <Input value={c.yesLabel ?? ""} onChange={(e) => setConfig({ yesLabel: e.target.value })} className="h-9" />
          </Field>
          <Field label="Texto para No">
            <Input value={c.noLabel ?? ""} onChange={(e) => setConfig({ noLabel: e.target.value })} className="h-9" />
          </Field>
          {field.scored && (
            <>
              <NumberInput label="Puntos por Sí" value={c.yesPoints} onChange={(yesPoints) => setConfig({ yesPoints })} />
              <NumberInput label="Puntos por No" value={c.noPoints} onChange={(noPoints) => setConfig({ noPoints })} />
            </>
          )}
        </div>
      )}

      {field.type === "datetime" && (
        <Field label="Qué se pide">
          <Select value={c.mode ?? "date"} onChange={(e) => setConfig({ mode: e.target.value as FieldConfig["mode"] })} className="h-9">
            <option value="date">Solo fecha</option>
            <option value="time">Solo hora</option>
            <option value="datetime">Fecha y hora</option>
          </Select>
        </Field>
      )}

      {field.type === "file" && (
        <Field label="Tipo de archivo">
          <Select value={c.accept ?? "image"} onChange={(e) => setConfig({ accept: e.target.value })} className="h-9">
            <option value="image">Foto o imagen</option>
            <option value="pdf">PDF</option>
            <option value="any">Imagen, PDF u Office</option>
          </Select>
        </Field>
      )}

      {/* Puntaje */}
      {scorable && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Toggle
            checked={field.scored}
            onChange={(scored) => onChange({ scored, weight: scored && !field.weight ? 10 : field.weight })}
            label="Cuenta para el puntaje"
            description="Se usa para calcular el ranking."
          />
          {field.scored && (
            <>
              <Field label="Ponderación del criterio (%)" hint="Qué tanto pesa este criterio en la calificación final.">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={field.weight}
                  onChange={(e) => onChange({ weight: Math.max(0, Number(e.target.value) || 0) })}
                  className="h-9 max-w-28 bg-white"
                />
              </Field>
              <p className="text-xs text-slate-600">
                Puntos máximos de esta pregunta: <strong>{maxPoints(field)}</strong>
                {field.type === "number" && c.max === undefined && " (define un máximo para poder calificar)"}
              </p>
            </>
          )}
        </div>
      )}

      {/* Lógica condicional */}
      {field.type !== "page_break" && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          <Toggle
            checked={!!field.logic}
            onChange={(on) =>
              onChange({ logic: on ? { fieldId: sources[sources.length - 1]?.id ?? "", operator: "equals", value: "" } : null })
            }
            label="Mostrar solo si…"
            description={sources.length ? "Depende de la respuesta a una pregunta anterior." : "Agrega antes una pregunta para usar condiciones."}
          />
          {field.logic && (
            <div className="space-y-2">
              <Select
                value={field.logic.fieldId}
                onChange={(e) => onChange({ logic: { ...field.logic!, fieldId: e.target.value, value: "" } })}
                className="h-9"
                aria-label="Pregunta de la que depende"
              >
                <option value="">Elige una pregunta…</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label || fieldTypeInfo(s.type).label}
                  </option>
                ))}
              </Select>
              <Select
                value={field.logic.operator}
                onChange={(e) => onChange({ logic: { ...field.logic!, operator: e.target.value as LogicOperator } })}
                className="h-9"
                aria-label="Condición"
              >
                <option value="equals">es igual a</option>
                <option value="not_equals">es distinta de</option>
                {source?.type === "multiple_choice" && <option value="includes">incluye</option>}
                <option value="answered">fue respondida</option>
                <option value="not_answered">no fue respondida</option>
              </Select>
              {!["answered", "not_answered"].includes(field.logic.operator) &&
                (valueOptions ? (
                  <Select
                    value={field.logic.value ?? ""}
                    onChange={(e) => onChange({ logic: { ...field.logic!, value: e.target.value } })}
                    className="h-9"
                    aria-label="Valor"
                  >
                    <option value="">Elige un valor…</option>
                    {valueOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={field.logic.value ?? ""}
                    placeholder="Valor"
                    onChange={(e) => onChange({ logic: { ...field.logic!, value: e.target.value } })}
                    className="h-9"
                    aria-label="Valor"
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
