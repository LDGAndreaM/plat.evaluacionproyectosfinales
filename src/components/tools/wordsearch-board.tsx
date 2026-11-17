"use client";

import { CheckCircle2, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { placementCells, type WordSearchResult } from "@/lib/tools/wordsearch";
import { cn } from "@/lib/utils";
import { SheetHeader } from "./print";

const FOUND_COLORS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe", "#fed7aa", "#a5f3fc", "#fecaca"];

function lineBetween(a: [number, number], b: [number, number]): [number, number][] | null {
  const dr = Math.sign(b[0] - a[0]);
  const dc = Math.sign(b[1] - a[1]);
  const lenR = Math.abs(b[0] - a[0]);
  const lenC = Math.abs(b[1] - a[1]);
  if (lenR !== 0 && lenC !== 0 && lenR !== lenC) return null;
  const len = Math.max(lenR, lenC);
  return Array.from({ length: len + 1 }, (_, i) => [a[0] + dr * i, a[1] + dc * i]);
}

/** Sopa de letras para resolver en pantalla (clic o arrastrar de la primera a la última letra). */
export function WordSearchBoard({ result }: { result: WordSearchResult }) {
  const [found, setFound] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const dragging = useRef(false);

  const cellColor = useMemo(() => {
    const map = new Map<string, string>();
    const list = showAll ? result.placements.map((_, i) => i) : found;
    list.forEach((idx) => {
      const color = FOUND_COLORS[idx % FOUND_COLORS.length];
      placementCells(result.placements[idx]).forEach(([r, c]) => map.set(`${r},${c}`, color));
    });
    return map;
  }, [found, showAll, result]);

  const preview = useMemo(() => {
    if (!start || !hover) return new Set<string>();
    const line = lineBetween(start, hover);
    return new Set((line ?? [start]).map(([r, c]) => `${r},${c}`));
  }, [start, hover]);

  function cellFromPoint(x: number, y: number): [number, number] | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const r = el?.dataset?.r;
    const c = el?.dataset?.c;
    return r !== undefined && c !== undefined ? [Number(r), Number(c)] : null;
  }

  function finish(a: [number, number], b: [number, number]) {
    const line = lineBetween(a, b);
    setStart(null);
    setHover(null);
    if (!line || line.length < 2) return;
    const key = line.map(([r, c]) => `${r},${c}`).join("|");
    const rev = [...line].reverse().map(([r, c]) => `${r},${c}`).join("|");
    const idx = result.placements.findIndex((p, i) => {
      if (found.includes(i)) return false;
      const k = placementCells(p).map(([r, c]) => `${r},${c}`).join("|");
      return k === key || k === rev;
    });
    if (idx >= 0) setFound((f) => [...f, idx]);
  }

  const total = result.placements.length;
  const done = found.length === total && total > 0;
  const cellSize = `min(${result.size <= 12 ? 2.6 : result.size <= 16 ? 2.2 : 1.8}rem, calc((100vw - 4.5rem) / ${result.size}))`;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
      <div className="min-w-0 overflow-x-auto">
        <div
          className="inline-grid touch-none select-none rounded-xl border border-slate-300 bg-white p-2"
          style={{ gridTemplateColumns: `repeat(${result.size}, ${cellSize})` }}
          onPointerUp={(e) => {
            if (!dragging.current || !start) return;
            dragging.current = false;
            const cell = cellFromPoint(e.clientX, e.clientY);
            if (cell && (cell[0] !== start[0] || cell[1] !== start[1])) finish(start, cell);
          }}
          onPointerMove={(e) => {
            if (!start) return;
            const cell = cellFromPoint(e.clientX, e.clientY);
            if (cell) setHover(cell);
          }}
          onPointerLeave={() => {
            if (dragging.current) {
              dragging.current = false;
            }
          }}
        >
          {result.grid.map((row, r) =>
            row.map((ch, c) => {
              const k = `${r},${c}`;
              const bg = cellColor.get(k);
              const isPreview = preview.has(k);
              return (
                <div
                  key={k}
                  data-r={r}
                  data-c={c}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (start && (start[0] !== r || start[1] !== c)) {
                      finish(start, [r, c]);
                      return;
                    }
                    setStart([r, c]);
                    setHover([r, c]);
                    dragging.current = true;
                  }}
                  className={cn(
                    "grid aspect-square cursor-pointer place-items-center rounded-md font-mono font-bold text-slate-800",
                    isPreview && "ring-2 ring-violet-500",
                    start && start[0] === r && start[1] === c && "bg-violet-200",
                  )}
                  style={{ background: isPreview ? "#ede9fe" : bg, fontSize: `calc(${cellSize} * 0.55)` }}
                >
                  {ch}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm font-medium", done ? "text-emerald-700" : "text-slate-700")}>
            {done ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-4" /> ¡Encontraste todas!
              </span>
            ) : (
              `${found.length} de ${total} encontradas`
            )}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setShowAll((v) => !v)}>
            {showAll ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {showAll ? "Ocultar solución" : "Ver solución"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => (setFound([]), setShowAll(false))}>
            <RotateCcw className="size-4" /> Reiniciar
          </Button>
        </div>
        <p className="text-xs text-slate-500">Toca la primera letra y luego la última (o arrastra) para marcar una palabra.</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 xl:grid-cols-2">
          {result.placements.map((p, i) => {
            const isFound = found.includes(i);
            return (
              <li key={i} className={cn("text-sm font-medium", isFound ? "text-slate-400 line-through" : "text-slate-800")}>
                <span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: isFound || showAll ? FOUND_COLORS[i % FOUND_COLORS.length] : "#e2e8f0" }} />
                {p.original}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Hoja imprimible (y opcionalmente hoja de respuestas). */
export function WordSearchSheet({
  title,
  instructions,
  result,
  withAnswers,
}: {
  title: string;
  instructions: string;
  result: WordSearchResult;
  withAnswers: boolean;
}) {
  const cell = `${Math.min(10, 180 / result.size)}mm`;
  const solution = new Set(result.placements.flatMap((p) => placementCells(p).map(([r, c]) => `${r},${c}`)));
  const grid = (answers: boolean) => (
    <table style={{ borderCollapse: "collapse", margin: "0 auto" }}>
      <tbody>
        {result.grid.map((row, r) => (
          <tr key={r}>
            {row.map((ch, c) => (
              <td
                key={c}
                style={{
                  width: cell,
                  height: cell,
                  textAlign: "center",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: `calc(${cell} * 0.62)`,
                  border: "0.3mm solid #999",
                  background: answers && solution.has(`${r},${c}`) ? "#ddd" : "#fff",
                }}
              >
                {ch}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  const words = (
    <div style={{ columns: 3, marginTop: "6mm", fontSize: "11pt" }}>
      {result.placements
        .map((p) => p.original)
        .sort((a, b) => a.localeCompare(b, "es"))
        .map((w) => (
          <div key={w}>☐ {w}</div>
        ))}
    </div>
  );
  return (
    <>
      <SheetHeader title={title} instructions={instructions} />
      {grid(false)}
      {words}
      {withAnswers && (
        <div className="print-break">
          <h2 style={{ fontSize: "16pt", fontWeight: 800 }}>{title} — Respuestas</h2>
          <div style={{ marginTop: "6mm" }}>{grid(true)}</div>
        </div>
      )}
    </>
  );
}
