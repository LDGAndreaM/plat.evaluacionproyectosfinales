"use client";

import {
  Crown,
  Download,
  Eye,
  FileUp,
  ImagePlus,
  Loader2,
  Maximize,
  Minimize,
  Minus,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { downloadText } from "@/lib/fields/csv";
import {
  TEAM_COLORS,
  newTeam,
  parseTriviaCsv,
  resizeBoard,
  triviaTemplateCsv,
  triviaToCsv,
  type TriviaData,
  type TriviaQuestion,
} from "@/lib/tools/trivia";
import { uploadAsset } from "@/lib/worksheet/upload";
import { cn, readableTextColor } from "@/lib/utils";

/* =============================== JUEGO =============================== */

interface GameState {
  used: string[];
  scores: Record<string, number>;
}

function useGameState(key: string) {
  const storageKey = `evalqr:trivia:${key}`;
  const [state, setState] = useState<GameState>({ used: [], scores: {} });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, [storageKey]);
  const update = useCallback(
    (fn: (s: GameState) => GameState) =>
      setState((s) => {
        const next = fn(s);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [storageKey],
  );
  return [state, update] as const;
}

function QuestionView({
  data,
  cat,
  row,
  onClose,
  onScore,
  scores,
}: {
  data: TriviaData;
  cat: number;
  row: number;
  onClose: () => void;
  onScore: (teamId: string, delta: number) => void;
  scores: Record<string, number>;
}) {
  const q = data.categories[cat].questions[row];
  const points = data.rowValues[row];
  const [revealed, setRevealed] = useState(false);
  const [left, setLeft] = useState(data.timerSeconds);
  const [running, setRunning] = useState(data.timerSeconds > 0);
  const [awarded, setAwarded] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!running || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setRevealed(true);
        setRunning(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pct = data.timerSeconds ? (left / data.timerSeconds) * 100 : 0;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-violet-950/95 p-4 text-white backdrop-blur sm:p-8" role="dialog" aria-label="Pregunta">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold uppercase tracking-wide text-violet-200 sm:text-base">
          {data.categories[cat].name} · <span className="text-sun">{points} puntos</span>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-violet-200 hover:bg-white/10" aria-label="Volver al tablero">
          <X className="size-6" />
        </button>
      </div>

      {data.timerSeconds > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <Timer className={cn("size-5", left <= 5 && left > 0 && "animate-pulse text-coral")} />
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className={cn("h-full rounded-full transition-all duration-1000 ease-linear", left <= 5 ? "bg-coral" : "bg-turquoise")} style={{ width: `${pct}%` }} />
          </div>
          <span className={cn("w-12 text-right text-xl font-bold tabular-nums", left === 0 && "text-coral")}>{left === 0 ? "¡0!" : left}</span>
          <button type="button" onClick={() => setRunning((r) => !r)} className="rounded-md px-2 py-1 text-xs text-violet-200 ring-1 ring-white/20 hover:bg-white/10">
            {running ? "Pausar" : "Seguir"}
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto py-4 text-center">
        {q.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.image} alt="" className="max-h-[38vh] max-w-full rounded-xl bg-white object-contain p-1" />
        )}
        <p className="max-w-4xl whitespace-pre-wrap text-2xl font-bold leading-snug sm:text-4xl">{q.question || "Pregunta sin texto"}</p>
        {revealed ? (
          <div className="rounded-2xl bg-turquoise px-6 py-3 text-xl font-bold text-violet-950 shadow-lg sm:text-3xl">{q.answer || "(Sin respuesta escrita)"}</div>
        ) : (
          <Button
            size="lg"
            onClick={() => {
              setRevealed(true);
              setRunning(false);
            }}
            className="bg-white text-violet-800 hover:bg-violet-100"
          >
            <Eye className="size-5" /> Mostrar respuesta
          </Button>
        )}
      </div>

      {data.teams.length > 0 && (
        <div className="space-y-2">
          <p className="text-center text-xs text-violet-200">¿Quién respondió? Suma o resta {points} puntos:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {data.teams.map((t) => {
              const a = awarded[t.id] ?? 0;
              return (
                <div key={t.id} className="flex items-center gap-1 rounded-xl bg-white/10 p-1 pl-3">
                  <span className="size-3 rounded-full" style={{ background: t.color }} />
                  <span className="mr-1 max-w-[9rem] truncate font-semibold">{t.name}</span>
                  <span className="mr-1 text-sm tabular-nums text-violet-200">{scores[t.id] ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onScore(t.id, points);
                      setAwarded((x) => ({ ...x, [t.id]: a + points }));
                    }}
                    className="grid size-9 place-items-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                    aria-label={`Sumar ${points} a ${t.name}`}
                  >
                    <Plus className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onScore(t.id, -points);
                      setAwarded((x) => ({ ...x, [t.id]: a - points }));
                    }}
                    className="grid size-9 place-items-center rounded-lg bg-coral text-white hover:opacity-90"
                    aria-label={`Restar ${points} a ${t.name}`}
                  >
                    <Minus className="size-5" />
                  </button>
                  {a !== 0 && <span className={cn("px-1 text-sm font-bold", a > 0 ? "text-emerald-300" : "text-coral")}>{a > 0 ? `+${a}` : a}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-3 flex justify-center">
        <Button variant="secondary" onClick={onClose}>
          Volver al tablero
        </Button>
      </div>
    </div>
  );
}

/** Tablero para jugar (proyectar en clase). El avance se guarda en este dispositivo. */
export function TriviaGame({ data, title, storageKey }: { data: TriviaData; title: string; storageKey: string }) {
  const [state, update] = useGameState(storageKey);
  const [open, setOpen] = useState<{ cat: number; row: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const step = Math.min(...data.rowValues.filter((v) => v > 0), 100);
  const total = data.categories.reduce((a, c) => a + c.questions.filter((q) => q.question.trim()).length, 0);
  const used = state.used.length;
  const ranking = useMemo(
    () => [...data.teams].map((t) => ({ ...t, score: state.scores[t.id] ?? 0 })).sort((a, b) => b.score - a.score),
    [data.teams, state.scores],
  );
  const leader = ranking[0] && ranking[0].score > 0 && (ranking.length < 2 || ranking[0].score > ranking[1].score) ? ranking[0].id : null;

  const score = (teamId: string, delta: number) =>
    update((s) => ({ ...s, scores: { ...s.scores, [teamId]: (s.scores[teamId] ?? 0) + delta } }));

  return (
    <div
      ref={boxRef}
      className={cn("relative flex min-h-[34rem] flex-col gap-3 rounded-2xl bg-gradient-to-b from-violet-700 to-violet-950 p-3 text-white sm:p-5", fullscreen && "h-screen rounded-none")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-bold sm:text-2xl">{title}</h2>
        <span className="text-sm text-violet-200">
          {used} de {total} preguntas
        </span>
        <Button size="sm" variant="secondary" onClick={() => setShowWinner(true)}>
          <Trophy className="size-4" /> Resultados
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (window.confirm("¿Reiniciar el juego? Se borran los puntos y se destapan todas las preguntas.")) update(() => ({ used: [], scores: {} }));
          }}
        >
          <RotateCcw className="size-4" /> Reiniciar
        </Button>
        <Button size="sm" variant="secondary" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : boxRef.current?.requestFullscreen())}>
          {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          <span className="hidden sm:inline">{fullscreen ? "Salir" : "Pantalla completa"}</span>
        </Button>
      </div>

      {/* Tablero */}
      <div className="grid min-h-0 flex-1 gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${data.categories.length}, minmax(0, 1fr))` }}>
        {data.categories.map((c) => (
          <div
            key={c.id}
            className="flex min-h-14 items-center justify-center rounded-lg bg-white/10 px-1 py-2 text-center text-xs font-bold uppercase leading-tight tracking-wide sm:text-base"
          >
            <span className="line-clamp-3 break-words">{c.name || "—"}</span>
          </div>
        ))}
        {data.rowValues.map((value, r) =>
          data.categories.map((c, ci) => {
            const key = `${ci}-${r}`;
            const q = c.questions[r];
            const has = !!q?.question.trim();
            const isUsed = state.used.includes(key);
            return (
              <button
                key={key}
                type="button"
                disabled={!has || isUsed}
                onClick={() => {
                  setOpen({ cat: ci, row: r });
                  update((s) => (s.used.includes(key) ? s : { ...s, used: [...s.used, key] }));
                }}
                className={cn(
                  "grid place-items-center rounded-lg text-xl font-black transition-transform sm:text-4xl",
                  fullscreen ? "min-h-0" : "min-h-14 sm:min-h-20",
                  isUsed ? "bg-white/5 text-white/20" : has ? "bg-violet-500 text-sun shadow-md hover:scale-[1.03] hover:bg-violet-400" : "bg-white/5 text-white/10",
                )}
                aria-label={`${c.name} por ${value} puntos${isUsed ? " (usada)" : ""}`}
              >
                {value}
              </button>
            );
          }),
        )}
      </div>

      {/* Marcador */}
      {data.teams.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {data.teams.map((t) => (
            <div key={t.id} className="flex items-center gap-1 rounded-xl bg-white px-2 py-1 text-slate-900 shadow">
              <span className="size-3 rounded-full" style={{ background: t.color }} />
              {leader === t.id && <Crown className="size-4 text-sun" />}
              <span className="max-w-[8rem] truncate text-sm font-semibold">{t.name}</span>
              <span className="min-w-12 text-right text-lg font-black tabular-nums" style={{ color: t.color }}>
                {state.scores[t.id] ?? 0}
              </span>
              <button type="button" onClick={() => score(t.id, -step)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100" aria-label={`Restar ${step} a ${t.name}`}>
                <Minus className="size-3.5" />
              </button>
              <button type="button" onClick={() => score(t.id, step)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100" aria-label={`Sumar ${step} a ${t.name}`}>
                <Plus className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <QuestionView key={`${open.cat}-${open.row}`} data={data} cat={open.cat} row={open.row} scores={state.scores} onScore={score} onClose={() => setOpen(null)} />
      )}

      {showWinner && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-violet-950/95 p-6 text-center">
          <Trophy className="size-14 text-sun" />
          <h3 className="text-3xl font-black">Resultados</h3>
          <ol className="w-full max-w-md space-y-2">
            {ranking.map((t, i) => (
              <li key={t.id} className={cn("flex items-center gap-3 rounded-xl px-4 py-2 text-left", i === 0 ? "bg-sun text-violet-950" : "bg-white/10")}>
                <span className="w-8 text-2xl font-black">{i + 1}°</span>
                <span className="size-3 rounded-full" style={{ background: t.color }} />
                <span className="flex-1 truncate text-lg font-bold">{t.name}</span>
                <span className="text-2xl font-black tabular-nums">{t.score}</span>
              </li>
            ))}
          </ol>
          <Button variant="secondary" onClick={() => setShowWinner(false)}>
            Volver al tablero
          </Button>
        </div>
      )}
    </div>
  );
}

/* =============================== EDITOR =============================== */

function QuestionEditor({
  q,
  title,
  onSave,
  onClose,
}: {
  q: TriviaQuestion;
  title: string;
  onSave: (q: TriviaQuestion) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(q);
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-violet-700">{title}</p>
      <Field label="Pregunta o pista" htmlFor="tq-q">
        <Textarea id="tq-q" rows={3} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} autoFocus />
      </Field>
      <Field label="Respuesta" htmlFor="tq-a">
        <Textarea id="tq-a" rows={2} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
      </Field>
      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-800">Imagen (opcional)</span>
        {draft.image ? (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.image} alt="" className="max-h-32 rounded-lg border border-slate-200" />
            <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, image: undefined })}>
              <Trash2 className="size-4 text-red-600" /> Quitar
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-3 text-sm hover:border-slate-400">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {uploading ? "Subiendo…" : "Subir imagen"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (f.size > 8 * 1024 * 1024) return window.alert("La imagen debe pesar menos de 8 MB.");
                setUploading(true);
                try {
                  setDraft((d) => ({ ...d, image: undefined }));
                  const url = await uploadAsset(f, f.name, "trivia");
                  setDraft((d) => ({ ...d, image: url }));
                } catch (err) {
                  window.alert((err as Error).message);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(draft)} disabled={uploading}>
          Guardar pregunta
        </Button>
      </div>
    </div>
  );
}

export function TriviaTool({
  data,
  onChange,
  title,
  storageKey,
}: {
  data: TriviaData;
  onChange: (d: TriviaData) => void;
  title: string;
  storageKey: string;
}) {
  const [mode, setMode] = useState<"edit" | "play">("edit");
  const [editing, setEditing] = useState<{ cat: number; row: number } | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvMsg, setCsvMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const total = data.categories.length * data.rowValues.length;
  const filled = data.categories.reduce((a, c) => a + c.questions.filter((q) => q.question.trim()).length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1" role="tablist">
          {(
            [
              ["edit", "Editar tablero", Pencil],
              ["play", "Jugar", Play],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium", mode === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-slate-500">
          {filled} de {total} preguntas listas
        </span>
      </div>

      {mode === "play" ? (
        <TriviaGame data={data} title={title} storageKey={storageKey} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0 space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid min-w-[560px] gap-2" style={{ gridTemplateColumns: `4.5rem repeat(${data.categories.length}, minmax(0, 1fr))` }}>
                <div />
                {data.categories.map((c, ci) => (
                  <Input
                    key={c.id}
                    value={c.name}
                    onChange={(e) => onChange({ ...data, categories: data.categories.map((x, i) => (i === ci ? { ...x, name: e.target.value.slice(0, 60) } : x)) })}
                    className="h-10 bg-violet-50 text-center font-semibold"
                    aria-label={`Nombre de la categoría ${ci + 1}`}
                    placeholder={`Categoría ${ci + 1}`}
                  />
                ))}
                {data.rowValues.map((v, r) => (
                  <div key={r} className="contents">
                    <Input
                      type="number"
                      min={0}
                      step={50}
                      value={v}
                      onChange={(e) => onChange({ ...data, rowValues: data.rowValues.map((x, i) => (i === r ? Math.max(0, Number(e.target.value) || 0) : x)) })}
                      className="h-full min-h-16 px-1 text-center font-bold text-violet-700"
                      aria-label={`Puntos de la fila ${r + 1}`}
                    />
                    {data.categories.map((c, ci) => {
                      const q = c.questions[r];
                      const has = !!q?.question.trim();
                      return (
                        <button
                          key={`${c.id}-${r}`}
                          type="button"
                          onClick={() => setEditing({ cat: ci, row: r })}
                          className={cn(
                            "min-h-16 rounded-lg border p-2 text-left text-xs leading-snug",
                            has ? "border-violet-200 bg-white text-slate-700 hover:border-violet-400" : "border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400",
                          )}
                        >
                          {has ? (
                            <>
                              <span className="line-clamp-2">{q.question}</span>
                              <span className="mt-1 line-clamp-1 font-semibold text-turquoise-700">{q.answer || "(sin respuesta)"}</span>
                            </>
                          ) : (
                            <span className="flex h-full items-center justify-center gap-1">
                              <Plus className="size-3.5" /> Pregunta
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">Haz clic en una casilla para escribir la pregunta y su respuesta. Los números de la izquierda son los puntos de cada fila.</p>
          </section>

          <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categorías">
                <Select value={data.categories.length} onChange={(e) => onChange(resizeBoard(data, Number(e.target.value), data.rowValues.length))} className="h-9">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Filas">
                <Select value={data.rowValues.length} onChange={(e) => onChange(resizeBoard(data, data.categories.length, Number(e.target.value)))} className="h-9">
                  {[3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Tiempo para responder">
              <Select value={data.timerSeconds} onChange={(e) => onChange({ ...data, timerSeconds: Number(e.target.value) })} className="h-9">
                <option value={0}>Sin temporizador</option>
                {[15, 30, 45, 60, 90].map((s) => (
                  <option key={s} value={s}>
                    {s} segundos
                  </option>
                ))}
              </Select>
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">Equipos</span>
                {data.teams.length < 8 && (
                  <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline" onClick={() => onChange({ ...data, teams: [...data.teams, newTeam(data.teams.length)] })}>
                    <Plus className="size-4" /> Agregar
                  </button>
                )}
              </div>
              {data.teams.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2">
                  <select
                    value={t.color}
                    onChange={(e) => onChange({ ...data, teams: data.teams.map((x) => (x.id === t.id ? { ...x, color: e.target.value } : x)) })}
                    className="h-9 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-slate-300 text-transparent"
                    style={{ background: t.color }}
                    aria-label={`Color de ${t.name}`}
                  >
                    {TEAM_COLORS.map((c) => (
                      <option key={c} value={c} style={{ background: c, color: readableTextColor(c) }}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={t.name}
                    onChange={(e) => onChange({ ...data, teams: data.teams.map((x) => (x.id === t.id ? { ...x, name: e.target.value.slice(0, 40) } : x)) })}
                    className="h-9"
                    aria-label={`Nombre del equipo ${i + 1}`}
                  />
                  <button
                    type="button"
                    disabled={data.teams.length <= 1}
                    onClick={() => onChange({ ...data, teams: data.teams.filter((x) => x.id !== t.id) })}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30"
                    aria-label={`Quitar ${t.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-sm font-medium text-slate-800">Preguntas desde Excel</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => (setCsvMsg(null), setCsvOpen(true))}>
                  <FileUp className="size-4" /> Importar CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={() => downloadText(`${title || "tablero"}.csv`, triviaToCsv(data))} disabled={!filled}>
                  <Download className="size-4" /> Exportar
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => setMode("play")} disabled={!filled}>
              <Play className="size-4" /> Jugar
            </Button>
          </aside>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Pregunta">
        {editing && (
          <QuestionEditor
            key={`${editing.cat}-${editing.row}`}
            q={data.categories[editing.cat].questions[editing.row]}
            title={`${data.categories[editing.cat].name || `Categoría ${editing.cat + 1}`} · ${data.rowValues[editing.row]} puntos`}
            onClose={() => setEditing(null)}
            onSave={(q) => {
              onChange({
                ...data,
                categories: data.categories.map((c, ci) =>
                  ci === editing.cat ? { ...c, questions: c.questions.map((x, r) => (r === editing.row ? q : x)) } : c,
                ),
              });
              setEditing(null);
            }}
          />
        )}
      </Modal>

      <Modal open={csvOpen} onClose={() => setCsvOpen(false)} title="Importar preguntas desde Excel (CSV)">
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Usa las columnas <strong>categoria</strong>, <strong>puntos</strong>, <strong>pregunta</strong> y <strong>respuesta</strong> (una pregunta por
            fila). Guarda como <em>CSV UTF-8</em>. Se reemplazará el tablero actual (máximo 6 categorías y 6 filas).
          </p>
          <Button size="sm" variant="secondary" onClick={() => downloadText("plantilla-trivia.csv", triviaTemplateCsv())}>
            <Download className="size-4" /> Descargar plantilla
          </Button>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 hover:border-slate-400">
            <Upload className="size-5 text-slate-400" /> Selecciona tu archivo .csv
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const r = parseTriviaCsv(await f.text(), data);
                if (!r.data) return setCsvMsg({ ok: false, text: r.error ?? "No se pudo leer el archivo." });
                if (filled && !window.confirm("¿Reemplazar el tablero actual con las preguntas del archivo?")) return;
                onChange(r.data);
                setCsvMsg({ ok: true, text: `Se importaron ${r.count} preguntas. Revisa y presiona Guardar.` });
              }}
            />
          </label>
          {csvMsg && <p className={cn("rounded-lg px-3 py-2", csvMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>{csvMsg.text}</p>}
        </div>
      </Modal>
    </div>
  );
}
