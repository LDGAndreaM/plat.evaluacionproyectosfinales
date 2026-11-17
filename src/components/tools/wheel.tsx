"use client";

import { Maximize, Minimize, PartyPopper, RotateCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import type { WheelData } from "@/lib/tools/types";
import { cn, readableTextColor } from "@/lib/utils";

export const PALETTES: Record<string, { name: string; colors: string[] }> = {
  vivo: { name: "Vivo", colors: ["#7c3aed", "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#ef4444"] },
  pastel: { name: "Pastel", colors: ["#c4b5fd", "#f9a8d4", "#fdba74", "#fde047", "#86efac", "#67e8f9", "#93c5fd", "#fca5a5"] },
  oceano: { name: "Océano", colors: ["#0c4a6e", "#0369a1", "#0ea5e9", "#38bdf8", "#14b8a6", "#0f766e"] },
  atardecer: { name: "Atardecer", colors: ["#7f1d1d", "#b91c1c", "#ea580c", "#f59e0b", "#facc15", "#be185d"] },
  sobrio: { name: "Sobrio", colors: ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#475569"] },
};

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

/** Ruleta interactiva. Si `onChange` existe, los cambios (lista, historial) se reportan para guardarse. */
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
  const [text, setText] = useState(() => data.entries.map((e) => e.label).join("\n"));
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<{ label: string; index: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const pending = useRef<{ label: string; index: number } | null>(null);

  const labels = data.entries.map((e) => e.label);
  const palette = (PALETTES[data.palette] ?? PALETTES.vivo).colors;

  function setEntries(list: string[], extra: Partial<WheelData> = {}) {
    onChange({ ...data, ...extra, entries: list.slice(0, 300).map((label, i) => ({ id: `e${i}`, label })) });
  }

  function updateText(value: string) {
    setText(value);
    setEntries(
      value
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

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
    const turns = Math.max(3, Math.round(data.spinSeconds * 1.2));
    pending.current = { label: labels[index], index };
    setWinner(null);
    setSpinning(true);
    setRotation(rotation + turns * 360 + delta);
  }, [spinning, labels, rotation, data.spinSeconds]);

  function onSpinEnd() {
    setSpinning(false);
    const w = pending.current;
    if (!w) return;
    pending.current = null;
    setWinner(w);
    const history = [{ label: w.label, at: new Date().toISOString() }, ...(data.history ?? [])].slice(0, 50);
    if (data.removeWinner) {
      const list = labels.filter((_, i) => i !== w.index);
      setText(list.join("\n"));
      setEntries(list, { history });
    } else onChange({ ...data, history });
  }

  function removeWinner() {
    if (!winner) return;
    const list = labels.filter((_, i) => i !== winner.index);
    setText(list.join("\n"));
    setEntries(list);
    setWinner(null);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (winner) setWinner(null);
        else spin();
      }
    };
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [spin, winner]);

  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  return (
    <div className={cn("grid gap-6", canEdit && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
      <div
        ref={boxRef}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 p-4",
          fullscreen && "bg-slate-900",
        )}
      >
        {fullscreen && <h2 className="mb-2 text-center text-3xl font-bold text-white">{title}</h2>}
        <button
          type="button"
          onClick={spin}
          disabled={spinning || labels.length < 2}
          className={cn("aspect-square w-full cursor-pointer disabled:cursor-default", fullscreen ? "max-w-[78vh]" : "max-w-[520px]")}
          aria-label="Girar la ruleta"
        >
          <div className="h-full w-full" onTransitionEnd={onSpinEnd}>
            <WheelSvg labels={labels} palette={palette} rotation={rotation} seconds={spinning ? data.spinSeconds : 0} />
          </div>
        </button>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" onClick={spin} disabled={spinning || labels.length < 2} className="min-w-40">
            <RotateCw className={cn("size-5", spinning && "animate-spin")} /> {spinning ? "Girando…" : "¡Girar!"}
          </Button>
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
          {labels.length < 2 ? "Agrega al menos 2 opciones para girar." : `${labels.length} opciones · también puedes girar con la barra espaciadora`}
        </p>

        {winner && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
              <PartyPopper className="mx-auto size-10 text-violet-600" />
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-500">Resultado</p>
              <p className="mt-1 break-words text-3xl font-black text-slate-900 sm:text-4xl">{winner.label}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {!data.removeWinner && (
                  <Button variant="secondary" onClick={removeWinner}>
                    <Trash2 className="size-4" /> Quitar de la ruleta
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setWinner(null);
                  }}
                >
                  <X className="size-4" /> Cerrar
                </Button>
              </div>
              {data.removeWinner && <p className="mt-3 text-xs text-slate-500">Se quitó de la ruleta automáticamente.</p>}
            </div>
          </div>
        )}
      </div>

      {canEdit && (
        <aside className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="wheel-entries" className="flex items-center justify-between text-sm font-medium text-slate-800">
              <span>Opciones (una por línea)</span>
              <span className="text-xs font-normal text-slate-500">{lines.length}</span>
            </label>
            <Textarea
              id="wheel-entries"
              value={text}
              onChange={(e) => updateText(e.target.value)}
              rows={12}
              placeholder={"Ana\nLuis\nMaría\n…"}
              disabled={spinning}
            />
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={spinning}
                onClick={() => {
                  const arr = [...lines];
                  for (let i = arr.length - 1; i > 0; i--) {
                    const j = randomInt(i + 1);
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                  }
                  updateText(arr.join("\n"));
                }}
              >
                Mezclar
              </Button>
              <Button size="sm" variant="secondary" disabled={spinning} onClick={() => updateText([...lines].sort((a, b) => a.localeCompare(b, "es")).join("\n"))}>
                Ordenar A–Z
              </Button>
              <Button size="sm" variant="secondary" disabled={spinning} onClick={() => updateText([...new Set(lines)].join("\n"))}>
                Quitar repetidos
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={spinning}
                onClick={() => window.confirm("¿Borrar todas las opciones?") && updateText("")}
              >
                Limpiar
              </Button>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={data.removeWinner}
              onChange={(e) => onChange({ ...data, removeWinner: e.target.checked })}
            />
            <span>
              <span className="font-medium text-slate-800">Quitar al ganador después de cada giro</span>
              <span className="block text-xs text-slate-500">Útil para definir el orden de exposición sin repetir.</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-800">Duración del giro</span>
              <Select value={data.spinSeconds} onChange={(e) => onChange({ ...data, spinSeconds: Number(e.target.value) })} className="h-9">
                {[3, 5, 7, 10].map((s) => (
                  <option key={s} value={s}>
                    {s} segundos
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-800">Colores</span>
              <Select value={data.palette} onChange={(e) => onChange({ ...data, palette: e.target.value })} className="h-9">
                {Object.entries(PALETTES).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">Historial</span>
              {(data.history?.length ?? 0) > 0 && (
                <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => onChange({ ...data, history: [] })}>
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
                      {data.history.length - i}. {h.label}
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
