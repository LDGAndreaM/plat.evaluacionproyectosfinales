"use client";

import { CheckCircle2, Eye, RotateCcw, SpellCheck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CrosswordPlacement, CrosswordResult } from "@/lib/tools/crossword";
import { cn } from "@/lib/utils";
import { SheetHeader } from "./print";

type Dir = "across" | "down";
const k = (r: number, c: number) => `${r},${c}`;

function cellsOf(p: CrosswordPlacement) {
  return [...p.answer].map((_, i) => (p.dir === "across" ? [p.row, p.col + i] : [p.row + i, p.col]) as [number, number]);
}

/** Crucigrama para resolver en pantalla. */
export function CrosswordBoard({ result }: { result: CrosswordResult }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [active, setActive] = useState<{ r: number; c: number; dir: Dir } | null>(null);
  const [checked, setChecked] = useState(false);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  /** Dirección elegida al tocar una pista (se aplica cuando la casilla recibe el foco). */
  const forcedDir = useRef<Dir | null>(null);

  const numbers = useMemo(() => {
    const m = new Map<string, number>();
    result.placements.forEach((p) => m.set(k(p.row, p.col), p.number));
    return m;
  }, [result]);

  const wordsAt = useMemo(() => {
    const m = new Map<string, CrosswordPlacement[]>();
    result.placements.forEach((p) => cellsOf(p).forEach(([r, c]) => m.set(k(r, c), [...(m.get(k(r, c)) ?? []), p])));
    return m;
  }, [result]);

  const activeWord = active ? (wordsAt.get(k(active.r, active.c)) ?? []).find((p) => p.dir === active.dir) : undefined;
  const activeCells = new Set(activeWord ? cellsOf(activeWord).map(([r, c]) => k(r, c)) : []);

  const filled = Object.entries(values).filter(([, v]) => v).length;
  const totalCells = wordsAt.size;
  const solved =
    filled === totalCells && [...wordsAt.keys()].every((key) => {
      const [r, c] = key.split(",").map(Number);
      return values[key] === result.grid[r][c];
    });

  function focus(r: number, c: number, dir?: Dir) {
    const words = wordsAt.get(k(r, c));
    if (!words) return;
    const d = dir && words.some((w) => w.dir === dir) ? dir : words[0].dir;
    forcedDir.current = d;
    setActive({ r, c, dir: d });
    refs.current[k(r, c)]?.focus();
    forcedDir.current = null;
  }

  function step(r: number, c: number, dir: Dir, delta: number) {
    const nr = dir === "down" ? r + delta : r;
    const nc = dir === "across" ? c + delta : c;
    if (wordsAt.has(k(nr, nc))) focus(nr, nc, dir);
  }

  function setLetter(r: number, c: number, letter: string) {
    setValues((v) => ({ ...v, [k(r, c)]: letter }));
    setChecked(false);
  }

  const size = `min(${result.cols <= 12 ? 2.6 : result.cols <= 18 ? 2.1 : 1.7}rem, calc((100vw - 5.5rem) / ${result.cols} - 3px))`;
  const across = result.placements.filter((p) => p.dir === "across");
  const down = result.placements.filter((p) => p.dir === "down");

  const clueList = (title: string, list: CrosswordPlacement[]) => (
    <div>
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <ol className="space-y-1">
        {list.map((p) => {
          const isActive = activeWord === p;
          return (
            <li key={`${p.dir}-${p.number}`}>
              <button
                type="button"
                onClick={() => focus(p.row, p.col, p.dir)}
                className={cn("w-full rounded-md px-2 py-1 text-left text-sm", isActive ? "bg-violet-100 text-violet-900" : "hover:bg-slate-100")}
              >
                <strong className="mr-1">{p.number}.</strong>
                {p.clue || <em className="text-slate-400">Sin pista</em>}{" "}
                <span className="text-xs text-slate-400">({p.answer.length})</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="overflow-x-auto">
          <div className="inline-grid gap-[3px] p-1" style={{ gridTemplateColumns: `repeat(${result.cols}, ${size})` }}>
            {result.grid.map((row, r) =>
              row.map((ch, c) => {
                const key = k(r, c);
                if (!ch) return <div key={key} className="aspect-square" style={{ width: size }} aria-hidden />;
                const val = values[key] ?? "";
                const wrong = checked && val && val !== ch;
                const right = checked && val === ch;
                return (
                  <div key={key} className="relative aspect-square rounded-[3px] bg-white shadow-[0_0_0_1.5px_#64748b]" style={{ width: size }}>
                    {numbers.has(key) && (
                      <span className="pointer-events-none absolute left-0.5 top-0 text-[9px] font-semibold leading-none text-slate-600 sm:text-[10px]">
                        {numbers.get(key)}
                      </span>
                    )}
                    <input
                      ref={(el) => {
                        refs.current[key] = el;
                      }}
                      value={val}
                      aria-label={`Fila ${r + 1}, columna ${c + 1}`}
                      autoComplete="off"
                      autoCapitalize="characters"
                      inputMode="text"
                      maxLength={2}
                      onFocus={() => {
                        if (forcedDir.current) return;
                        if (!active || active.r !== r || active.c !== c) {
                          const words = wordsAt.get(key)!;
                          const d = active && words.some((w) => w.dir === active.dir) ? active.dir : words[0].dir;
                          setActive({ r, c, dir: d });
                        }
                      }}
                      onClick={() => {
                        if (active && active.r === r && active.c === c) {
                          const words = wordsAt.get(key)!;
                          if (words.length > 1) setActive({ r, c, dir: active.dir === "across" ? "down" : "across" });
                        }
                      }}
                      onChange={(e) => {
                        const letter = e.target.value
                          .toUpperCase()
                          .replace(/[^A-ZÑÁÉÍÓÚÜ]/g, "")
                          .slice(-1);
                        setLetter(r, c, letter);
                        if (letter && active) step(r, c, active.dir, 1);
                      }}
                      onKeyDown={(e) => {
                        const dir = active?.dir ?? "across";
                        if (e.key === "Backspace" && !val) {
                          e.preventDefault();
                          step(r, c, dir, -1);
                        } else {
                          const moves: Record<string, [Dir, number]> = {
                            ArrowRight: ["across", 1],
                            ArrowLeft: ["across", -1],
                            ArrowDown: ["down", 1],
                            ArrowUp: ["down", -1],
                          };
                          const m = moves[e.key];
                          if (m) {
                            e.preventDefault();
                            step(r, c, m[0], m[1]);
                          }
                        }
                      }}
                      className={cn(
                        "h-full w-full bg-transparent text-center font-bold uppercase text-slate-900 caret-transparent outline-none",
                        activeCells.has(key) && "bg-violet-50",
                        active && active.r === r && active.c === c && "bg-violet-200",
                        wrong && "bg-red-100 text-red-700",
                        right && "text-emerald-700",
                      )}
                      style={{ fontSize: `calc(${size} * 0.55)` }}
                    />
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {solved ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="size-4" /> ¡Crucigrama completo!
            </span>
          ) : (
            <span className="text-sm text-slate-600">
              {filled} de {totalCells} casillas
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={() => setChecked(true)}>
            <SpellCheck className="size-4" /> Comprobar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!window.confirm("¿Mostrar todas las respuestas?")) return;
              const all: Record<string, string> = {};
              wordsAt.forEach((_, key) => {
                const [r, c] = key.split(",").map(Number);
                all[key] = result.grid[r][c];
              });
              setValues(all);
              setChecked(false);
            }}
          >
            <Eye className="size-4" /> Ver solución
          </Button>
          <Button size="sm" variant="ghost" onClick={() => (setValues({}), setChecked(false))}>
            <RotateCcw className="size-4" /> Reiniciar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {clueList("Horizontales", across)}
        {clueList("Verticales", down)}
      </div>
    </div>
  );
}

/** Hoja imprimible del crucigrama (y opcionalmente respuestas). */
export function CrosswordSheet({
  title,
  instructions,
  result,
  withAnswers,
}: {
  title: string;
  instructions: string;
  result: CrosswordResult;
  withAnswers: boolean;
}) {
  const cell = `${Math.min(9, 180 / Math.max(result.cols, 1), 150 / Math.max(result.rows, 1))}mm`;
  const numbers = new Map(result.placements.map((p) => [k(p.row, p.col), p.number]));
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
                  border: ch ? "0.35mm solid #000" : "none",
                  position: "relative",
                  textAlign: "center",
                  verticalAlign: "middle",
                  fontWeight: 700,
                  fontSize: `calc(${cell} * 0.55)`,
                }}
              >
                {ch && numbers.has(k(r, c)) && (
                  <span style={{ position: "absolute", top: "0.3mm", left: "0.6mm", fontSize: "6pt", fontWeight: 600 }}>
                    {numbers.get(k(r, c))}
                  </span>
                )}
                {answers ? ch : ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  const clues = (dir: Dir, label: string) => (
    <div style={{ flex: 1 }}>
      <h3 style={{ fontSize: "12pt", fontWeight: 800, margin: "0 0 2mm" }}>{label}</h3>
      {result.placements
        .filter((p) => p.dir === dir)
        .map((p) => (
          <p key={p.number} style={{ fontSize: "10.5pt", margin: "0 0 1.5mm" }}>
            <strong>{p.number}.</strong> {p.clue} ({p.answer.length})
          </p>
        ))}
    </div>
  );
  return (
    <>
      <SheetHeader title={title} instructions={instructions} />
      {grid(false)}
      <div style={{ display: "flex", gap: "8mm", marginTop: "7mm" }}>
        {clues("across", "Horizontales")}
        {clues("down", "Verticales")}
      </div>
      {withAnswers && (
        <div className="print-break">
          <h2 style={{ fontSize: "16pt", fontWeight: 800 }}>{title} — Respuestas</h2>
          <div style={{ marginTop: "6mm" }}>{grid(true)}</div>
        </div>
      )}
    </>
  );
}
