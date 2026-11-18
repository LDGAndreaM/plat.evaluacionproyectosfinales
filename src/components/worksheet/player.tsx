"use client";

import { Check, ExternalLink, Headphones, Link as LinkIcon, Mic, MicOff, Pause, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { GradeResult } from "@/lib/worksheet/grading";
import { acceptedAnswers } from "@/lib/worksheet/grading";
import { placementCells } from "@/lib/tools/wordsearch";
import type { WorksheetData, WsAnswers, WsElement, WsPage } from "@/lib/worksheet/types";
import { presentationEmbed, youtubeEmbed } from "@/lib/worksheet/upload";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Utilidades de tamaño: todo se expresa en unidades del contenedor  */
/* (cqw) para que la ficha se vea igual en celular y computadora.     */
/* ------------------------------------------------------------------ */

export function boxStyle(el: WsElement): CSSProperties {
  return { left: `${el.x * 100}%`, top: `${el.y * 100}%`, width: `${el.w * 100}%`, height: `${el.h * 100}%` };
}

/** Tamaño de letra proporcional a la altura del elemento. */
function fontFor(el: WsElement, page: WsPage, factor = 0.58) {
  const ratio = page.height / page.width;
  return `${Math.max(0.9, el.h * ratio * 100 * factor)}cqw`;
}

/** Recorte de la página para mostrar una pieza de "Arrastrar" sin texto. */
export function cropStyle(el: WsElement, page: WsPage): CSSProperties {
  return {
    backgroundImage: `url(${page.url})`,
    backgroundSize: `${100 / el.w}% ${100 / el.h}%`,
    backgroundPosition: `${el.w >= 1 ? 0 : (el.x / (1 - el.w)) * 100}% ${el.h >= 1 ? 0 : (el.y / (1 - el.h)) * 100}%`,
  };
}

function DragFace({ el, page, fixedFont }: { el: WsElement; page: WsPage; fixedFont?: boolean }) {
  if (el.label?.trim())
    return (
      <span
        className="flex h-full w-full items-center justify-center rounded-md border-2 border-sky-500 bg-sky-50 px-1 text-center font-semibold leading-tight text-sky-900 shadow"
        style={{ fontSize: fixedFont ? "15px" : fontFor(el, page, 0.42) }}
      >
        {el.label}
      </span>
    );
  return <span className="block h-full w-full rounded-md border-2 border-sky-500 shadow" style={cropStyle(el, page)} />;
}

/* -------------------------- Sopa de letras ------------------------- */

const FOUND = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe", "#fed7aa"];

function MiniWordSearch({
  el,
  value,
  onChange,
  disabled,
  showAll,
}: {
  el: WsElement;
  value: number[];
  onChange: (v: number[]) => void;
  disabled: boolean;
  showAll: boolean;
}) {
  const [start, setStart] = useState<[number, number] | null>(null);
  const result = el.result;
  if (!result) return <div className="grid h-full place-items-center bg-white/80 text-xs text-slate-500">Sopa sin palabras</div>;
  const colors = new Map<string, string>();
  (showAll ? result.placements.map((_, i) => i) : value).forEach((i) =>
    placementCells(result.placements[i]).forEach(([r, c]) => colors.set(`${r},${c}`, FOUND[i % FOUND.length])),
  );

  function pick(r: number, c: number) {
    if (disabled || !result) return;
    if (!start) return setStart([r, c]);
    const [r0, c0] = start;
    setStart(null);
    const dr = Math.sign(r - r0);
    const dc = Math.sign(c - c0);
    const len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
    if ((r !== r0 && c !== c0 && Math.abs(r - r0) !== Math.abs(c - c0)) || len < 2) return;
    const key = Array.from({ length: len }, (_, i) => `${r0 + dr * i},${c0 + dc * i}`);
    const idx = result.placements.findIndex((p, i) => {
      if (value.includes(i)) return false;
      const k = placementCells(p).map(([a, b]) => `${a},${b}`);
      return k.join("|") === key.join("|") || k.join("|") === [...key].reverse().join("|");
    });
    if (idx >= 0) onChange([...value, idx]);
  }

  return (
    <div
      className="grid h-full w-full select-none overflow-hidden rounded-md border border-slate-400 bg-white"
      style={{ gridTemplateColumns: `repeat(${result.size}, 1fr)`, gridTemplateRows: `repeat(${result.size}, 1fr)`, containerType: "size" }}
    >
      {result.grid.map((row, r) =>
        row.map((ch, c) => (
          <button
            key={`${r},${c}`}
            type="button"
            onClick={() => pick(r, c)}
            className={cn("grid place-items-center font-mono font-bold text-slate-800", start && start[0] === r && start[1] === c && "bg-violet-300")}
            style={{ background: colors.get(`${r},${c}`), fontSize: `${70 / result.size}cqh` }}
            tabIndex={-1}
          >
            {ch}
          </button>
        )),
      )}
    </div>
  );
}

/* ------------------------------ Hablar ----------------------------- */

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

function SpeakButton({ el, page, value, onChange, disabled }: { el: WsElement; page: WsPage; value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [listening, setListening] = useState(false);
  const [typing, setTyping] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const supported =
    typeof window !== "undefined" &&
    !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  function start() {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return setTyping(true);
    const rec = new Ctor();
    rec.lang = el.lang || "es-MX";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => onChange(e.results[0][0].transcript);
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  if (typing || (!supported && !disabled))
    return (
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe lo que dirías"
        className="h-full w-full rounded-md border-2 border-dashed border-rose-400 bg-white/90 px-1 outline-none"
        style={{ fontSize: fontFor(el, page, 0.45) }}
      />
    );

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (listening ? recRef.current?.stop() : start())}
      className={cn(
        "flex h-full w-full items-center justify-center gap-1 overflow-hidden rounded-full border-2 px-1 font-medium",
        listening ? "animate-pulse border-rose-600 bg-rose-600 text-white" : "border-rose-400 bg-white/90 text-rose-700",
      )}
      style={{ fontSize: fontFor(el, page, 0.42) }}
      title={value ? `Dijiste: ${value}` : "Presiona y habla"}
    >
      {listening ? <MicOff className="size-[1.2em] shrink-0" /> : <Mic className="size-[1.2em] shrink-0" />}
      <span className="truncate">{listening ? "Escuchando…" : value || "Hablar"}</span>
    </button>
  );
}

/* ------------------------------ Audio ------------------------------ */

function AudioButton({ src }: { src?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  if (!src) return <div className="grid h-full w-full place-items-center rounded-full bg-violet-100 text-xs text-violet-700">Sin audio</div>;
  return (
    <>
      <audio ref={ref} src={src} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} preload="none" />
      <button
        type="button"
        onClick={() => (playing ? ref.current?.pause() : ref.current?.play())}
        className="grid h-full w-full place-items-center rounded-full bg-violet-600 text-white shadow hover:bg-violet-700"
        aria-label={playing ? "Pausar audio" : "Reproducir audio"}
      >
        {playing ? <Pause className="size-[55%]" /> : <Play className="size-[55%]" />}
      </button>
    </>
  );
}

function speak(text: string, lang?: string) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || "es-MX";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

/* --------------------------- Reproductor --------------------------- */

export interface PlayerProps {
  data: WorksheetData;
  answers: WsAnswers;
  onAnswers?: (a: WsAnswers) => void;
  /** Muestra correcto/incorrecto */
  grade?: GradeResult | null;
  /** Muestra las respuestas correctas */
  reveal?: boolean;
  readOnly?: boolean;
}

export function WorksheetPlayer({ data, answers, onAnswers, grade, reveal, readOnly }: PlayerProps) {
  const disabled = !!readOnly || !onAnswers;
  const [selectedDrag, setSelectedDrag] = useState<string | null>(null);
  const [joinFrom, setJoinFrom] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(null);
  const dragging = useRef<{ id: string; moved: boolean; sx: number; sy: number } | null>(null);

  const elements = data.elements;
  const byId = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  // Dónde está cada pieza (dropId → dragId)
  const placedIn = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of elements) if (e.type === "drop" && typeof answers[e.id] === "string") m.set(answers[e.id] as string, e.id);
    return m;
  }, [elements, answers]);

  const setAnswer = (patch: WsAnswers) => onAnswers?.({ ...answers, ...patch });

  function placeDrag(dragId: string, dropId: string) {
    const next: WsAnswers = { ...answers };
    for (const e of elements) if (e.type === "drop" && next[e.id] === dragId) delete next[e.id];
    next[dropId] = dragId;
    onAnswers?.(next);
  }

  function removeFromDrop(dropId: string) {
    const next = { ...answers };
    delete next[dropId];
    onAnswers?.(next);
  }

  function connect(a: string, b: string) {
    const next = { ...answers };
    for (const id of [a, b]) {
      const old = next[id];
      if (typeof old === "string") delete next[old];
    }
    next[a] = b;
    next[b] = a;
    onAnswers?.(next);
  }

  // Arrastre con puntero (mouse y touch)
  useEffect(() => {
    function move(e: PointerEvent) {
      const d = dragging.current;
      if (!d) return;
      if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 6) d.moved = true;
      if (d.moved) setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
    }
    function up(e: PointerEvent) {
      const d = dragging.current;
      if (!d) return;
      dragging.current = null;
      setGhost(null);
      if (!d.moved) {
        setSelectedDrag((s) => (s === d.id ? null : d.id));
        return;
      }
      const target = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((n) => (n as HTMLElement).dataset?.dropId)
        .find(Boolean);
      if (target) placeDrag(d.id, target);
      setSelectedDrag(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  });

  const mark = (id: string) => {
    const r = grade?.byElement[id];
    if (!r || r.correct === null) return null;
    return r.correct ? "ok" : "bad";
  };

  function renderElement(el: WsElement, page: WsPage): ReactNode {
    const v = answers[el.id];
    const status = mark(el.id);
    const ring = status === "ok" ? "ring-[3px] ring-emerald-500" : status === "bad" ? "ring-[3px] ring-red-500" : "";
    switch (el.type) {
      case "textfield":
        return (
          <div className={cn("h-full w-full rounded", ring)} title={reveal ? `Correcta: ${acceptedAnswers(el).join(" / ")}` : undefined}>
            <input
              value={typeof v === "string" ? v : ""}
              disabled={disabled}
              onChange={(e) => setAnswer({ [el.id]: e.target.value })}
              placeholder={el.placeholder}
              aria-label="Respuesta"
              autoComplete="off"
              className="h-full w-full rounded border-2 border-dashed border-sky-400 bg-white/85 px-[0.3em] text-slate-900 outline-none focus:border-solid focus:border-sky-600 disabled:opacity-100"
              style={{ fontSize: fontFor(el, page) }}
            />
            {reveal && status === "bad" && (
              <span className="absolute left-0 top-full z-10 mt-0.5 whitespace-nowrap rounded bg-emerald-600 px-1 text-[11px] text-white">
                {acceptedAnswers(el)[0]}
              </span>
            )}
          </div>
        );
      case "single": {
        const on = v === true;
        const group = el.group?.trim() || el.id;
        const showCorrect = reveal && el.correct;
        return (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={on}
            aria-label="Elegir esta opción"
            onClick={() => {
              const patch: WsAnswers = {};
              for (const e of elements) if (e.type === "single" && (e.group?.trim() || e.id) === group) patch[e.id] = false;
              patch[el.id] = true;
              setAnswer(patch);
            }}
            className={cn(
              "grid h-full w-full place-items-center rounded-full border-2 bg-white/80",
              on ? "border-violet-700 bg-violet-600/80" : "border-violet-500",
              showCorrect && "outline outline-[3px] outline-emerald-500",
              ring,
            )}
          >
            {on && <span className="block h-1/2 w-1/2 rounded-full bg-white" />}
          </button>
        );
      }
      case "checkbox": {
        const on = v === true;
        return (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={on}
            aria-label="Marcar casilla"
            onClick={() => setAnswer({ [el.id]: !on })}
            className={cn(
              "grid h-full w-full place-items-center rounded-[20%] border-2 bg-white/80",
              on ? "border-emerald-700 bg-emerald-500 text-white" : "border-emerald-500",
              ring,
            )}
          >
            {on && <Check className="h-[80%] w-[80%]" strokeWidth={3} />}
          </button>
        );
      }
      case "select":
        return (
          <select
            value={typeof v === "number" ? v : ""}
            disabled={disabled}
            onChange={(e) => setAnswer({ [el.id]: e.target.value === "" ? undefined : Number(e.target.value) })}
            aria-label="Elegir respuesta"
            className={cn("h-full w-full rounded border-2 border-amber-400 bg-white/90 px-[0.2em] text-slate-900", ring)}
            style={{ fontSize: fontFor(el, page, 0.5) }}
          >
            <option value="">—</option>
            {(el.options ?? []).map((o, i) => (
              <option key={i} value={i}>
                {o}
              </option>
            ))}
          </select>
        );
      case "wordsearch":
        return (
          <div className={cn("h-full w-full rounded-md", ring)}>
            <MiniWordSearch
              el={el}
              value={Array.isArray(v) ? (v as number[]) : []}
              onChange={(nv) => setAnswer({ [el.id]: nv })}
              disabled={disabled}
              showAll={!!reveal}
            />
          </div>
        );
      case "speak":
        return (
          <div className={cn("h-full w-full rounded-full", ring)}>
            <SpeakButton el={el} page={page} value={typeof v === "string" ? v : ""} onChange={(nv) => setAnswer({ [el.id]: nv })} disabled={disabled} />
          </div>
        );
      case "drag": {
        if (placedIn.has(el.id)) return <div className="h-full w-full rounded-md border-2 border-dashed border-sky-300 bg-sky-50/40" />;
        return (
          <button
            type="button"
            disabled={disabled}
            onPointerDown={(e) => {
              if (disabled) return;
              e.preventDefault();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              dragging.current = { id: el.id, moved: false, sx: e.clientX, sy: e.clientY };
              setGhost({ id: el.id, x: e.clientX, y: e.clientY, w: rect.width, h: rect.height });
            }}
            className={cn("h-full w-full cursor-grab touch-none rounded-md active:cursor-grabbing", selectedDrag === el.id && "ring-4 ring-sky-400")}
            aria-label={el.label ? `Pieza: ${el.label}` : "Pieza para arrastrar"}
          >
            <DragFace el={el} page={page} />
          </button>
        );
      }
      case "drop": {
        const dragId = typeof v === "string" ? v : null;
        const drag = dragId ? byId.get(dragId) : undefined;
        const dragPage = drag ? data.pages[drag.page] : undefined;
        return (
          <div
            data-drop-id={el.id}
            onClick={() => {
              if (disabled) return;
              if (selectedDrag) {
                placeDrag(selectedDrag, el.id);
                setSelectedDrag(null);
              } else if (dragId) removeFromDrop(el.id);
            }}
            className={cn(
              "h-full w-full rounded-md border-2 border-dashed",
              selectedDrag ? "border-sky-600 bg-sky-100/70" : "border-slate-500 bg-white/40",
              ring,
            )}
            title={dragId && !disabled ? "Toca para quitar la pieza" : undefined}
          >
            {drag && dragPage && (
              <div data-drop-id={el.id} className="pointer-events-none h-full w-full">
                <DragFace el={drag} page={dragPage} />
              </div>
            )}
          </div>
        );
      }
      case "join": {
        const connected = typeof v === "string";
        return (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (joinFrom === el.id) return setJoinFrom(null);
              if (joinFrom) {
                connect(joinFrom, el.id);
                setJoinFrom(null);
              } else setJoinFrom(el.id);
            }}
            aria-label="Punto para unir"
            className={cn(
              "h-full w-full rounded-full border-2",
              joinFrom === el.id ? "scale-125 border-orange-700 bg-orange-500" : connected ? "border-orange-700 bg-orange-400" : "border-orange-600 bg-white",
              ring,
            )}
          />
        );
      }
      case "mp3":
        return <AudioButton src={el.url} />;
      case "open":
        return (
          <textarea
            value={typeof v === "string" ? v : ""}
            disabled={disabled}
            onChange={(e) => setAnswer({ [el.id]: e.target.value })}
            aria-label="Respuesta abierta"
            className="h-full w-full resize-none rounded border-2 border-dashed border-teal-500 bg-white/85 p-[0.3em] text-slate-900 outline-none focus:border-solid"
            style={{ fontSize: `${Math.max(0.9, 1.6)}cqw` }}
          />
        );
      case "text":
        return (
          <div
            className="flex h-full w-full items-center overflow-hidden whitespace-pre-wrap px-[0.2em] leading-tight"
            style={{ fontSize: `${(el.fontSize ?? 16) / 10}cqw`, color: el.color || "#0f172a", background: el.bg || "transparent" }}
          >
            {el.text}
          </div>
        );
      case "listening":
        return (
          <button
            type="button"
            onClick={() => speak(el.text ?? "", el.lang)}
            className="grid h-full w-full place-items-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600"
            aria-label="Escuchar"
          >
            <Headphones className="size-[55%]" />
          </button>
        );
      case "link":
        return el.url && el.url !== "https://" ? (
          <a
            href={el.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex h-full w-full items-center justify-center gap-1 overflow-hidden rounded border-2 border-blue-400 bg-blue-50/70 px-1 font-medium text-blue-800 underline"
            style={{ fontSize: fontFor(el, page, 0.45) }}
          >
            {el.label ? el.label : <LinkIcon className="size-[1.1em]" />}
            {el.label && <ExternalLink className="size-[0.9em] shrink-0" />}
          </a>
        ) : (
          <div className="h-full w-full rounded border-2 border-dashed border-blue-300" />
        );
      case "powerpoint": {
        const src = presentationEmbed(el.url ?? "");
        return src ? (
          <iframe src={src} className="h-full w-full rounded border border-slate-300 bg-white" allowFullScreen title="Presentación" />
        ) : (
          <div className="grid h-full w-full place-items-center rounded border-2 border-dashed border-orange-300 bg-orange-50/60 text-xs text-orange-800">
            Presentación sin enlace
          </div>
        );
      }
      case "youtube": {
        const src = youtubeEmbed(el.url ?? "", el.start);
        return src ? (
          <iframe
            src={src}
            className="h-full w-full rounded bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video de YouTube"
          />
        ) : (
          <div className="grid h-full w-full place-items-center rounded border-2 border-dashed border-red-300 bg-red-50/60 text-xs text-red-800">
            Video sin enlace
          </div>
        );
      }
    }
  }

  const ghostEl = ghost ? byId.get(ghost.id) : undefined;

  return (
    <div className="space-y-4">
      {data.pages.map((page, pi) => {
        const onPage = elements.filter((e) => e.page === pi);
        const joins = onPage.filter((e) => e.type === "join");
        const lines: { a: WsElement; b: WsElement }[] = [];
        for (const a of joins) {
          const bId = answers[a.id];
          const b = typeof bId === "string" ? byId.get(bId) : undefined;
          if (b && b.page === pi && a.id < b.id) lines.push({ a, b });
        }
        return (
          <div
            key={pi}
            className="relative mx-auto w-full max-w-[1000px] overflow-hidden rounded-lg bg-white shadow"
            style={{ aspectRatio: `${page.width} / ${page.height}`, containerType: "inline-size" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.url} alt={`Página ${pi + 1}`} className="absolute inset-0 h-full w-full select-none" draggable={false} />
            {lines.length > 0 && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                {lines.map(({ a, b }) => {
                  const ok = grade ? grade.byElement[a.id]?.correct ?? grade.byElement[b.id]?.correct : undefined;
                  return (
                    <line
                      key={`${a.id}-${b.id}`}
                      x1={(a.x + a.w / 2) * 1000}
                      y1={(a.y + a.h / 2) * 1000}
                      x2={(b.x + b.w / 2) * 1000}
                      y2={(b.y + b.h / 2) * 1000}
                      stroke={ok === true ? "#10b981" : ok === false ? "#ef4444" : "#ea580c"}
                      strokeWidth={4}
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
            )}
            {onPage.map((el) => (
              <div key={el.id} className="absolute" style={boxStyle(el)}>
                {renderElement(el, page)}
                {grade && grade.byElement[el.id] && grade.byElement[el.id].correct !== null && el.type !== "single" && el.type !== "join" && (
                  <span
                    className={cn(
                      "absolute -right-2 -top-2 z-10 grid size-5 place-items-center rounded-full text-white shadow",
                      grade.byElement[el.id].correct ? "bg-emerald-500" : "bg-red-500",
                    )}
                  >
                    {grade.byElement[el.id].correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
      {ghost && ghostEl && (
        <div
          className="pointer-events-none fixed z-50 opacity-90"
          style={{ left: ghost.x - ghost.w / 2, top: ghost.y - ghost.h / 2, width: ghost.w, height: ghost.h }}
        >
          <DragFace el={ghostEl} page={data.pages[ghostEl.page]} fixedFont />
        </div>
      )}
    </div>
  );
}
