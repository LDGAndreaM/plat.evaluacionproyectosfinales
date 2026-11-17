"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardPaste, Copy, Loader2, Plus, Printer, Save, Share2, Shuffle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { CrosswordBoard, CrosswordSheet } from "@/components/tools/crossword-board";
import { PrintArea, printNow } from "@/components/tools/print";
import { WheelTool } from "@/components/tools/wheel";
import { WordSearchBoard, WordSearchSheet } from "@/components/tools/wordsearch-board";
import { qrDataUrl } from "@/lib/qr";
import { generateCrossword, parseEntries, type CrosswordEntry } from "@/lib/tools/crossword";
import { newSeed } from "@/lib/tools/text";
import { TOOL_INFO, defaultData, type CrosswordData, type TeacherTool, type ToolData, type ToolKind, type WheelData, type WordSearchData } from "@/lib/tools/types";
import { generateWordSearch } from "@/lib/tools/wordsearch";
import { useOrigin } from "@/lib/use-origin";
import { cn } from "@/lib/utils";
import { deleteTool, duplicateTool, saveTool, setToolPublic } from "./actions";

export function ToolEditor({ tool, kind }: { tool: TeacherTool | null; kind: ToolKind }) {
  const router = useRouter();
  const info = TOOL_INFO[kind];
  const [id, setId] = useState<string | null>(tool?.id ?? null);
  const [title, setTitle] = useState(tool?.title ?? info.defaultTitle);
  const [data, setData] = useState<ToolData>(tool?.data ?? defaultData(kind));
  const [saved, setSaved] = useState(() => JSON.stringify({ title: tool?.title ?? null, data: tool?.data ?? null }));
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [withAnswers, setWithAnswers] = useState(true);
  const dirty = JSON.stringify({ title, data }) !== saved;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function save() {
    setStatus(null);
    startSaving(async () => {
      const res = await saveTool({ id, kind, title, data });
      if (!res.ok) return setStatus({ ok: false, text: res.error });
      setSaved(JSON.stringify({ title, data }));
      setStatus({ ok: true, text: "Guardado" });
      if (!id) {
        setId(res.id);
        router.replace(`/herramientas/${res.id}`);
      }
    });
  }

  const canPrint =
    (kind === "wordsearch" && !!(data as WordSearchData).result?.placements.length) ||
    (kind === "crossword" && !!(data as CrosswordData).result?.placements.length);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/herramientas" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="size-4" /> Herramientas
        </Link>
        <Badge tone="violet">{info.name}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          aria-label="Título"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-2xl font-semibold text-slate-900 hover:border-slate-200 focus:border-slate-300 focus:bg-white focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            <span className={cn("inline-flex items-center gap-1 text-sm", status.ok ? "text-emerald-700" : "text-red-700")}>
              {status.ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />} {status.text}
            </span>
          )}
          {dirty && !saving && <span className="text-sm text-amber-700">Sin guardar</span>}
          {canPrint && (
            <Button variant="secondary" size="sm" onClick={() => setPrintOpen(true)}>
              <Printer className="size-4" /> Imprimir
            </Button>
          )}
          {id && (
            <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" /> Compartir
            </Button>
          )}
          {id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (dirty && !window.confirm("Hay cambios sin guardar que no se copiarán. ¿Duplicar de todos modos?")) return;
                startSaving(async () => {
                  await duplicateTool(id);
                });
              }}
            >
              <Copy className="size-4" /> Duplicar
            </Button>
          )}
          {id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!window.confirm(`¿Eliminar “${title}”? No se puede deshacer.`)) return;
                startSaving(async () => {
                  const res = await deleteTool(id);
                  if (res?.ok) {
                    setSaved(JSON.stringify({ title, data }));
                    router.push("/herramientas");
                  }
                });
              }}
            >
              <Trash2 className="size-4 text-red-600" /> Eliminar
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving || (!dirty && !!id)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar
          </Button>
        </div>
      </div>

      {kind === "wheel" && <WheelTool data={data as WheelData} onChange={setData} canEdit title={title} />}
      {kind === "wordsearch" && <WordSearchEditor data={data as WordSearchData} onChange={setData} />}
      {kind === "crossword" && <CrosswordEditor data={data as CrosswordData} onChange={setData} />}

      {/* Impresión */}
      <Modal open={printOpen} onClose={() => setPrintOpen(false)} title="Imprimir hoja de trabajo">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Se imprime en tamaño carta con espacio para nombre y fecha. En la ventana de impresión también puedes elegir “Guardar como
            PDF”.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} />
            Incluir una hoja de respuestas al final
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPrintOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setPrintOpen(false);
                setTimeout(printNow, 150);
              }}
            >
              <Printer className="size-4" /> Imprimir
            </Button>
          </div>
        </div>
      </Modal>
      <PrintArea>
        {kind === "wordsearch" && (data as WordSearchData).result && (
          <WordSearchSheet
            title={title}
            instructions={(data as WordSearchData).instructions}
            result={(data as WordSearchData).result!}
            withAnswers={withAnswers}
          />
        )}
        {kind === "crossword" && (data as CrosswordData).result && (
          <CrosswordSheet
            title={title}
            instructions={(data as CrosswordData).instructions}
            result={(data as CrosswordData).result!}
            withAnswers={withAnswers}
          />
        )}
      </PrintArea>

      {id && tool !== undefined && (
        <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Compartir con estudiantes">
          <SharePanel id={id} initialPublic={tool?.is_public ?? false} code={tool?.share_code} kind={kind} dirty={dirty} />
        </Modal>
      )}
    </div>
  );
}

function SharePanel({
  id,
  initialPublic,
  code,
  kind,
  dirty,
}: {
  id: string;
  initialPublic: boolean;
  code?: string;
  kind: ToolKind;
  dirty: boolean;
}) {
  const origin = useOrigin();
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [qr, setQr] = useState<string | null>(null);
  const [, start] = useTransition();
  const link = code ? `${origin}/h/${code}` : "";

  useEffect(() => {
    let alive = true;
    if (isPublic && link) qrDataUrl(link, 400).then((u) => alive && setQr(u));
    return () => {
      alive = false;
    };
  }, [isPublic, link]);

  if (!code)
    return (
      <p className="text-sm text-slate-600">
        Recarga la página para obtener el enlace para compartir.{" "}
        <button className="text-violet-700 underline" onClick={() => router.refresh()}>
          Recargar
        </button>
      </p>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {kind === "wheel"
          ? "Con el enlace, cualquiera puede ver y girar esta ruleta (sin poder cambiar la tuya)."
          : "Con el enlace, tus estudiantes pueden resolverlo desde su celular o computadora, sin crear cuenta."}
      </p>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4"
          checked={isPublic}
          onChange={(e) => {
            const next = e.target.checked;
            setIsPublic(next);
            start(async () => {
              const res = await setToolPublic(id, next);
              if (!res?.ok) setIsPublic(!next);
            });
          }}
        />
        Permitir el acceso con enlace
      </label>
      {isPublic && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt="Código QR del enlace" className="size-36 rounded-lg border border-slate-200" />}
          <div className="min-w-0 flex-1 space-y-2">
            <code className="block break-all rounded-lg bg-slate-100 px-3 py-2 text-sm">{link}</code>
            <CopyButton value={link} label="Copiar enlace" />
            {dirty && <p className="text-xs text-amber-700">Guarda tus cambios para que el enlace muestre la versión más reciente.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Sopa de letras ---------------- */

function WordSearchEditor({ data, onChange }: { data: WordSearchData; onChange: (d: ToolData) => void }) {
  const [text, setText] = useState(data.words.join("\n"));

  function regenerate(next: WordSearchData) {
    const result = next.words.length ? generateWordSearch(next.words, next.options) : null;
    onChange({ ...next, result });
  }
  function setOption<K extends keyof WordSearchData["options"]>(key: K, value: WordSearchData["options"][K]) {
    regenerate({ ...data, options: { ...data.options, [key]: value } });
  }
  const words = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <Field label={`Palabras (una por línea) · ${words.length}`} htmlFor="ws-words" hint="Se ignoran espacios y signos. Máximo recomendado: 25 palabras.">
          <Textarea
            id="ws-words"
            rows={10}
            value={text}
            placeholder={"Tipografía\nRetícula\nContraste\n…"}
            onChange={(e) => {
              setText(e.target.value);
              regenerate({
                ...data,
                words: e.target.value
                  .split(/\r?\n/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 60),
              });
            }}
          />
        </Field>
        <Field label="Instrucciones" htmlFor="ws-ins">
          <Textarea id="ws-ins" rows={2} className="min-h-0" value={data.instructions} onChange={(e) => onChange({ ...data, instructions: e.target.value })} />
        </Field>
        <Field label="Tamaño de la cuadrícula">
          <Select value={data.options.size} onChange={(e) => setOption("size", Number(e.target.value))} className="h-9">
            <option value={0}>Automático</option>
            {[10, 12, 14, 15, 16, 18, 20, 25].map((n) => (
              <option key={n} value={n}>
                {n} × {n}
              </option>
            ))}
          </Select>
        </Field>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={data.options.diagonal} onChange={(e) => setOption("diagonal", e.target.checked)} />
            Palabras en diagonal
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={data.options.backwards} onChange={(e) => setOption("backwards", e.target.checked)} />
            Palabras al revés (más difícil)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4" checked={data.options.removeAccents} onChange={(e) => setOption("removeAccents", e.target.checked)} />
            Quitar acentos (la Ñ se conserva)
          </label>
        </div>
        <Button variant="secondary" className="w-full" disabled={!words.length} onClick={() => setOption("seed", newSeed())}>
          <Shuffle className="size-4" /> Nueva distribución
        </Button>
      </aside>
      <section className="min-w-0 space-y-3">
        {data.result?.unplaced.length ? (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            No cupieron: {data.result.unplaced.join(", ")}. Agranda la cuadrícula o usa “Nueva distribución”.
          </p>
        ) : null}
        {data.result && data.result.placements.length ? (
          <WordSearchBoard key={`${data.options.seed}-${data.result.size}-${data.result.placements.length}-${data.words.join("|")}`} result={data.result} />
        ) : (
          <div className="grid min-h-64 place-items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500">
            Escribe las palabras a la izquierda y la sopa de letras aparecerá aquí.
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Crucigrama ---------------- */

function CrosswordEditor({ data, onChange }: { data: CrosswordData; onChange: (d: ToolData) => void }) {
  const [rows, setRows] = useState<CrosswordEntry[]>(data.entries.length ? data.entries : [{ answer: "", clue: "" }, { answer: "", clue: "" }, { answer: "", clue: "" }]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Regenerar el crucigrama poco después de dejar de escribir
  const key = JSON.stringify(rows) + data.seed + data.removeAccents;
  useEffect(() => {
    const t = setTimeout(() => {
      const entries = rows.filter((r) => r.answer.trim());
      const same = JSON.stringify(entries) === JSON.stringify(data.entries);
      if (same && data.result) return;
      onChange({ ...data, entries, result: entries.length >= 2 ? generateCrossword(entries, data.seed, data.removeAccents) : null });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function update(i: number, patch: Partial<CrosswordEntry>) {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  const filled = rows.filter((r) => r.answer.trim()).length;
  const missingClues = rows.filter((r) => r.answer.trim() && !r.clue.trim()).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Palabras y pistas · {filled}</h2>
            <Button size="sm" variant="secondary" onClick={() => setPasteOpen(true)}>
              <ClipboardPaste className="size-4" /> Pegar lista
            </Button>
          </div>
          <div className="space-y-2">
            <div className="hidden gap-2 px-1 text-xs font-medium text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_2rem]">
              <span>Respuesta</span>
              <span>Pista</span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_2rem] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_2rem]">
                <Input value={row.answer} placeholder={`Palabra ${i + 1}`} onChange={(e) => update(i, { answer: e.target.value })} className="h-9" aria-label={`Respuesta ${i + 1}`} />
                <Input
                  value={row.clue}
                  placeholder="Pista o definición"
                  onChange={(e) => update(i, { clue: e.target.value })}
                  className="col-start-1 h-9 sm:col-start-auto"
                  aria-label={`Pista ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, j) => j !== i) : [{ answer: "", clue: "" }]))}
                  className="row-start-1 grid h-9 place-items-center rounded text-red-600 hover:bg-red-50 sm:row-start-auto"
                  aria-label={`Eliminar fila ${i + 1}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setRows((r) => [...r, { answer: "", clue: "" }])}>
            <Plus className="size-4" /> Agregar palabra
          </Button>
        </section>
        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <Field label="Instrucciones" htmlFor="cw-ins">
            <Textarea id="cw-ins" rows={3} className="min-h-0" value={data.instructions} onChange={(e) => onChange({ ...data, instructions: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={data.removeAccents} onChange={(e) => onChange({ ...data, removeAccents: e.target.checked, result: null })} />
            Quitar acentos (la Ñ se conserva)
          </label>
          <Button variant="secondary" className="w-full" disabled={filled < 2} onClick={() => onChange({ ...data, seed: newSeed(), result: null })}>
            <Shuffle className="size-4" /> Nueva distribución
          </Button>
          <p className="text-xs text-slate-500">
            Consejo: usa de 8 a 20 palabras. Las respuestas de varias palabras se escriben juntas (ej. “Diseño gráfico” → DISEÑOGRAFICO).
          </p>
        </aside>
      </div>

      {missingClues > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="size-4" /> {missingClues} palabra(s) no tienen pista.
        </p>
      )}
      {data.result?.unplaced.length ? (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          No se pudieron cruzar: {data.result.unplaced.join(", ")}. Prueba “Nueva distribución” o agrega palabras que compartan letras.
        </p>
      ) : null}
      {data.result && data.result.placements.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <CrosswordBoard key={`${data.seed}-${data.result.placements.map((p) => p.answer).join("|")}`} result={data.result} />
        </section>
      ) : (
        <div className="grid min-h-48 place-items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500">
          Escribe al menos dos palabras con su pista y el crucigrama aparecerá aquí.
        </div>
      )}

      <Modal open={pasteOpen} onClose={() => setPasteOpen(false)} title="Pegar lista de palabras">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Una palabra por línea, con su pista separada por guion, dos puntos, punto y coma o tabulador. También puedes copiar dos
            columnas desde Excel.
          </p>
          <Textarea
            rows={10}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Kerning - Espacio entre pares de letras\nRetícula: Estructura que organiza el diseño\nBoceto; Dibujo previo de una idea"}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPasteOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!pasteText.trim()}
              onClick={() => {
                const parsed = parseEntries(pasteText);
                setRows((r) => [...r.filter((x) => x.answer.trim()), ...parsed]);
                setPasteText("");
                setPasteOpen(false);
              }}
            >
              Agregar {parseEntries(pasteText).length || ""} palabras
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
