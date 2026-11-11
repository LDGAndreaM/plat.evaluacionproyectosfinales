"use client";

import { Check, FileUp, Loader2, Paperclip, Star } from "lucide-react";
import { useState } from "react";
import type { FormField } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SignaturePad } from "./signature-pad";

export interface FileValue {
  path: string;
  name: string;
  url?: string;
}

export type UploadFn = (file: File, field: FormField) => Promise<FileValue>;

const base =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_25%,transparent)] disabled:bg-slate-50";

/** Botón seleccionable grande, pensado para el dedo. */
function Choice({
  selected,
  onClick,
  children,
  role = "radio",
  disabled,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: "radio" | "checkbox";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-base transition-colors",
        selected
          ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_10%,white)] font-medium text-slate-900"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
        disabled && "cursor-default",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center border-2",
          role === "radio" ? "rounded-full" : "rounded-md",
          selected ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]" : "border-slate-300",
        )}
        aria-hidden
      >
        {selected && (role === "radio" ? <span className="size-2 rounded-full bg-current" /> : <Check className="size-3.5" />)}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/** Fila de niveles (Likert, escala lineal, matriz). */
function Scale({
  items,
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  items: { id: string; top: string; bottom?: string }[];
  value: string | undefined;
  onChange: (id: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const cols = items.length;
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${Math.min(cols, 6)}, minmax(0, 1fr))` }}
    >
      {items.map((it) => {
        const selected = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(it.id)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-colors",
              selected
                ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
            )}
          >
            <span className="text-base font-semibold leading-none">{it.top}</span>
            {it.bottom && (
              <span className="mt-1 w-full text-[11px] leading-tight opacity-90 [overflow-wrap:anywhere] hyphens-auto" lang="es">
                {it.bottom}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
  disabled,
  upload,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  upload?: UploadFn;
}) {
  const c = field.config ?? {};
  const id = `f-${field.id}`;

  switch (field.type) {
    case "short_text":
      return (
        <input
          id={id}
          className={base}
          value={(value as string) ?? ""}
          placeholder={c.placeholder}
          maxLength={c.maxLength || 500}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "long_text":
      return (
        <textarea
          id={id}
          className={cn(base, "min-h-28")}
          value={(value as string) ?? ""}
          placeholder={c.placeholder}
          maxLength={c.maxLength || 5000}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={cn(base, "max-w-48")}
          value={value === undefined || value === null ? "" : String(value)}
          min={c.min}
          max={c.max}
          step={c.step || "any"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );

    case "single_choice":
      return (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="space-y-2">
          {(c.options ?? []).map((o) => (
            <Choice key={o.id} selected={value === o.id} disabled={disabled} onClick={() => onChange(o.id)}>
              {o.label}
            </Choice>
          ))}
        </div>
      );

    case "multiple_choice": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const limit = c.maxSelections && c.maxSelections > 0 ? c.maxSelections : Infinity;
      return (
        <div className="space-y-2">
          {Number.isFinite(limit) && <p className="text-xs text-slate-500">Elige hasta {limit}.</p>}
          {(c.options ?? []).map((o) => {
            const on = arr.includes(o.id);
            return (
              <Choice
                key={o.id}
                role="checkbox"
                selected={on}
                disabled={disabled}
                onClick={() => {
                  if (on) onChange(arr.filter((x) => x !== o.id));
                  else if (arr.length < limit) onChange([...arr, o.id]);
                }}
              >
                {o.label}
              </Choice>
            );
          })}
        </div>
      );
    }

    case "dropdown":
      return (
        <select
          id={id}
          className={base}
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">Selecciona…</option>
          {(c.options ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      );

    case "likert": {
      const opts = c.options ?? [];
      if (opts.length > 6)
        return (
          <div role="radiogroup" className="space-y-2">
            {opts.map((o) => (
              <Choice key={o.id} selected={value === o.id} disabled={disabled} onClick={() => onChange(o.id)}>
                {o.label}
              </Choice>
            ))}
          </div>
        );
      return (
        <Scale
          ariaLabel={field.label}
          items={opts.map((o, i) => ({ id: o.id, top: String(i + 1), bottom: o.label }))}
          value={value as string}
          onChange={onChange}
          disabled={disabled}
        />
      );
    }

    case "linear_scale": {
      const min = Number(c.min ?? 0);
      const max = Number(c.max ?? 10);
      const step = Number(c.step || 1);
      const count = Math.floor((max - min) / step) + 1;
      const v = typeof value === "number" ? value : undefined;
      if (count <= 11 && count > 0) {
        const items = Array.from({ length: count }, (_, i) => {
          const n = Math.round((min + i * step) * 100) / 100;
          return { id: String(n), top: String(n) };
        });
        return (
          <div className="space-y-1.5">
            <div
              role="radiogroup"
              aria-label={field.label}
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${count <= 6 ? count : Math.ceil(count / 2)}, minmax(0, 1fr))` }}
            >
              {items.map((it) => {
                const sel = v !== undefined && String(v) === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    disabled={disabled}
                    onClick={() => onChange(Number(it.id))}
                    className={cn(
                      "h-12 rounded-xl border text-base font-semibold transition-colors",
                      sel
                        ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                    )}
                  >
                    {it.top}
                  </button>
                );
              })}
            </div>
            {(c.minLabel || c.maxLabel) && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>{c.minLabel}</span>
                <span>{c.maxLabel}</span>
              </div>
            )}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <div className="text-center text-3xl font-bold text-[var(--brand)]">{v ?? "–"}</div>
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={v ?? min}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8 w-full accent-[var(--brand)]"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>
              {min} {c.minLabel && `· ${c.minLabel}`}
            </span>
            <span>
              {c.maxLabel && `${c.maxLabel} · `}
              {max}
            </span>
          </div>
        </div>
      );
    }

    case "rating": {
      const max = Math.min(10, Math.max(1, Number(c.max ?? 5)));
      const v = typeof value === "number" ? value : 0;
      return (
        <div role="radiogroup" aria-label={field.label} className="flex flex-wrap gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={v === n}
              aria-label={`${n} de ${max} estrellas`}
              disabled={disabled}
              onClick={() => onChange(n)}
              className="p-1"
            >
              <Star
                className={cn("size-9 transition-colors", n <= v ? "fill-amber-400 text-amber-400" : "text-slate-300")}
              />
            </button>
          ))}
        </div>
      );
    }

    case "matrix": {
      const ans = (value && typeof value === "object" ? value : {}) as Record<string, string>;
      const cols = c.columns ?? [];
      return (
        <div className="space-y-4">
          {(c.rows ?? []).map((r) => (
            <div key={r.id} className="space-y-1.5">
              <div className="text-sm font-medium text-slate-800">{r.label}</div>
              <Scale
                ariaLabel={r.label}
                items={cols.map((o) => ({ id: o.id, top: String(o.points), bottom: o.label }))}
                value={ans[r.id]}
                onChange={(colId) => onChange({ ...ans, [r.id]: colId })}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      );
    }

    case "yes_no":
      return (
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          <Choice selected={value === true} disabled={disabled} onClick={() => onChange(true)}>
            {c.yesLabel || "Sí"}
          </Choice>
          <Choice selected={value === false} disabled={disabled} onClick={() => onChange(false)}>
            {c.noLabel || "No"}
          </Choice>
        </div>
      );

    case "datetime": {
      const type = c.mode === "time" ? "time" : c.mode === "datetime" ? "datetime-local" : "date";
      return (
        <input
          id={id}
          type={type}
          className={cn(base, "max-w-72")}
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    }

    case "signature":
      return <SignaturePad value={value as string | undefined} onChange={onChange} disabled={disabled} />;

    case "file":
      return <FileInput field={field} value={value as FileValue | undefined} onChange={onChange} disabled={disabled} upload={upload} />;

    default:
      return null;
  }
}

const ACCEPT: Record<string, string> = {
  image: "image/*",
  pdf: "application/pdf",
  any: "image/*,application/pdf,.doc,.docx,.ppt,.pptx,.zip",
};

function FileInput({
  field,
  value,
  onChange,
  disabled,
  upload,
}: {
  field: FormField;
  value: FileValue | undefined;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  upload?: UploadFn;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = ACCEPT[field.config.accept ?? "image"] ?? ACCEPT.image;

  if (!upload)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
        <FileUp className="size-5" /> El evaluador podrá subir un archivo o tomar una foto.
      </div>
    );

  return (
    <div className="space-y-2">
      {value?.path ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <Paperclip className="size-4 text-slate-500" />
          <span className="min-w-0 flex-1 truncate">{value.name}</span>
          {!disabled && (
            <button type="button" className="text-red-600 hover:underline" onClick={() => onChange(undefined)}>
              Quitar
            </button>
          )}
        </div>
      ) : (
        <label
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-base text-slate-700",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" />}
          {loading ? "Subiendo…" : field.config.accept === "image" || !field.config.accept ? "Tomar o elegir foto" : "Elegir archivo"}
          <input
            type="file"
            accept={accept}
            className="sr-only"
            disabled={disabled || loading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) return setError("El archivo debe pesar menos de 10 MB.");
              setError(null);
              setLoading(true);
              try {
                onChange(await upload(file, field));
              } catch (err) {
                setError((err as Error).message || "No se pudo subir el archivo.");
              } finally {
                setLoading(false);
              }
            }}
          />
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
