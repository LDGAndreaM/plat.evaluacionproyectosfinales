"use client";

import { AlertCircle, CheckCircle2, ChevronRight, CircleDashed, PencilLine, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Category, Project, Submission } from "@/lib/types";
import { cn, semesterLabel, semestersOf } from "@/lib/utils";
import { useEvaluator } from "./evaluator-context";
import { EventIntro, EventStatusGate, JoinForm, Message, Spinner, WhoAmI, inputClass, secondaryButton } from "./shared";

type Tab = "pending" | "done" | "all";

export default function EventHomePage() {
  const { event, state } = useEvaluator();

  if (state.status === "loading") return <Spinner />;
  if (state.status === "error")
    return (
      <Message
        icon={<AlertCircle className="size-10" />}
        title="Algo salió mal"
        action={
          <button className={secondaryButton} onClick={() => window.location.reload()}>
            Reintentar
          </button>
        }
      >
        {state.message}
      </Message>
    );

  const gate = <EventStatusGate hasEvaluator={state.status === "ready"} />;
  if (event.status !== "open" && event.status !== "closed") return gate;
  if (state.status === "join")
    return event.status === "open" ? (
      <>
        <EventIntro />
        <JoinForm />
      </>
    ) : (
      gate
    );
  return <ProjectList />;
}

function ProjectList() {
  const { event, supabase, state } = useEvaluator();
  const evaluator = state.status === "ready" ? state.evaluator : null;
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Pick<Submission, "project_id" | "status">[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [category, setCategory] = useState("all");
  const [semester, setSemester] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evaluator) return;
    let alive = true;
    (async () => {
      const [p, c, s] = await Promise.all([
        supabase.from("projects").select("*").eq("event_id", event.id),
        supabase.from("categories").select("*").eq("event_id", event.id).order("position"),
        supabase.from("submissions").select("project_id, status").eq("evaluator_id", evaluator.id),
      ]);
      if (!alive) return;
      if (p.error) return setError(p.error.message);
      const collator = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });
      setProjects(
        (p.data as Project[]).sort(
          (a, b) => collator.compare(a.stand ?? "~", b.stand ?? "~") || collator.compare(a.name, b.name),
        ),
      );
      setCategories((c.data as Category[]) ?? []);
      setSubs(s.data ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [supabase, event.id, evaluator]);

  const statusOf = useMemo(() => {
    const map = new Map(subs.map((s) => [s.project_id, s.status]));
    return (id: string) => map.get(id);
  }, [subs]);

  if (error) return <Message icon={<AlertCircle className="size-10" />} title="No se pudo cargar la lista">{error}</Message>;
  if (!projects) return <Spinner text="Cargando proyectos…" />;

  const done = projects.filter((p) => statusOf(p.id) === "submitted").length;
  const pct = projects.length ? Math.round((done / projects.length) * 100) : 0;
  const q = query.trim().toLowerCase();
  const visible = projects.filter((p) => {
    const st = statusOf(p.id);
    if (tab === "pending" && st === "submitted") return false;
    if (tab === "done" && st !== "submitted") return false;
    if (category !== "all" && p.category_id !== category) return false;
    if (semester !== "all" && p.semester !== semester) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.stand ?? "").toLowerCase().includes(q) ||
      p.members.some((m) => m.toLowerCase().includes(q))
    );
  });
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pendientes", count: projects.length - done },
    { id: "done", label: "Evaluados", count: done },
    { id: "all", label: "Todos", count: projects.length },
  ];

  return (
    <div className="space-y-4">
      <WhoAmI />
      {event.status === "closed" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Las evaluaciones están cerradas. Puedes consultar lo que enviaste, pero ya no se pueden hacer cambios.
        </p>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-slate-500">Tu avance</div>
            <div className="text-2xl font-bold text-slate-900">
              {done} <span className="text-base font-medium text-slate-500">de {projects.length} proyectos</span>
            </div>
          </div>
          <div className="text-lg font-semibold text-[var(--brand)]">{pct}%</div>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${pct}%` }} />
        </div>
        {done === projects.length && projects.length > 0 && (
          <p className="mt-2 text-sm font-medium text-emerald-700">¡Evaluaste todos los proyectos! Gracias.</p>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          className={cn(inputClass, "pl-11")}
          placeholder="Buscar proyecto, stand o integrante"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar proyecto"
        />
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
            )}
          >
            {t.label} <span className="text-slate-400">{t.count}</span>
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ id: "all", name: "Todas" }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                category === c.id
                  ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]"
                  : "border-slate-300 bg-white text-slate-700",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {semestersOf(projects).length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtrar por semestre">
          {[{ id: "all", name: "Todos los semestres" }, ...semestersOf(projects).map((s) => ({ id: s, name: semesterLabel(s) }))].map((s) => (
            <button
              key={s.id}
              onClick={() => setSemester(s.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                semester === s.id
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-300 bg-white text-slate-700",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {visible.map((p) => {
          const st = statusOf(p.id);
          return (
            <li key={p.id}>
              <Link
                href={`/e/${event.short_code}/p/${p.code}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm active:bg-slate-50"
              >
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand)_12%,white)] text-base font-bold text-[var(--brand)]">
                    {p.stand || "—"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug text-slate-900">{p.name}</div>
                  <div className="truncate text-sm text-slate-500">
                    {[p.stand && `Stand ${p.stand}`, semesterLabel(p.semester), catName(p.category_id)].filter(Boolean).join(" · ")}
                  </div>
                  <div className="mt-1">
                    {st === "submitted" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="size-3.5" /> Evaluado
                      </span>
                    ) : st === "draft" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <PencilLine className="size-3.5" /> En progreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <CircleDashed className="size-3.5" /> Pendiente
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-slate-400" />
              </Link>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">
            {tab === "pending" && !q ? "¡No tienes proyectos pendientes!" : "No hay proyectos que coincidan."}
          </li>
        )}
      </ul>
    </div>
  );
}
