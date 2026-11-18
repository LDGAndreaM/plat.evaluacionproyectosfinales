"use client";

import { Maximize, Minimize, PartyPopper, Plus, RotateCw, Trash2, X } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { getWheels, setWheels, type WheelData, type WheelSpec } from "@/lib/tools/types";
import { cn, readableTextColor } from "@/lib/utils";

export const PALETTES: Record<string, { name: string; colors: string[] }> = {
  evaluaqr: { name: "EvalúaQR", colors: ["#6A11CB", "#00D6B8", "#A855F7", "#FFC93C", "#FF6B8A", "#3A0A71"] },
  vivo: { name: "Vivo", colors: ["#7c3aed", "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#ef4444"] },
  pastel: { name: "Pastel", colors: ["#c4b5fd", "#f9a8d4", "#fdba74", "#fde047", "#86efac", "#67e8f9", "#93c5fd", "#fca5a5"] },
  oceano: { name: "Océano", colors: ["#0c4a6e", "#0369a1", "#0ea5e9", "#38bdf8", "#14b8a6", "#0f766e"] },
  atardecer: { name: "Atardecer", colors: ["#7f1d1d", "#b91c1c", "#ea580c", "#f59e0b", "#facc15", "#be185d"] },
  sobrio: { name: "Sobrio", colors: ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#475569"] },
};

const MAX_WHEELS = 4;

function randomInt(max: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function segmentColor(palette: string[], i: number, n: number) {
  // Evita que el primero y el último tengan el mismo color
  let c = palette[i % palette.length];
  if (i === n - 1 && n > 1 && n % palette.length === 1) c = palette[(i + 1) % palette.length];
  return c;
}

function polar(r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [200 + r * Math.cos(a), 200 + r * Math.sin(a)];
}

function WheelSvg({ labels, palette, rotation, seconds }: { labels: string[]; palette: string[]; rotation: number; seconds: number }) {
  const n = labels.length;
  const seg = 360 / Math.max(1, n);
  const fontSize = n <= 6 ? 18 : n <= 12 ? 15 : n <= 24 ? 12 : n <= 40 ? 9 : 7;
  const maxChars = n <= 12 ? 18 : n <= 24 ? 16 : 14;
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full drop-shadow-xl" role="img" aria-label="Ruleta">
      <g
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "200px 200px",
          transition: seconds ? `transform ${seconds}s cubic-bezier(0.12, 0.67, 0.1, 1)` : "none",
        }}
      >
        {n === 0 && <circle cx="200" cy="200" r="190" fill="#e2e8f0" />}
        {n === 1 && <circle cx="200" cy="200" r="190" fill={palette[0]} />}
        {n > 1 &&
          labels.map((_, i) => {
            const [x1, y1] = polar(190, i * seg);
            const [x2, y2] = polar(190, (i + 1) * seg);
            const large = seg > 180 ? 1 : 0;
            return (
              <path
                key={i}
                d={`M200,200 L${x1},${y1} A190,190 0 ${large} 1 ${x2},${y2} Z`}
                fill={segmentColor(palette, i, n)}
                stroke="#fff"
                strokeWidth={n > 40 ? 0.5 : 1.5}
              />
            );
          })}
        {labels.map((label, i) => {
          const mid = i * seg + seg / 2;
          const color = n === 1 ? palette[0] : segmentColor(palette, i, n);
          const text = label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
          return (
            <text
              key={i}
              x="200"
              y="200"
              transform={`rotate(${mid - 90} 200 200) translate(${n === 1 ? 0 : 172} 0)`}
              textAnchor={n === 1 ? "middle" : "end"}
              dominantBaseline="middle"
              fontSize={fontSize}
              fontWeight={600}
              fill={readableTextColor(color)}
              style={{ fontFamily: "var(--font-inter), sans-serif" }}
            >
              {text}
            </text>
          );
        })}
      </g>
      <circle cx="200" cy="200" r="26" fill="#fff" stroke="#e2e8f0" strokeWidth="3" />
      <circle cx="200" cy="200" r="8" fill="#0f172a" />
      {/* Indicador */}
      <path d="M200,34 L186,4 L214,4 Z" fill="#0f172a" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export interface SpinHandle {
  spin: () => void;
}

/** Una ruleta con su botón y su resultado. */
const SingleWheel = forwardRef<
  SpinHandle,
  {
    spec: WheelSpec;
    seconds: number;
    big: boolean;
    dark: boolean;
    showTitle: boolean;
    result: string | null;
    onResult: (label: string, index: number) => void;
    onRemoveResult: () => void;
    onCloseResult: () => void;
    onSpinStart: () => void;
    onRequestSpin: () => void;
  }
>(function SingleWheel({ spec, seconds, big, dark, showTitle, result, onResult, onRemoveResult, onCloseResult, onSpinStart, onRequestSpin }, ref) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const pending = useRef<{ label: string; index: number } | null>(null);
  const labels = spec.entries.map((e) => e.label);
  const palette = (PALETTES[spec.palette] ?? PALETTES.evaluaqr).colors;

  const spin = useCallback(() => {
    if (spinning || labels.length < 2) return;
    const n = labels.length;
    const index = randomInt(n);
    const seg = 360 / n;
    const within = (0.15 + (randomInt(1000) / 1000) * 0.7) * seg;
    const targetMod = (360 - (index * seg + within)) % 360;
    const current = rotation % 360;
    let delta = targetMod - current;
    if (delta < 0) delta += 360;
    const turns = Math.max(3, Math.round(seconds * 1.2));
    pending.current = { label: labels[index], index };
    onSpinStart();
    setSpinning(true);
    setRotation(rotation + turns * 360 + delta);
  }, [spinning, labels, rotation, seconds, onSpinStart]);

  useImperativeHandle(ref, () => ({ spin }), [spin]);

  return (
    <div className="flex w-full flex-col items-center">
      {showTitle && (
        <h3 className={cn("mb-2 text-center text-lg font-bold", dark ? "text-white" : "text-slate-900")}>{spec.title || "Ruleta"}</h3>
      )}
      <button
        type="button"
        onClick={onRequestSpin}
        disabled={spinning || labels.length < 2}
        className={cn("aspect-square w-full cursor-pointer disabled:cursor-default", big ? "max-w-[78vh]" : "max-w-[520px]")}
        aria-label={`Girar ${spec.title || "la ruleta"}`}
      >
        <div
          className="h-full w-full"
          onTransitionEnd={() => {
            setSpinning(false);
            const w = pending.current;
            pending.current = null;
            if (w) onResult(w.label, w.index);
          }}
        >
          <WheelSvg labels={labels} palette={palette} rotation={rotation} seconds={spinning ? seconds : 0} />
        </div>
      </button>
      <div className="mt-3 flex min-h-[3.25rem] w-full flex-col items-center gap-2">
        {result && !spinning ? (
          <div className="flex w-full max-w-md items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-lg ring-2 ring-violet-500">
            <PartyPopper className="size-6 shrink-0 text-violet-600" />
            <span className="min-w-0 flex-1 break-words text-xl font-black text-slate-900 sm:text-2xl">
              {result}
              {spec.removeWinner && <span className="block text-xs font-normal text-slate-500">Se quitará de la ruleta al cerrar o volver a girar</span>}
            </span>
            {!spec.removeWinner && (
              <button type="button" onClick={onRemoveResult} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Quitar de la ruleta">
                <Trash2 className="size-4" />
              </button>
            )}
            <button type="button" onClick={onCloseResult} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Cerrar">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <Button onClick={onRequestSpin} disabled={spinning || labels.length < 2} className="min-w-36">
            <RotateCw className={cn("size-4", spinning && "animate-spin")} /> {spinning ? "Girando…" : "Girar"}
          </Button>
        )}
        {labels.length < 2 && <p className={cn("text-xs", dark ? "text-slate-400" : "text-slate-500")}>Agrega al menos 2 opciones.</p>}
      </div>
    </div>
  );
});

/**
 * Ruletas interactivas (una o varias en la misma pantalla).
 * Los cambios (listas, historial) se reportan con `onChange` para guardarse.
 */
export function WheelTool({
  data,
  onChange,
  canEdit,
  title,
}: {
  data: WheelData;
  onChange: (d: WheelData) => void;
  canEdit: boolean;
  title: string;
}) {
  const wheels = getWheels(data);
  const [active, setActive] = useState(0);
  const [texts, setTexts] = useState<Record<string, string>>(() => Object.fromEntries(wheels.map((w) => [w.id, w.entries.map((e) => e.label).join("\n")])));
  const [results, setResults] = useState<Record<string, { label: string; index: number } | null>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const [spinningCount, setSpinningCount] = useState(0);
  /** Ganadores que se quitarán de su ruleta al cerrar el resultado o volver a girar */
  const pendingRemoval = useRef<Record<string, number>>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<string, SpinHandle | null>>({});
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const current = wheels[Math.min(active, wheels.length - 1)];
  const multi = wheels.length > 1;

  function updateWheel(id: string, patch: Partial<WheelSpec>, extra: Partial<WheelData> = {}) {
    const d = dataRef.current;
    const next = setWheels({ ...d, ...extra }, getWheels(d).map((w) => (w.id === id ? { ...w, ...patch } : w)));
    dataRef.current = next;
    onChange(next);
  }

  function setText(id: string, value: string) {
    setTexts((t) => ({ ...t, [id]: value }));
    const entries = value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 300)
      .map((label, i) => ({ id: `e${i}`, label }));
    updateWheel(id, { entries });
  }

  function setList(id: string, list: string[], extra: Partial<WheelData> = {}) {
    setTexts((t) => ({ ...t, [id]: list.join("\n") }));
    updateWheel(id, { entries: list.map((label, i) => ({ id: `e${i}`, label })) }, extra);
  }

  function addWheel() {
    if (wheels.length >= MAX_WHEELS) return;
    const id = `w${Date.now().toString(36)}`;
    const names = ["Temas", "Alumnos", "Equipos", "Orden"];
    const spec: WheelSpec = {
      id,
      title: names[wheels.length] ?? `Ruleta ${wheels.length + 1}`,
      entries: [],
      removeWinner: false,
      palette: Object.keys(PALETTES)[(wheels.length + 1) % Object.keys(PALETTES).length],
    };
    // Si era una sola ruleta sin nombre, darle uno
    const list = wheels.map((w, i) => (i === 0 && !w.title ? { ...w, title: "Ruleta 1" } : w));
    const next = setWheels(dataRef.current, [...list, spec]);
    dataRef.current = next;
    onChange(next);
    setTexts((t) => ({ ...t, [id]: "" }));
    setActive(list.length);
  }

  function removeWheel(id: string) {
    if (wheels.length <= 1) return;
    if (!window.confirm("¿Quitar esta ruleta?")) return;
    const next = setWheels(dataRef.current, wheels.filter((w) => w.id !== id));
    dataRef.current = next;
    onChange(next);
    setActive(0);
  }

  const onResult = useCallback(
    (spec: WheelSpec, label: string, index: number) => {
      setSpinningCount((n) => Math.max(0, n - 1));
      setResults((r) => ({ ...r, [spec.id]: { label, index } }));
      const d = dataRef.current;
      const history = [{ label, at: new Date().toISOString(), wheel: getWheels(d).length > 1 ? spec.title || undefined : undefined }, ...(d.history ?? [])].slice(0, 50);
      if (spec.removeWinner) pendingRemoval.current[spec.id] = index;
      const next = { ...d, history };
      dataRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  /** Quita de su ruleta los ganadores pendientes (de las ruletas indicadas). */
  const applyRemovals = useCallback(
    (ids: string[]) => {
      const todo = ids.filter((id) => pendingRemoval.current[id] !== undefined);
      if (!todo.length) return false;
      const d = dataRef.current;
      const nextWheels = getWheels(d).map((w) => {
        if (!todo.includes(w.id)) return w;
        const idx = pendingRemoval.current[w.id];
        const list = w.entries.map((e) => e.label).filter((_, i) => i !== idx);
        setTexts((t) => ({ ...t, [w.id]: list.join("\n") }));
        return { ...w, entries: list.map((l, i) => ({ id: `e${i}`, label: l })) };
      });
      todo.forEach((id) => delete pendingRemoval.current[id]);
      const next = setWheels(d, nextWheels);
      dataRef.current = next;
      onChange(next);
      return true;
    },
    [onChange],
  );

  /** Gira las ruletas indicadas (aplicando antes los ganadores pendientes de quitar). */
  const requestSpin = useCallback(
    (ids: string[]) => {
      setResults((r) => {
        const copy = { ...r };
        ids.forEach((id) => (copy[id] = null));
        return copy;
      });
      const changed = applyRemovals(ids);
      const go = () => ids.forEach((id) => refs.current[id]?.spin());
      if (changed) setTimeout(go, 80);
      else go();
    },
    [applyRemovals],
  );

  const spinAll = useCallback(() => requestSpin(wheels.map((w) => w.id)), [requestSpin, wheels]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT" || tag === "BUTTON") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        spinAll();
      }
    };
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [spinAll]);

  const lines = (texts[current.id] ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const anySpinning = spinningCount > 0;
  const shownResults = wheels.filter((w) => results[w.id]);

  return (
    <div className={cn("grid gap-6", canEdit && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
      <div
        ref={boxRef}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-violet-50 to-lavender p-4",
          fullscreen && "overflow-y-auto bg-none bg-violet-950 p-8",
        )}
      >
        {fullscreen && <h2 className="mb-4 text-center text-3xl font-bold text-white">{title}</h2>}
        <div
          className={cn(
            "grid w-full items-start justify-items-center gap-6",
            wheels.length === 2 && "sm:grid-cols-2",
            wheels.length === 3 && "sm:grid-cols-2 xl:grid-cols-3",
            wheels.length === 4 && "sm:grid-cols-2",
          )}
        >
          {wheels.map((w) => (
            <SingleWheel
              key={w.id}
              ref={(h) => {
                refs.current[w.id] = h;
              }}
              spec={w}
              seconds={data.spinSeconds}
              big={fullscreen && !multi}
              dark={fullscreen}
              showTitle={multi}
              result={results[w.id]?.label ?? null}
              onSpinStart={() => {
                setSpinningCount((n) => n + 1);
                setResults((r) => ({ ...r, [w.id]: null }));
              }}
              onResult={(label, index) => onResult(w, label, index)}
              onRequestSpin={() => requestSpin([w.id])}
              onCloseResult={() => {
                applyRemovals([w.id]);
                setResults((r) => ({ ...r, [w.id]: null }));
              }}
              onRemoveResult={() => {
                const res = results[w.id];
                if (!res) return;
                setList(
                  w.id,
                  w.entries.map((e) => e.label).filter((_, i) => i !== res.index),
                );
                setResults((r) => ({ ...r, [w.id]: null }));
              }}
            />
          ))}
        </div>

        {multi && shownResults.length > 1 && !anySpinning && (
          <div className="mt-5 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-center text-white shadow-lg">
            <PartyPopper className="size-5" />
            {shownResults.map((w, i) => (
              <span key={w.id} className="text-lg">
                {i > 0 && <span className="mx-1 text-violet-200">·</span>}
                <span className="text-violet-200">{w.title || "Ruleta"}:</span> <strong>{results[w.id]?.label}</strong>
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {multi && (
            <Button size="lg" onClick={spinAll} disabled={anySpinning}>
              <RotateCw className={cn("size-5", anySpinning && "animate-spin")} /> Girar todas
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : boxRef.current?.requestFullscreen())}
          >
            {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            {fullscreen ? "Salir" : "Pantalla completa"}
          </Button>
        </div>
        <p className={cn("mt-2 text-xs", fullscreen ? "text-slate-400" : "text-slate-500")}>
          {multi ? "Gira cada ruleta con su botón o todas a la vez (barra espaciadora)." : "También puedes girar con la barra espaciadora."}
        </p>
      </div>

      {canEdit && (
        <aside className="space-y-4">
          {/* Selector de ruletas */}
          <div className="flex flex-wrap items-center gap-1">
            {wheels.map((w, i) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "max-w-[9rem] truncate rounded-lg px-3 py-1.5 text-sm font-medium",
                  i === active ? "bg-violet-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300",
                )}
              >
                {w.title || `Ruleta ${i + 1}`}
              </button>
            ))}
            {wheels.length < MAX_WHEELS && (
              <button
                type="button"
                onClick={addWheel}
                disabled={anySpinning}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-violet-700 ring-1 ring-dashed ring-violet-300 hover:bg-violet-50"
              >
                <Plus className="size-4" /> Agregar ruleta
              </button>
            )}
          </div>

          {multi && (
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1 space-y-1 text-sm">
                <span className="font-medium text-slate-800">Nombre de esta ruleta</span>
                <Input value={current.title} onChange={(e) => updateWheel(current.id, { title: e.target.value.slice(0, 40) })} className="h-9" placeholder="Ej. Temas" />
              </label>
              <Button size="sm" variant="ghost" onClick={() => removeWheel(current.id)} aria-label="Quitar esta ruleta" className="h-9">
                <Trash2 className="size-4 text-red-600" />
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="wheel-entries" className="flex items-center justify-between text-sm font-medium text-slate-800">
              <span>Opciones (una por línea)</span>
              <span className="text-xs font-normal text-slate-500">{lines.length}</span>
            </label>
            <Textarea
              id="wheel-entries"
              key={current.id}
              value={texts[current.id] ?? ""}
              onChange={(e) => setText(current.id, e.target.value)}
              rows={10}
              placeholder={"Ana\nLuis\nMaría\n…"}
              disabled={anySpinning}
            />
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={anySpinning}
                onClick={() => {
                  const arr = [...lines];
                  for (let i = arr.length - 1; i > 0; i--) {
                    const j = randomInt(i + 1);
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                  }
                  setList(current.id, arr);
                }}
              >
                Mezclar
              </Button>
              <Button size="sm" variant="secondary" disabled={anySpinning} onClick={() => setList(current.id, [...lines].sort((a, b) => a.localeCompare(b, "es")))}>
                Ordenar A–Z
              </Button>
              <Button size="sm" variant="secondary" disabled={anySpinning} onClick={() => setList(current.id, [...new Set(lines)])}>
                Quitar repetidos
              </Button>
              <Button size="sm" variant="ghost" disabled={anySpinning} onClick={() => window.confirm("¿Borrar todas las opciones de esta ruleta?") && setList(current.id, [])}>
                Limpiar
              </Button>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={current.removeWinner}
              onChange={(e) => updateWheel(current.id, { removeWinner: e.target.checked })}
            />
            <span>
              <span className="font-medium text-slate-800">Quitar al ganador después de cada giro</span>
              <span className="block text-xs text-slate-500">Útil para no repetir alumnos o temas.</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-800">Colores</span>
              <Select value={current.palette} onChange={(e) => updateWheel(current.id, { palette: e.target.value })} className="h-9">
                {Object.entries(PALETTES).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-800">Duración del giro</span>
              <Select value={data.spinSeconds} onChange={(e) => onChange({ ...dataRef.current, spinSeconds: Number(e.target.value) })} className="h-9">
                {[3, 5, 7, 10].map((s) => (
                  <option key={s} value={s}>
                    {s} segundos
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">Historial</span>
              {(data.history?.length ?? 0) > 0 && (
                <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => onChange({ ...dataRef.current, history: [] })}>
                  Borrar historial
                </button>
              )}
            </div>
            {(data.history?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">Aquí aparecerán los resultados.</p>
            ) : (
              <ol className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {data.history.map((h, i) => (
                  <li key={i} className="flex justify-between gap-2 rounded-md bg-white px-2 py-1">
                    <span className="truncate font-medium text-slate-800">
                      {data.history.length - i}. {h.wheel && <span className="font-normal text-slate-500">{h.wheel}: </span>}
                      {h.label}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {new Date(h.at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
