"use client";

import { AlertTriangle, CheckCircle2, Download, FileUp, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CSV_TYPE_NAMES, downloadText, parseFormCsv, templateCsv, type CsvParseResult } from "@/lib/fields/csv";
import { fieldTypeInfo } from "@/lib/fields/registry";
import { isLayout } from "@/lib/fields/types";
import type { FormField } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMN_HELP: [string, string][] = [
  ["tipo", "Tipo de pregunta (ver lista abajo). Obligatoria."],
  ["pregunta", "Texto de la pregunta o criterio. Obligatoria."],
  ["descripcion", "Ayuda que aparece debajo de la pregunta."],
  ["obligatoria", "si / no"],
  ["puntua", "si / no — ¿cuenta para el puntaje?"],
  ["ponderacion", "Porcentaje del criterio, ej. 25. Si lo dejas vacío en todos, se reparte igual."],
  ["opciones", "Opciones o niveles separados con | (ej. Deficiente|Regular|Bueno)"],
  ["puntos", "Puntos de cada opción separados con | (ej. 1|2|3). Opcional."],
  ["filas", "Solo para matriz: criterios separados con |"],
  ["minimo / maximo", "Para número, escala (ej. 0 y 10) y estrellas (maximo = número de estrellas)"],
  ["etiqueta_minimo / etiqueta_maximo", "Solo para escala: textos de los extremos"],
];

export function CsvImport({
  formId,
  hasFields,
  onImport,
  onClose,
}: {
  formId: string;
  hasFields: boolean;
  onImport: (fields: FormField[], mode: "append" | "replace") => void;
  onClose: () => void;
}) {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"append" | "replace">(hasFields ? "append" : "replace");
  const [showGuide, setShowGuide] = useState(false);

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    setResult(parseFormCsv(text, formId));
  }

  const errors = result?.issues.filter((i) => i.level === "error") ?? [];
  const warnings = result?.issues.filter((i) => i.level === "warning") ?? [];
  const scoredWeight = result?.fields.filter((f) => f.scored).reduce((a, f) => a + f.weight, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          <strong>1.</strong> Descarga la plantilla y ábrela en Excel o Google Sheets. Trae la rúbrica de ejemplo y otros tipos de
          pregunta.
        </p>
        <p>
          <strong>2.</strong> Escribe <strong>una pregunta por fila</strong>. Separa las opciones con una barra vertical{" "}
          <code className="rounded bg-white px-1">|</code> (en el teclado: Alt Gr + 1, o la tecla a la izquierda del 1).
        </p>
        <p>
          <strong>3.</strong> Guarda como <em>CSV UTF-8 (delimitado por comas)</em> y súbelo aquí.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => downloadText("plantilla-formulario.csv", templateCsv())}>
            <Download className="size-4" /> Descargar plantilla
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? "Ocultar guía" : "Ver guía de columnas y tipos"}
          </Button>
        </div>
      </div>

      {showGuide && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Columnas</h3>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {COLUMN_HELP.map(([k, v]) => (
                <div key={k} className="px-3 py-1.5">
                  <dt className="font-mono text-xs font-semibold text-slate-800">{k}</dt>
                  <dd className="text-slate-600">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Valores para la columna “tipo”</h3>
            <dl className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-sm">
              {CSV_TYPE_NAMES.map((t) => (
                <div key={t.key} className="px-3 py-1.5">
                  <dt className="font-mono text-xs font-semibold text-slate-800">{t.key}</dt>
                  <dd className="text-slate-600">{t.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-6 text-center hover:border-slate-400">
        <FileUp className="size-8 text-slate-400" />
        <span className="text-sm font-medium text-slate-800">{fileName || "Selecciona tu archivo .csv"}</span>
        {fileName && <span className="text-xs text-slate-500">Haz clic para elegir otro</span>}
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) handleFile(f);
          }}
        />
      </label>

      {result && (
        <div className="space-y-3">
          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
              <p className="flex items-center gap-1.5 font-medium">
                <XCircle className="size-4" /> {errors.length} {errors.length === 1 ? "fila no se pudo" : "filas no se pudieron"} leer
                (no se importarán):
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-6">
                {errors.map((e, i) => (
                  <li key={i}>
                    {e.row > 1 ? `Fila ${e.row}: ` : ""}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="size-4" /> Avisos:
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-6">
                {warnings.map((w, i) => (
                  <li key={i}>
                    Fila {w.row}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.fields.length > 0 && (
            <>
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
                <CheckCircle2 className="size-4 text-emerald-600" />
                {result.fields.length === 1 ? "1 elemento listo" : `${result.fields.length} elementos listos`} para importar
                {result.fields.some((f) => f.scored) && (
                  <Badge tone={Math.round(scoredWeight) === 100 ? "green" : "amber"}>Ponderación total: {Math.round(scoredWeight * 100) / 100}%</Badge>
                )}
              </p>
              <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Pregunta</th>
                      <th className="px-3 py-2">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.fields.map((f, i) => (
                      <tr key={f.id} className={cn(isLayout(f.type) && "bg-slate-50/60 text-slate-500")}>
                        <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="whitespace-nowrap px-3 py-1.5">{fieldTypeInfo(f.type).label}</td>
                        <td className="px-3 py-1.5 font-medium">{f.label || "—"}</td>
                        <td className="px-3 py-1.5 text-xs text-slate-500">
                          {[
                            f.required && "Obligatoria",
                            f.scored && `Puntúa ${f.weight}%`,
                            f.config.options && `${f.config.options.length} opciones`,
                            f.config.rows && `${f.config.rows.length} filas × ${f.config.columns?.length} niveles`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasFields && (
                <fieldset className="space-y-1.5 text-sm">
                  <legend className="mb-1 font-medium text-slate-800">El formulario ya tiene preguntas:</legend>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="mode" checked={mode === "append"} onChange={() => setMode("append")} className="size-4" />
                    Agregar las preguntas importadas al final
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="size-4" />
                    Reemplazar todas las preguntas actuales
                  </label>
                </fieldset>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!result?.fields.length}
          onClick={() => {
            if (mode === "replace" && hasFields && !window.confirm("¿Reemplazar todas las preguntas actuales del formulario?")) return;
            onImport(result!.fields, mode);
          }}
        >
          Importar {result?.fields.length || ""} {result?.fields.length === 1 ? "elemento" : "elementos"}
        </Button>
      </div>
    </div>
  );
}
