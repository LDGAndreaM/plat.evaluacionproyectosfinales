"use client";

import { Copy, FileUp, Loader2, MousePointerClick, PencilRuler, Play, Shuffle, Trash2, Upload, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { generateWordSearch } from "@/lib/tools/wordsearch";
import { newSeed } from "@/lib/tools/text";
import { gradeWorksheet } from "@/lib/worksheet/grading";
import { GRADED_TYPES, WS_INFO, WS_ORDER, newElement, type WorksheetData, type WsAnswers, type WsElement, type WsType } from "@/lib/worksheet/types";
import { filesToPages, uploadAsset } from "@/lib/worksheet/upload";
import { cn } from "@/lib/utils";
import { WS_COLORS, WS_ICONS } from "./icons";
import { WorksheetPlayer, boxStyle, cropStyle } from "./player";
import { WorksheetResults } from "./results";

const LANGS = [
  ["es-MX", "Español (México)"],
  ["en-US", "Inglés (EE. UU.)"],
  ["en-GB", "Inglés (Reino Unido)"],
  ["fr-FR", "Francés"],
  ["pt-BR", "Portugués"],
  ["it-IT", "Italiano"],
  ["de-DE", "Alemán"],
];

/* --------------------------- Paso 1: crear --------------------------- */

function Setup({ data, onChange }: { data: WorksheetData; onChange: (d: WorksheetData) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  async function convert() {
    setError(null);
    try {
      const pages = await filesToPages(files, setBusy);
      onChange({ ...data, pages });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Nueva ficha interactiva</h2>
        <p className="text-sm text-slate-500">
          Escribe el nombre arriba, completa estos datos y sube tu PDF. Después podrás colocar respuestas encima de cada página.
        </p>
      </div>
      <Field label="Instrucciones" htmlFor="ws-ins" hint="Las verá el alumno antes de empezar.">
        <Textarea id="ws-ins" rows={3} value={data.instructions} onChange={(e) => onChange({ ...data, instructions: e.target.value })} placeholder="Lee con atención y completa la ficha." />
      </Field>
      <Field label="Tema" htmlFor="ws-topic">
        <Input id="ws-topic" value={data.topic} onChange={(e) => onChange({ ...data, topic: e.target.value })} placeholder="Ej. Teoría del color" />
      </Field>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center hover:border-slate-400">
        <FileUp className="size-9 text-slate-400" />
        <span className="font-medium text-slate-800">{files.length ? files.map((f) => f.name).join(", ") : "Selecciona tu PDF"}</span>
        <span className="text-xs text-slate-500">PDF de hasta 20 páginas, o imágenes JPG/PNG (una por página).</span>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <Button className="w-full" size="lg" disabled={!files.length || !!busy} onClick={convert}>
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
        {busy ?? "Subir y continuar"}
      </Button>
    </div>
  );
}

/* ------------------------ Panel de propiedades ----------------------- */

function lines(v: string) {
  return v.split(/\r?\n/).map((s) => s.trim());
}

function Props({
  el,
  data,
  update,
  remove,
  duplicate,
}: {
  el: WsElement;
  data: WorksheetData;
  update: (patch: Partial<WsElement>) => void;
  remove: () => void;
  duplicate: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const Icon = WS_ICONS[el.type];
  const graded = GRADED_TYPES.includes(el.type);

  async function upload(file: File) {
    setUploading(true);
    try {
      const url = await uploadAsset(file, file.name, el.type === "mp3" ? "audio" : "presentaciones");
      update({ url, fileName: file.name });
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg text-white" style={{ background: WS_COLORS[el.type] }}>
          <Icon className="size-4" />
        </span>
        <div>
          <div className="font-semibold text-slate-900">{WS_INFO[el.type].label}</div>
          <div className="text-xs text-slate-500">{WS_INFO[el.type].hint}</div>
        </div>
      </div>

      {el.type === "textfield" && (
        <>
          <Field label="Respuestas correctas" hint="Una por línea. Se aceptan sin importar acentos ni signos.">
            <Textarea rows={3} value={(el.answers ?? []).join("\n")} onChange={(e) => update({ answers: lines(e.target.value) })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={!!el.caseSensitive} onChange={(e) => update({ caseSensitive: e.target.checked })} />
            Distinguir mayúsculas y minúsculas
          </label>
        </>
      )}

      {el.type === "single" && (
        <>
          <Field label="Grupo" hint="Las casillas con el mismo grupo forman una pregunta (el alumno elige solo una).">
            <Input value={el.group ?? ""} onChange={(e) => update({ group: e.target.value })} className="h-9" />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4" checked={!!el.correct} onChange={(e) => update({ correct: e.target.checked })} />
            Esta es la respuesta correcta
          </label>
        </>
      )}

      {el.type === "checkbox" && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4" checked={el.checked !== false} onChange={(e) => update({ checked: e.target.checked })} />
          Esta casilla debe marcarse
        </label>
      )}

      {el.type === "select" && (
        <>
          <Field label="Opciones (una por línea)">
            <Textarea rows={4} value={(el.options ?? []).join("\n")} onChange={(e) => update({ options: e.target.value.split(/\r?\n/) })} />
          </Field>
          <Field label="Respuesta correcta">
            <Select value={el.correctIndex ?? 0} onChange={(e) => update({ correctIndex: Number(e.target.value) })} className="h-9">
              {(el.options ?? []).map((o, i) => (
                <option key={i} value={i}>
                  {o || `Opción ${i + 1}`}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {el.type === "wordsearch" && (
        <>
          <Field label="Palabras (una por línea)">
            <Textarea
              rows={5}
              value={(el.words ?? []).join("\n")}
              onChange={(e) => {
                const words = e.target.value.split(/\r?\n/);
                const clean = words.map((w) => w.trim()).filter(Boolean);
                update({
                  words,
                  result: clean.length ? generateWordSearch(clean, { size: 0, diagonal: true, backwards: false, removeAccents: true, seed: el.seed ?? 1 }) : null,
                });
              }}
            />
          </Field>
          {el.result?.unplaced.length ? <p className="text-xs text-amber-700">No cupieron: {el.result.unplaced.join(", ")}</p> : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const seed = newSeed();
              const clean = (el.words ?? []).map((w) => w.trim()).filter(Boolean);
              update({ seed, result: clean.length ? generateWordSearch(clean, { size: 0, diagonal: true, backwards: false, removeAccents: true, seed }) : null });
            }}
          >
            <Shuffle className="size-4" /> Nueva distribución
          </Button>
        </>
      )}

      {el.type === "speak" && (
        <>
          <Field label="Respuestas aceptadas" hint="Una por línea. El alumno presiona el micrófono y la dice en voz alta.">
            <Textarea rows={3} value={(el.answers ?? []).join("\n")} onChange={(e) => update({ answers: lines(e.target.value) })} />
          </Field>
          <Field label="Idioma">
            <Select value={el.lang ?? "es-MX"} onChange={(e) => update({ lang: e.target.value })} className="h-9">
              {LANGS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-slate-500">Funciona en Chrome y Edge. En otros navegadores, el alumno podrá escribir su respuesta.</p>
        </>
      )}

      {el.type === "drag" && (
        <>
          <Field label="Clave" hint="La zona de Soltar que acepte esta clave será la correcta.">
            <Input value={el.key ?? ""} onChange={(e) => update({ key: e.target.value })} className="h-9" />
          </Field>
          <Field label="Texto de la pieza (opcional)" hint="Si lo dejas vacío, la pieza será la parte de la ficha que cubre el recuadro.">
            <Input value={el.label ?? ""} onChange={(e) => update({ label: e.target.value })} className="h-9" />
          </Field>
        </>
      )}

      {el.type === "drop" && (
        <Field label="Acepta las claves" hint="Separadas por coma. Ej. 1 o perro, gato.">
          <Input value={(el.accepts ?? []).join(", ")} onChange={(e) => update({ accepts: e.target.value.split(",").map((s) => s.trim()) })} className="h-9" />
        </Field>
      )}

      {el.type === "join" && (
        <Field label="Clave de la pareja" hint="Pon la misma clave a los dos puntos que deben unirse (en la misma página).">
          <Input value={el.key ?? ""} onChange={(e) => update({ key: e.target.value })} className="h-9" />
        </Field>
      )}

      {el.type === "mp3" && (
        <>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-3 text-sm hover:border-slate-400">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {el.fileName ? `Cambiar audio (${el.fileName})` : "Subir audio (MP3, M4A, WAV)"}
            <input type="file" accept="audio/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {el.url && <audio src={el.url} controls className="w-full" />}
        </>
      )}

      {el.type === "open" && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">La calificas tú en la pestaña “Respuestas”.</p>}

      {el.type === "text" && (
        <>
          <Field label="Texto">
            <Textarea rows={3} value={el.text ?? ""} onChange={(e) => update({ text: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Tamaño">
              <Input type="number" min={8} max={72} value={el.fontSize ?? 16} onChange={(e) => update({ fontSize: Number(e.target.value) || 16 })} className="h-9" />
            </Field>
            <Field label="Color">
              <input type="color" value={el.color || "#0f172a"} onChange={(e) => update({ color: e.target.value })} className="h-9 w-full rounded border border-slate-300" />
            </Field>
            <Field label="Fondo">
              <input type="color" value={el.bg || "#ffffff"} onChange={(e) => update({ bg: e.target.value })} className="h-9 w-full rounded border border-slate-300" />
            </Field>
          </div>
          {el.bg && (
            <button type="button" className="text-xs text-slate-500 underline" onClick={() => update({ bg: "" })}>
              Quitar fondo
            </button>
          )}
        </>
      )}

      {el.type === "listening" && (
        <>
          <Field label="Texto que se leerá en voz alta">
            <Textarea rows={3} value={el.text ?? ""} onChange={(e) => update({ text: e.target.value })} />
          </Field>
          <Field label="Idioma">
            <Select value={el.lang ?? "es-MX"} onChange={(e) => update({ lang: e.target.value })} className="h-9">
              {LANGS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {el.type === "link" && (
        <>
          <Field label="Dirección (URL)">
            <Input value={el.url ?? ""} onChange={(e) => update({ url: e.target.value })} className="h-9" placeholder="https://" />
          </Field>
          <Field label="Texto visible (opcional)">
            <Input value={el.label ?? ""} onChange={(e) => update({ label: e.target.value })} className="h-9" />
          </Field>
        </>
      )}

      {el.type === "powerpoint" && (
        <>
          <Field label="Enlace de la presentación" hint="Google Slides, OneDrive o un archivo .pptx público.">
            <Input value={el.url ?? ""} onChange={(e) => update({ url: e.target.value, fileName: undefined })} className="h-9" placeholder="https://" />
          </Field>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-3 text-sm hover:border-slate-400">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {el.fileName ? `Cambiar archivo (${el.fileName})` : "O sube un archivo .pptx"}
            <input
              type="file"
              accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
        </>
      )}

      {el.type === "youtube" && (
        <>
          <Field label="Enlace del video">
            <Input value={el.url ?? ""} onChange={(e) => update({ url: e.target.value })} className="h-9" placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
          <Field label="Empezar en el segundo">
            <Input type="number" min={0} value={el.start ?? 0} onChange={(e) => update({ start: Number(e.target.value) || 0 })} className="h-9" />
          </Field>
        </>
      )}

      {graded && (
        <Field label="Puntos" hint="Dale más valor a las preguntas importantes.">
          <Input type="number" min={0} max={100} step="0.5" value={el.points} onChange={(e) => update({ points: Math.max(0, Number(e.target.value) || 0) })} className="h-9 max-w-28" />
        </Field>
      )}

      {data.pages.length > 1 && (
        <Field label="Página">
          <Select value={el.page} onChange={(e) => update({ page: Number(e.target.value) })} className="h-9">
            {data.pages.map((_, i) => (
              <option key={i} value={i}>
                Página {i + 1}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="flex gap-2 border-t border-slate-100 pt-3">
        <Button size="sm" variant="secondary" onClick={duplicate}>
          <Copy className="size-4" /> Duplicar
        </Button>
        <Button size="sm" variant="ghost" onClick={remove}>
          <Trash2 className="size-4 text-red-600" /> Eliminar
        </Button>
      </div>
      <p className="text-xs text-slate-400">Atajos: flechas para mover, Supr para eliminar, Ctrl+D para duplicar.</p>
    </div>
  );
}

/* ----------------------- Vista del elemento en editor ---------------------- */

function EditorBox({ el, data }: { el: WsElement; data: WorksheetData }) {
  const Icon = WS_ICONS[el.type];
  const color = WS_COLORS[el.type];
  const page = data.pages[el.page];
  const small = el.w < 0.06 || el.h < 0.03;
  let content: string | null = null;
  if (el.type === "textfield") content = (el.answers ?? []).filter(Boolean)[0] ?? "";
  if (el.type === "select") content = el.options?.[el.correctIndex ?? 0] ?? "";
  if (el.type === "text") content = el.text ?? "";
  if (el.type === "link") content = el.label || el.url || "";
  if (el.type === "drop") content = (el.accepts ?? []).filter(Boolean).join(", ");
  if (el.type === "drag") content = el.label || "";
  if (el.type === "join" || el.type === "single") content = el.type === "single" ? el.group ?? "" : el.key ?? "";
  if (el.type === "speak") content = (el.answers ?? []).filter(Boolean)[0] ?? "";

  if (el.type === "drag" && !el.label && page)
    return <div className="h-full w-full rounded-sm border-2" style={{ borderColor: color, ...cropStyle(el, page) }} />;

  return (
    <div
      className={cn(
        "flex h-full w-full items-center gap-1 overflow-hidden border-2 px-0.5 text-[11px] font-medium",
        el.type === "single" || el.type === "join" || el.type === "mp3" || el.type === "listening" ? "justify-center rounded-full" : "rounded-sm",
      )}
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} ${el.type === "text" ? 6 : 14}%, transparent)`, color }}
    >
      {!small && <Icon className="size-3.5 shrink-0" />}
      {small ? (
        <span className="truncate text-[9px] font-bold">{content || ""}</span>
      ) : (
        <span className="truncate">
          {el.type === "single" && el.correct ? "✓ " : ""}
          {el.type === "checkbox" ? (el.checked !== false ? "✓ marcar" : "✗ no marcar") : content || WS_INFO[el.type].label}
        </span>
      )}
    </div>
  );
}

/* ------------------------------- Editor ------------------------------- */

type Mode = "design" | "test" | "results";

export function WorksheetEditor({
  data,
  onChange,
  toolId,
  title,
}: {
  data: WorksheetData;
  onChange: (d: WorksheetData) => void;
  toolId: string | null;
  title: string;
}) {
  const [mode, setMode] = useState<Mode>("design");
  const [selected, setSelected] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<WsAnswers>({});
  const [checked, setChecked] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const action = useRef<{ id: string; kind: "move" | "resize"; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; rect: DOMRect } | null>(null);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const updateEl = useCallback(
    (id: string, patch: Partial<WsElement>) => {
      const d = dataRef.current;
      onChange({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
    },
    [onChange],
  );

  const addElement = useCallback(
    (type: WsType, page: number, x: number, y: number) => {
      const el = newElement(type, page, x, y);
      const d = dataRef.current;
      // En "Opción única", seguir el último grupo usado
      if (type === "single") {
        const last = [...d.elements].reverse().find((e) => e.type === "single");
        if (last) el.group = last.group;
      }
      onChange({ ...d, elements: [...d.elements, el] });
      setSelected(el.id);
    },
    [onChange],
  );

  const removeEl = useCallback(
    (id: string) => {
      const d = dataRef.current;
      onChange({ ...d, elements: d.elements.filter((e) => e.id !== id) });
      setSelected(null);
    },
    [onChange],
  );

  const duplicateEl = useCallback(
    (id: string) => {
      const d = dataRef.current;
      const el = d.elements.find((e) => e.id === id);
      if (!el) return;
      const copy = { ...el, id: crypto.randomUUID().slice(0, 8), x: Math.min(1 - el.w, el.x + 0.02), y: Math.min(1 - el.h, el.y + 0.02) };
      onChange({ ...d, elements: [...d.elements, copy] });
      setSelected(copy.id);
    },
    [onChange],
  );

  // Mover y redimensionar con el puntero
  useEffect(() => {
    function move(e: PointerEvent) {
      const a = action.current;
      if (!a) return;
      const dx = (e.clientX - a.sx) / a.rect.width;
      const dy = (e.clientY - a.sy) / a.rect.height;
      if (a.kind === "move") {
        updateEl(a.id, { x: Math.max(0, Math.min(1 - a.ow, a.ox + dx)), y: Math.max(0, Math.min(1 - a.oh, a.oy + dy)) });
      } else {
        updateEl(a.id, { w: Math.max(0.012, Math.min(1 - a.ox, a.ow + dx)), h: Math.max(0.01, Math.min(1 - a.oy, a.oh + dy)) });
      }
    }
    function up() {
      action.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [updateEl]);

  // Atajos de teclado
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (mode !== "design" || !selected) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const el = dataRef.current.elements.find((x) => x.id === selected);
      if (!el) return;
      const step = e.shiftKey ? 0.01 : 0.002;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeEl(el.id);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateEl(el.id);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateEl(el.id, { x: Math.max(0, Math.min(1 - el.w, el.x + dx)), y: Math.max(0, Math.min(1 - el.h, el.y + dy)) });
      } else if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [mode, selected, removeEl, duplicateEl, updateEl]);

  if (!data.pages.length) return <Setup data={data} onChange={onChange} />;

  const sel = data.elements.find((e) => e.id === selected) ?? null;
  const testGrade = checked ? gradeWorksheet(data.elements, testAnswers) : null;
  const totalPoints = gradeWorksheet(data.elements, {}).max;

  function visiblePage() {
    const mid = window.innerHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    pageRefs.current.forEach((p, i) => {
      if (!p) return;
      const r = p.getBoundingClientRect();
      const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const r = pageRefs.current[best]?.getBoundingClientRect();
    const y = r ? Math.max(0.05, Math.min(0.95, (mid - r.top) / r.height)) : 0.2;
    return { page: best, y };
  }

  const tabs: { id: Mode; label: string; icon: typeof Play }[] = [
    { id: "design", label: "Diseñar", icon: PencilRuler },
    { id: "test", label: "Probar como alumno", icon: Play },
    { id: "results", label: "Respuestas", icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => setMode(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
                mode === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
              )}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-slate-500">
          {data.pages.length} página(s) · {data.elements.length} elementos · {totalPoints} puntos
        </span>
      </div>

      {mode === "test" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
            Contesta como si fueras alumno. Nada se guarda.
            <span className="ml-auto flex gap-2">
              {testGrade && (
                <Badge tone="violet">
                  Calificación: {testGrade.score} / {testGrade.max}
                </Badge>
              )}
              <Button size="sm" onClick={() => setChecked(true)}>
                Calificar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => (setTestAnswers({}), setChecked(false))}>
                Reiniciar
              </Button>
            </span>
          </div>
          <WorksheetPlayer data={data} answers={testAnswers} onAnswers={(a) => (setTestAnswers(a), setChecked(false))} grade={testGrade} reveal={checked} />
        </div>
      )}

      {mode === "results" &&
        (toolId ? (
          <WorksheetResults toolId={toolId} data={data} title={title} />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Guarda la ficha y compártela para empezar a recibir respuestas.
          </p>
        ))}

      {mode === "design" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[190px_minmax(0,1fr)_300px]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Agregar elemento</div>
            <p className="mb-2 text-xs text-slate-500">Arrastra a la página o haz clic.</p>
            <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
              {WS_ORDER.map((t) => {
                const Icon = WS_ICONS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("application/x-ws-type", t)}
                    onClick={() => {
                      // Escalonar para que los elementos agregados con clic no queden encimados
                      const { page, y } = visiblePage();
                      const n = data.elements.filter((e) => e.page === page).length % 8;
                      addElement(t, page, 0.35 + n * 0.04, Math.min(0.9, y - 0.12 + n * 0.05));
                    }}
                    title={WS_INFO[t].hint}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-sm text-slate-700 hover:border-slate-400"
                  >
                    <Icon className="size-4 shrink-0" style={{ color: WS_COLORS[t] }} />
                    <span className="truncate">{WS_INFO[t].label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 space-y-4" onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}>
            {data.pages.map((page, pi) => (
              <div key={pi}>
                <div className="mb-1 text-xs font-medium text-slate-500">Página {pi + 1}</div>
                <div
                  ref={(n) => {
                    pageRefs.current[pi] = n;
                  }}
                  className="relative mx-auto w-full max-w-[1000px] select-none overflow-hidden rounded-lg bg-white shadow"
                  style={{ aspectRatio: `${page.width} / ${page.height}` }}
                  onPointerDown={(e) => {
                    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "IMG") setSelected(null);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const t = e.dataTransfer.getData("application/x-ws-type") as WsType;
                    if (!t) return;
                    e.preventDefault();
                    const r = e.currentTarget.getBoundingClientRect();
                    addElement(t, pi, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.url} alt={`Página ${pi + 1}`} className="absolute inset-0 h-full w-full" draggable={false} />
                  {data.elements
                    .filter((el) => el.page === pi)
                    .map((el) => (
                      <div
                        key={el.id}
                        className={cn("absolute cursor-move touch-none", selected === el.id && "z-10 outline outline-2 outline-offset-1 outline-violet-600")}
                        style={boxStyle(el)}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setSelected(el.id);
                          const rect = pageRefs.current[pi]!.getBoundingClientRect();
                          action.current = { id: el.id, kind: "move", sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h, rect };
                        }}
                      >
                        <EditorBox el={el} data={data} />
                        {selected === el.id && (
                          <span
                            className="absolute -bottom-1.5 -right-1.5 size-3 cursor-nwse-resize rounded-sm border border-white bg-violet-600"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              const rect = pageRefs.current[pi]!.getBoundingClientRect();
                              action.current = { id: el.id, kind: "resize", sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h, rect };
                            }}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </section>

          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {sel ? (
                <Props
                  key={sel.id}
                  el={sel}
                  data={data}
                  update={(patch) => updateEl(sel.id, patch)}
                  remove={() => removeEl(sel.id)}
                  duplicate={() => duplicateEl(sel.id)}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <MousePointerClick className="mt-0.5 size-4 shrink-0" />
                    Arrastra un elemento sobre la página. Selecciónalo para editar su respuesta; arrastra la esquina para cambiar el tamaño.
                  </div>
                  <Field label="Instrucciones" htmlFor="ws-ins2">
                    <Textarea id="ws-ins2" rows={3} value={data.instructions} onChange={(e) => onChange({ ...data, instructions: e.target.value })} />
                  </Field>
                  <Field label="Tema" htmlFor="ws-topic2">
                    <Input id="ws-topic2" value={data.topic} onChange={(e) => onChange({ ...data, topic: e.target.value })} className="h-9" />
                  </Field>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4" checked={data.showCorrection} onChange={(e) => onChange({ ...data, showCorrection: e.target.checked })} />
                    <span>
                      Al terminar, mostrar al alumno qué contestó bien y mal
                      <span className="block text-xs text-slate-500">La calificación siempre se le muestra.</span>
                    </span>
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm("¿Reemplazar el PDF? Los elementos se conservan en sus posiciones.")) onChange({ ...data, pages: [] });
                    }}
                  >
                    <FileUp className="size-4" /> Reemplazar PDF
                  </Button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
