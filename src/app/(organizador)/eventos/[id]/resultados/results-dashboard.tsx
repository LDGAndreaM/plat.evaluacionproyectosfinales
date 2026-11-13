"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquareText,
  MonitorPlay,
  Radio,
  Scale,
  Trophy,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { formatAnswer } from "@/lib/fields/format";
import { isLayout } from "@/lib/fields/types";
import type { ResultsData } from "@/lib/results";
import { computeRanking, rankSubset, type RankedProject } from "@/lib/scoring/ranking";
import { createClient } from "@/lib/supabase/client";
import type { ScoreMethod, Submission } from "@/lib/types";
import { SCORE_METHOD_LABELS, cn, formatDateTime, semesterLabel, semestersOf } from "@/lib/utils";
import { clearTiebreak, setScoreMethod, setTiebreak } from "./actions";
import { exportCsv, exportExcel, exportPdf } from "./exports";

const MEDAL = ["#f5b301", "#94a3b8", "#cd7f32"];

export function ResultsDashboard({ data, canEdit }: { data: ResultsData; canEdit: boolean }) {
  const router = useRouter();
  const { event } = data;
  const [method, setMethod] = useState<ScoreMethod>(event.score_method);
  const [view, setView] = useState("general");
  const [semester, setSemester] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [responsesFor, setResponsesFor] = useState<RankedProject | null>(null);
  const [tieGroup, setTieGroup] = useState<RankedProject[] | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "off">("connecting");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Actualización en tiempo real (con respaldo cada 30 s) */
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    const refresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        router.refresh();
        setLastUpdate(new Date());
      }, 800);
    };
    (async () => {
      // El canal debe usar la sesión del organizador para que las reglas de seguridad le permitan ver los cambios
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`resultados-${event.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `event_id=eq.${event.id}` }, refresh)
        .subscribe((status) =>
          setLive(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "off" : "connecting"),
        );
    })();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [event.id, router]);

  const rows = useMemo(
    () =>
      computeRanking({
        projects: data.projects,
        submissions: data.submissions,
        fieldsByForm: data.fieldsByForm,
        method,
      }),
    [data, method],
  );
  const semesters = semestersOf(data.projects);
  const visibleRows =
    view === "general" && semester === "all"
      ? rows
      : rankSubset(
          rows,
          (r) => (view === "general" || r.project.category_id === view) && (semester === "all" || r.project.semester === semester),
        );
  const scopeLabel = [view === "general" ? "" : (data.categories.find((c) => c.id === view)?.name ?? ""), semester === "all" ? "" : semesterLabel(semester)]
    .filter(Boolean)
    .join(" · ");
  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name;
  const evaluatorsWithSubs = new Set(data.submissions.map((s) => s.evaluator_id)).size;
  const lowCount = rows.filter((r) => r.count < event.min_evaluations);
  const maxScore = Math.max(1, ...rows.map((r) => r.score ?? 0));
  const podium = visibleRows.filter((r) => r.rank !== null && r.rank <= event.podium_size);
  const tiedInPodium = podium.filter((r) => r.tied);

  function changeMethod(m: ScoreMethod) {
    setMethod(m);
    if (canEdit)
      start(async () => {
        await setScoreMethod(event.id, m);
      });
  }

  async function runExport(kind: "excel" | "csv" | "pdf") {
    setExporting(kind);
    try {
      if (kind === "csv") exportCsv({ ...data, event: { ...event, score_method: method } }, rows);
      if (kind === "excel") await exportExcel({ ...data, event: { ...event, score_method: method } }, rows);
      if (kind === "pdf") await exportPdf({ ...data, event: { ...event, score_method: method } }, rows);
    } catch (e) {
      window.alert(`No se pudo exportar: ${(e as Error).message}`);
    } finally {
      setExporting(null);
    }
  }

  function openTie(r: RankedProject) {
    const group = visibleRows.filter((x) => x.score === r.score && x.tied);
    setTieGroup(group.length > 1 ? group : rows.filter((x) => x.score === r.score));
  }

  if (data.projects.length === 0)
    return <EmptyState icon={<Trophy className="size-10" />} title="Sin proyectos" description="Agrega proyectos para ver resultados." />;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm text-slate-500">Evaluaciones enviadas</div>
          <div className="mt-1 text-2xl font-semibold">{data.submissions.length}</div>
          {data.drafts > 0 && <div className="text-xs text-slate-500">{data.drafts} en progreso</div>}
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500">Evaluadores</div>
          <div className="mt-1 text-2xl font-semibold">{evaluatorsWithSubs}</div>
          <div className="text-xs text-slate-500">{data.evaluators.length} registrados</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-500">Promedio por proyecto</div>
          <div className="mt-1 text-2xl font-semibold">
            {(data.submissions.length / Math.max(1, data.projects.length)).toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">evaluaciones</div>
        </Card>
        <Card className={cn("p-4", lowCount.length > 0 && "border-amber-300 bg-amber-50")}>
          <div className="text-sm text-slate-500">Con pocas evaluaciones</div>
          <div className="mt-1 text-2xl font-semibold">{lowCount.length}</div>
          <div className="text-xs text-slate-500">menos de {event.min_evaluations}</div>
        </Card>
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            live === "live" ? "bg-emerald-100 text-emerald-800" : live === "off" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800",
          )}
          title={lastUpdate ? `Última actualización: ${lastUpdate.toLocaleTimeString("es-MX")}` : undefined}
        >
          <Radio className={cn("size-3.5", live === "live" && "animate-pulse")} />
          {live === "live" ? "En vivo" : live === "off" ? "Sin conexión en vivo" : "Conectando…"}
        </span>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Scale className="size-4" />
          <span className="hidden sm:inline">Cálculo:</span>
          <Select value={method} onChange={(e) => changeMethod(e.target.value as ScoreMethod)} className="h-9 w-auto" aria-label="Método de cálculo">
            {(Object.keys(SCORE_METHOD_LABELS) as ScoreMethod[]).map((m) => (
              <option key={m} value={m}>
                {SCORE_METHOD_LABELS[m]}
              </option>
            ))}
          </Select>
          {pending && <Loader2 className="size-4 animate-spin" />}
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => runExport("excel")} disabled={!!exporting}>
            {exporting === "excel" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => runExport("csv")} disabled={!!exporting}>
            <Download className="size-4" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => runExport("pdf")} disabled={!!exporting}>
            {exporting === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} PDF
          </Button>
          <LinkButton href={`/premiacion/${event.short_code}`} target="_blank" size="sm">
            <MonitorPlay className="size-4" /> Pantalla de premiación
          </LinkButton>
        </div>
      </div>

      {/* Filtro por semestre */}
      {semesters.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Semestre:</span>
          {["all", ...semesters].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSemester(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                semester === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
              )}
            >
              {s === "all" ? "Todos" : semesterLabel(s)}
            </button>
          ))}
        </div>
      )}

      {/* Pestañas por categoría */}
      {data.categories.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-1 rounded-xl bg-slate-200/70 p-1" role="tablist">
            {[{ id: "general", name: "General" }, ...data.categories].map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={view === c.id}
                onClick={() => setView(c.id)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium",
                  view === c.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Podio */}
      {podium.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader
            title={`Podio ${scopeLabel ? `· ${scopeLabel}` : "general"}`}
            description={event.podium_size === 1 ? "Solo ganador" : `Top ${event.podium_size} (configurable en Ajustes)`}
          />
          {tiedInPodium.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900">
              <AlertTriangle className="size-4" /> Hay empates dentro del podio.
              {canEdit && (
                <Button size="sm" variant="secondary" onClick={() => openTie(tiedInPodium[0])}>
                  Desempatar
                </Button>
              )}
            </div>
          )}
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {podium.slice(0, Math.max(3, event.podium_size)).map((r) => (
              <div
                key={r.project.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3",
                  r.rank === 1 ? "border-amber-300 bg-amber-50" : "border-slate-200",
                )}
              >
                <Trophy className="size-8 shrink-0" style={{ color: MEDAL[(r.rank ?? 4) - 1] ?? "#cbd5e1" }} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    {r.rank}° lugar {r.tied && <Badge tone="amber">Empate</Badge>}
                  </div>
                  <div className="truncate font-semibold text-slate-900">{r.project.name}</div>
                  <div className="text-sm text-slate-600">{r.score?.toFixed(2)} pts</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ranking */}
      <Card className="overflow-hidden">
        <CardHeader
          title={scopeLabel ? `Ranking · ${scopeLabel}` : "Ranking general"}
          description={`${SCORE_METHOD_LABELS[method]}. Calificación de cada evaluación de 0 a 100.`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="w-16 px-4 py-2">Lugar</th>
                <th className="px-4 py-2">Proyecto</th>
                <th className="w-28 px-4 py-2 text-center">Evaluaciones</th>
                <th className="w-56 px-4 py-2">Puntaje</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((r) => {
                const open = expanded === r.project.id;
                const low = r.count < event.min_evaluations;
                return (
                  <Fragment key={r.project.id}>
                    <tr className={cn("cursor-pointer hover:bg-slate-50", open && "bg-slate-50")} onClick={() => setExpanded(open ? null : r.project.id)}>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-grid size-8 place-items-center rounded-full text-sm font-bold",
                            r.rank && r.rank <= 3 ? "text-white" : "bg-slate-100 text-slate-700",
                          )}
                          style={r.rank && r.rank <= 3 ? { background: MEDAL[r.rank - 1] } : undefined}
                        >
                          {r.rank ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.project.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          {r.project.stand && <span>Stand {r.project.stand}</span>}
                          {r.project.semester && semester === "all" && <Badge tone="blue">{semesterLabel(r.project.semester)}</Badge>}
                          {catName(r.project.category_id) && view === "general" && <Badge tone="violet">{catName(r.project.category_id)}</Badge>}
                          {r.tied && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canEdit) openTie(r);
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800"
                            >
                              <Scale className="size-3" /> Empate{canEdit ? " · desempatar" : ""}
                            </button>
                          )}
                          {r.project.manual_tiebreak !== null && !r.tied && rows.some((x) => x !== r && x.score === r.score) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canEdit) openTie(r);
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800"
                            >
                              <Scale className="size-3" /> Desempate manual
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 font-medium", low ? "text-amber-700" : "text-slate-700")}>
                          {low && <AlertTriangle className="size-4" aria-label="Pocas evaluaciones" />}
                          {r.count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-right font-semibold tabular-nums text-slate-900">{r.score === null ? "—" : r.score.toFixed(2)}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${((r.score ?? 0) / maxScore) * 100}%`, background: event.primary_color }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")} />
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-4 pb-4 pt-1">
                          <Breakdown row={r} color={event.primary_color} evaluators={data.evaluators} onResponses={() => setResponsesFor(r)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Evaluadores */}
      <Card>
        <CardHeader title="Evaluadores" description="Quién ha evaluado y cuántos proyectos." />
        {data.evaluators.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Aún no hay evaluadores registrados.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.evaluators.map((e) => {
              const n = data.submissions.filter((s) => s.evaluator_id === e.id).length;
              return (
                <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <Users className="size-4 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{e.name}</span>
                    {e.institution && <span className="text-slate-500"> · {e.institution}</span>}
                  </span>
                  <span className="text-slate-600">
                    {n} de {data.projects.length}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={!!responsesFor} onClose={() => setResponsesFor(null)} title={`Respuestas · ${responsesFor?.project.name ?? ""}`} size="xl">
        {responsesFor && <Responses data={data} row={responsesFor} />}
      </Modal>

      <Modal open={!!tieGroup} onClose={() => setTieGroup(null)} title="Desempatar">
        {tieGroup && <TieBreaker eventId={event.id} group={tieGroup} onDone={() => setTieGroup(null)} />}
      </Modal>
    </div>
  );
}

function Breakdown({
  row,
  color,
  evaluators,
  onResponses,
}: {
  row: RankedProject;
  color: string;
  evaluators: ResultsData["evaluators"];
  onResponses: () => void;
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Desglose por criterio</h3>
        {row.criteria.length === 0 ? (
          <p className="text-sm text-slate-500">Sin criterios con puntaje.</p>
        ) : (
          <ul className="space-y-2">
            {row.criteria.map((c) => (
              <li key={c.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">
                    {c.label} <span className="text-xs text-slate-400">({c.weight}%)</span>
                  </span>
                  <span className="font-medium tabular-nums">{c.average === null ? "—" : c.average.toFixed(1)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${c.average ?? 0}%`, background: color }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Calificación de cada evaluador</h3>
        {row.scores.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay evaluaciones.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {[...row.scores]
              .sort((a, b) => b.total - a.total)
              .map((s) => (
                <li key={s.submissionId} className="flex justify-between gap-2">
                  <span className="truncate text-slate-700">{evaluators.find((e) => e.id === s.evaluatorId)?.name ?? "Evaluador"}</span>
                  <span className="font-medium tabular-nums">{s.total.toFixed(2)}</span>
                </li>
              ))}
          </ul>
        )}
        <Button size="sm" variant="secondary" className="mt-3" onClick={onResponses} disabled={!row.scores.length}>
          <MessageSquareText className="size-4" /> Ver respuestas y comentarios
        </Button>
      </div>
    </div>
  );
}

function FileLink({ path, name }: { path: string; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="text-violet-700 underline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { data, error } = await createClient().storage.from("submission-files").createSignedUrl(path, 3600);
        setBusy(false);
        if (error || !data) return window.alert("No se pudo abrir el archivo.");
        window.open(data.signedUrl, "_blank", "noopener");
      }}
    >
      {busy ? "Abriendo…" : name}
    </button>
  );
}

function Responses({ data, row }: { data: ResultsData; row: RankedProject }) {
  const subs = data.submissions.filter((s) => s.project_id === row.project.id);
  const scoreOf = new Map(row.scores.map((s) => [s.submissionId, s.total]));
  return (
    <div className="space-y-4">
      {subs.map((s: Submission) => {
        const ev = data.evaluators.find((e) => e.id === s.evaluator_id);
        const fields = (data.fieldsByForm[s.form_id] ?? []).filter((f) => !isLayout(f.type));
        return (
          <section key={s.id} className="rounded-xl border border-slate-200">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <div>
                <div className="font-semibold text-slate-900">{ev?.name ?? "Evaluador"}</div>
                <div className="text-xs text-slate-500">
                  {[ev?.institution, ev?.email, s.submitted_at && `Enviada ${formatDateTime(s.submitted_at)}`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <Badge tone="violet">Calificación: {scoreOf.get(s.id)?.toFixed(2) ?? "—"}</Badge>
            </header>
            <dl className="divide-y divide-slate-100">
              {fields.map((f) => {
                const v = s.answers?.[f.id];
                if (v === undefined || v === null || v === "") return null;
                return (
                  <div key={f.id} className="grid gap-1 px-4 py-2 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <dt className="text-slate-500">{f.label}</dt>
                    <dd className={cn("text-slate-900", f.type === "long_text" && "whitespace-pre-line rounded-lg bg-amber-50 px-2 py-1")}>
                      {f.type === "signature" && typeof v === "string" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v} alt="Firma" className="h-16 rounded border border-slate-200 bg-white" />
                      ) : f.type === "file" && (v as { path?: string })?.path ? (
                        <FileLink path={(v as { path: string }).path} name={(v as { name?: string }).name ?? "Archivo"} />
                      ) : (
                        formatAnswer(f, v)
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

function TieBreaker({ eventId, group, onDone }: { eventId: string; group: RankedProject[]; onDone: () => void }) {
  const router = useRouter();
  const [order, setOrder] = useState(group.map((g) => g.project));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const copy = [...order];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setOrder(copy);
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Estos proyectos tienen la misma calificación ({group[0]?.score?.toFixed(2)}). Ordénalos del primero al último según la
        decisión del jurado.
      </p>
      <ol className="space-y-2">
        {order.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <span className="w-6 font-bold text-slate-500">{i + 1}.</span>
            <span className="flex-1 font-medium">{p.name}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Subir">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Bajar">
              <ArrowDown className="size-4" />
            </button>
          </li>
        ))}
      </ol>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {order.some((p) => p.manual_tiebreak !== null) && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await clearTiebreak(eventId, order.map((p) => p.id));
                if (res && !res.ok) setError(res.error);
                else {
                  router.refresh();
                  onDone();
                }
              })
            }
          >
            Quitar desempate
          </Button>
        )}
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setTiebreak(eventId, order.map((p) => p.id));
              if (res && !res.ok) setError(res.error);
              else {
                router.refresh();
                onDone();
              }
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Guardar desempate
        </Button>
      </div>
    </div>
  );
}
