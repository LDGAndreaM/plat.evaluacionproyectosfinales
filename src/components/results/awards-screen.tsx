"use client";

import { ChevronLeft, ChevronRight, Eye, Maximize, Minimize, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RankedProject } from "@/lib/scoring/ranking";
import { rankSubset, rankWithin } from "@/lib/scoring/ranking";
import { cn, readableTextColor, semesterLabel, semestersOf } from "@/lib/utils";

export interface AwardsEvent {
  name: string;
  logo_url: string | null;
  primary_color: string;
  podium_size: number;
}

const MEDAL = ["#f5b301", "#a8b3c2", "#cd7f32"];

function Place({
  row,
  place,
  height,
  color,
  hidden,
}: {
  row: RankedProject | undefined;
  place: number;
  height: string;
  color: string;
  hidden: boolean;
}) {
  return (
    <div className="flex w-1/3 max-w-80 flex-col items-center justify-end">
      <div
        className={cn(
          "mb-4 w-full px-2 text-center transition-all duration-700",
          hidden ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100",
        )}
      >
        {row ? (
          <>
            <Trophy className="mx-auto mb-2 size-10 drop-shadow md:size-14" style={{ color: MEDAL[place - 1] }} />
            <div className="text-lg font-bold leading-tight md:text-3xl">{row.project.name}</div>
            {row.project.stand && <div className="mt-1 text-sm opacity-80 md:text-lg">Stand {row.project.stand}</div>}
            <div className="mt-1 text-xl font-semibold md:text-3xl">{row.score?.toFixed(1)}</div>
            {row.tied && <div className="mt-1 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs md:text-sm">Empate</div>}
            {row.project.members.length > 0 && (
              <div className="mx-auto mt-1 line-clamp-2 max-w-64 text-xs opacity-70 md:text-sm">{row.project.members.join(", ")}</div>
            )}
          </>
        ) : (
          <div className="text-sm opacity-50">—</div>
        )}
      </div>
      <div
        className="flex w-full items-start justify-center rounded-t-2xl pt-3 text-4xl font-black md:text-7xl"
        style={{ height, background: "rgba(255,255,255,0.14)", color }}
      >
        {place}°
      </div>
    </div>
  );
}

/** Pantalla de premiación para proyectar: podio, top N y revelado paso a paso. */
export function AwardsScreen({
  event,
  rows,
  categories,
}: {
  event: AwardsEvent;
  rows: RankedProject[];
  categories: { id: string; name: string }[];
}) {
  const [view, setView] = useState<string>("general");
  const [revealed, setRevealed] = useState<number>(Infinity);
  const [fullscreen, setFullscreen] = useState(false);
  const color = event.primary_color;
  const contrast = readableTextColor(color);

  const ranked = useMemo(() => {
    const list =
      view === "general"
        ? rows
        : view.startsWith("sem:")
          ? rankSubset(rows, (r) => r.project.semester === view.slice(4))
          : rankWithin(rows, view);
    return list.filter((r) => r.score !== null && r.rank !== null && r.rank <= event.podium_size);
  }, [rows, view, event.podium_size]);

  const steps = ranked.length;
  const isHidden = (idx: number) => revealed !== Infinity && idx < steps - revealed;

  const next = useCallback(() => setRevealed((r) => (r === Infinity ? Infinity : Math.min(steps, r + 1))), [steps]);
  const prev = useCallback(() => setRevealed((r) => (r === Infinity ? Infinity : Math.max(0, r - 1))), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown"].includes(e.key)) {
        e.preventDefault();
        next();
      }
      if (["ArrowLeft", "PageUp"].includes(e.key)) prev();
    };
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [next, prev]);

  const semesters = semestersOf(rows.map((r) => r.project));
  const title =
    view === "general"
      ? "Ranking general"
      : view.startsWith("sem:")
        ? semesterLabel(view.slice(4))
        : categories.find((c) => c.id === view)?.name;
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top, color-mix(in srgb, ${color} 85%, white) 0%, ${color} 45%, color-mix(in srgb, ${color} 55%, black) 100%)`,
        color: contrast,
      }}
    >
      {/* Controles */}
      <div className="no-print absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2 text-sm opacity-60 transition-opacity hover:opacity-100">
        {(categories.length > 0 || semesters.length > 1) && (
          <select
            value={view}
            onChange={(e) => {
              setView(e.target.value);
              setRevealed((r) => (r === Infinity ? Infinity : 0));
            }}
            className="rounded-lg border border-white/30 bg-black/20 px-2 py-1.5"
            aria-label="Categoría"
          >
            <option value="general">General</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {semesters.length > 1 &&
              semesters.map((s) => (
                <option key={s} value={`sem:${s}`}>
                  {semesterLabel(s)}
                </option>
              ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setRevealed((r) => (r === Infinity ? 0 : Infinity))}
          className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-black/20 px-2 py-1.5"
        >
          <Eye className="size-4" /> {revealed === Infinity ? "Modo revelar" : "Mostrar todo"}
        </button>
        <button
          type="button"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
          className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-black/20 px-2 py-1.5"
        >
          {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          {fullscreen ? "Salir" : "Pantalla completa"}
        </button>
      </div>

      <header className="flex flex-col items-center px-4 pb-4 pt-10 text-center">
        {event.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.logo_url} alt="" className="mb-3 size-16 rounded-xl bg-white object-contain p-1.5 md:size-20" />
        )}
        <h1 className="text-2xl font-black tracking-tight md:text-5xl">{event.name}</h1>
        <p className="mt-2 text-lg opacity-85 md:text-2xl">{title}</p>
      </header>

      {ranked.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xl opacity-80">Aún no hay resultados.</div>
      ) : (
        <main className="flex flex-1 flex-col justify-center px-4 pb-10">
          <div className="mx-auto flex w-full max-w-5xl items-end justify-center gap-3 md:gap-6">
            <Place row={top3[1]} place={2} height="9rem" color={contrast} hidden={!top3[1] || isHidden(1)} />
            <Place row={top3[0]} place={1} height="13rem" color={contrast} hidden={!top3[0] || isHidden(0)} />
            <Place row={top3[2]} place={3} height="6rem" color={contrast} hidden={!top3[2] || isHidden(2)} />
          </div>
          {rest.length > 0 && (
            <ol className="mx-auto mb-8 mt-6 grid w-full max-w-4xl gap-2 md:grid-cols-2">
              {rest.map((r, i) => (
                <li
                  key={r.project.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl bg-white/12 px-4 py-2 transition-all duration-500",
                    isHidden(i + 3) ? "opacity-0" : "opacity-100",
                  )}
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  <span className="w-10 text-2xl font-black">{r.rank}°</span>
                  <span className="min-w-0 flex-1 truncate text-lg font-semibold">{r.project.name}</span>
                  <span className="text-lg font-semibold">{r.score?.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          )}
          {rest.length === 0 && <div className="h-8" />}
        </main>
      )}

      {revealed !== Infinity && (
        <div className="no-print absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/30 px-3 py-1.5 text-sm">
          <button type="button" onClick={prev} aria-label="Anterior" className="p-1">
            <ChevronLeft className="size-5" />
          </button>
          <span>
            {Math.min(revealed, steps)} / {steps} revelados · usa → o espacio
          </span>
          <button type="button" onClick={next} aria-label="Siguiente" className="p-1">
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
