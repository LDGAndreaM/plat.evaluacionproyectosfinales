"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ClipboardX, Cloud, CloudOff, List, Loader2, Lock, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormRunner } from "@/components/form-fields/form-runner";
import type { FileValue } from "@/components/form-fields/field-input";
import { resolveFormId } from "@/lib/forms";
import type { Answers, Category, FormField, FormRow, Project, Submission } from "@/lib/types";
import { useEvaluator } from "../../evaluator-context";
import { EventStatusGate, JoinForm, Message, Spinner, WhoAmI, primaryButton, secondaryButton } from "../../shared";

type SaveState = "idle" | "saving" | "saved" | "offline";

interface Loaded {
  project: Project;
  category: Category | null;
  form: FormRow | null;
  fields: FormField[];
  submission: Submission | null;
}

const draftKey = (evaluatorId: string, projectId: string) => `evalqr:draft:${evaluatorId}:${projectId}`;

export default function EvaluateProjectPage() {
  const { projectCode } = useParams<{ projectCode: string }>();
  const { event, supabase, state } = useEvaluator();
  const [preview, setPreview] = useState<{ name: string } | null>(null);

  // Nombre del proyecto para mostrar en la pantalla de registro
  useEffect(() => {
    if (state.status !== "join") return;
    let alive = true;
    supabase
      .from("projects")
      .select("name")
      .eq("event_id", event.id)
      .eq("code", projectCode.toUpperCase())
      .maybeSingle()
      .then(({ data }) => alive && setPreview(data));
    return () => {
      alive = false;
    };
  }, [state.status, supabase, event.id, projectCode]);

  if (state.status === "loading") return <Spinner />;
  if (state.status === "error")
    return (
      <Message icon={<AlertCircle className="size-10" />} title="Algo salió mal">
        {state.message}
      </Message>
    );
  if (event.status !== "open" && event.status !== "closed") return <EventStatusGate hasEvaluator={false} />;
  if (state.status === "join")
    return event.status === "open" ? <JoinForm projectName={preview?.name} /> : <EventStatusGate hasEvaluator={false} />;
  return <Evaluate projectCode={projectCode.toUpperCase()} />;
}

function Evaluate({ projectCode }: { projectCode: string }) {
  const { event, supabase, state, userId } = useEvaluator();
  const evaluator = state.status === "ready" ? state.evaluator : null!;
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [mode, setMode] = useState<"form" | "done">("form");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [nextPending, setNextPending] = useState<Project | null | undefined>(undefined);
  const [showInfo, setShowInfo] = useState(false);
  const dirty = useRef(false);
  const submissionRef = useRef<Submission | null>(null);
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const isOpen = event.status === "open";

  /* Carga del proyecto, formulario y evaluación previa */
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: project, error: pe } = await supabase
        .from("projects")
        .select("*")
        .eq("event_id", event.id)
        .eq("code", projectCode)
        .maybeSingle<Project>();
      if (!alive) return;
      if (pe) return setError(pe.message);
      if (!project) return setError("not_found");

      const [{ data: forms }, { data: fcs }, { data: cat }, { data: sub }] = await Promise.all([
        supabase.from("forms").select("*").eq("event_id", event.id).eq("is_published", true),
        supabase.from("form_categories").select("form_id, category_id"),
        project.category_id
          ? supabase.from("categories").select("*").eq("id", project.category_id).maybeSingle<Category>()
          : Promise.resolve({ data: null }),
        supabase
          .from("submissions")
          .select("*")
          .eq("evaluator_id", evaluator.id)
          .eq("project_id", project.id)
          .maybeSingle<Submission>(),
      ]);
      const formId = resolveFormId(project.category_id, (forms as FormRow[]) ?? [], fcs ?? []);
      const form = (forms as FormRow[] | null)?.find((f) => f.id === formId) ?? null;
      let fields: FormField[] = [];
      if (form) {
        const { data: ff } = await supabase.from("form_fields").select("*").eq("form_id", form.id).order("position");
        fields = ((ff as FormField[]) ?? []).map((f) => ({ ...f, weight: Number(f.weight) }));
      }
      if (!alive) return;

      // Respuestas: las del servidor, o el respaldo local si es más reciente
      let initial: Answers = sub?.answers ?? {};
      if (sub?.status !== "submitted") {
        try {
          const raw = localStorage.getItem(draftKey(evaluator.id, project.id));
          if (raw) {
            const local = JSON.parse(raw) as { answers: Answers; at: number };
            if (!sub || local.at > new Date(sub.updated_at).getTime()) initial = local.answers;
          }
        } catch {}
      }
      submissionRef.current = sub ?? null;
      setWasSubmitted(sub?.status === "submitted");
      setAnswers(initial);
      setData({ project, category: cat ?? null, form, fields, submission: sub ?? null });
      setMode(sub?.status === "submitted" ? "done" : "form");
      if (sub?.status === "submitted") setNextPending(undefined);
    })();
    return () => {
      alive = false;
    };
  }, [supabase, event.id, projectCode, evaluator.id]);

  const persist = useCallback(
    async (status: "draft" | "submitted", current: Answers) => {
      if (!data?.form) return { ok: false, error: "Sin formulario" };
      const { data: row, error } = await supabase
        .from("submissions")
        .upsert(
          {
            event_id: event.id,
            evaluator_id: evaluator.id,
            project_id: data.project.id,
            form_id: data.form.id,
            answers: current,
            status,
          },
          { onConflict: "evaluator_id,project_id" },
        )
        .select("*")
        .single<Submission>();
      if (error) return { ok: false, error: error.message };
      submissionRef.current = row;
      if (row.status === "submitted") setWasSubmitted(true);
      return { ok: true as const };
    },
    [supabase, event.id, evaluator.id, data],
  );

  /* Guardado automático (borrador) */
  useEffect(() => {
    if (!data || mode !== "form" || !dirty.current || !isOpen) return;
    const alreadySubmitted = submissionRef.current?.status === "submitted";
    try {
      if (!alreadySubmitted)
        localStorage.setItem(draftKey(evaluator.id, data.project.id), JSON.stringify({ answers, at: Date.now() }));
    } catch {}
    if (alreadySubmitted) return; // al editar una evaluación enviada, se guarda con el botón
    const t = setTimeout(async () => {
      setSaveState("saving");
      const res = await persist("draft", answers);
      if (res.ok) {
        dirty.current = false;
        setSaveState("saved");
        setSavedAt(new Date());
      } else setSaveState("offline");
    }, 1200);
    return () => clearTimeout(t);
  }, [answers, data, mode, persist, evaluator.id, isOpen]);

  const findNextPending = useCallback(async () => {
    const [{ data: projects }, { data: subs }] = await Promise.all([
      supabase.from("projects").select("*").eq("event_id", event.id),
      supabase.from("submissions").select("project_id, status").eq("evaluator_id", evaluator.id),
    ]);
    const done = new Set((subs ?? []).filter((s) => s.status === "submitted").map((s) => s.project_id));
    const collator = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });
    const pending = ((projects as Project[]) ?? [])
      .filter((p) => !done.has(p.id))
      .sort((a, b) => collator.compare(a.stand ?? "~", b.stand ?? "~") || collator.compare(a.name, b.name));
    setNextPending(pending[0] ?? null);
  }, [supabase, event.id, evaluator.id]);

  useEffect(() => {
    // Buscar el siguiente proyecto pendiente al mostrar la confirmación
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mode === "done" && nextPending === undefined) findNextPending();
  }, [mode, nextPending, findNextPending]);

  const upload = useMemo(
    () => async (file: File): Promise<FileValue> => {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${event.id}/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("submission-files").upload(path, file, { contentType: file.type });
      if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
      return { path, name: file.name };
    },
    [supabase, event.id, userId],
  );

  if (error === "not_found")
    return (
      <Message
        icon={<ClipboardX className="size-10" />}
        title="Proyecto no encontrado"
        action={
          <Link href={`/e/${event.short_code}`} className={primaryButton}>
            Ver lista de proyectos
          </Link>
        }
      >
        El código QR puede estar dañado o el proyecto fue eliminado.
      </Message>
    );
  if (error) return <Message icon={<AlertCircle className="size-10" />} title="No se pudo cargar">{error}</Message>;
  if (!data) return <Spinner text="Cargando proyecto…" />;

  const { project, category, form, fields } = data;

  const header = (
    <div className="mb-5 space-y-3">
      <Link href={`/e/${event.short_code}`} className="inline-flex items-center gap-1 text-sm text-slate-600">
        <ArrowLeft className="size-4" /> Lista de proyectos
      </Link>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {project.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.image_url} alt="" className="h-40 w-full object-cover" />
        )}
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
            {project.stand && <span>Stand {project.stand}</span>}
            {category && <span className="text-slate-500">· {category.name}</span>}
          </div>
          <h1 className="mt-0.5 text-xl font-bold leading-tight text-slate-900">{project.name}</h1>
          {(project.members.length > 0 || project.description) && (
            <>
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600"
                aria-expanded={showInfo}
              >
                <Users className="size-4" /> {showInfo ? "Ocultar detalles" : "Ver integrantes y descripción"}
                <ChevronDown className={`size-4 transition-transform ${showInfo ? "rotate-180" : ""}`} />
              </button>
              {showInfo && (
                <div className="mt-2 space-y-2 text-sm text-slate-600">
                  {project.members.length > 0 && <p>{project.members.join(", ")}</p>}
                  {project.description && <p>{project.description}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <WhoAmI />
    </div>
  );

  if (!form || !fields.length)
    return (
      <>
        {header}
        <Message icon={<ClipboardX className="size-10" />} title="Formulario no disponible">
          Este proyecto aún no tiene un formulario de evaluación publicado. Avisa al organizador.
        </Message>
      </>
    );

  if (mode === "done")
    return (
      <>
        {header}
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <CheckCircle2 className="size-14 text-emerald-600" />
          <h2 className="mt-3 text-xl font-semibold text-slate-900">¡Evaluación enviada!</h2>
          <p className="mt-1 text-slate-600">Gracias por evaluar “{project.name}”.</p>
          <div className="mt-6 w-full space-y-2">
            {nextPending === undefined ? (
              <div className="flex h-12 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-slate-400" />
              </div>
            ) : nextPending && isOpen ? (
              <Link href={`/e/${event.short_code}/p/${nextPending.code}`} className={primaryButton}>
                Evaluar otro proyecto{nextPending.stand ? ` · Stand ${nextPending.stand}` : ""}
              </Link>
            ) : (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                ¡Ya evaluaste todos los proyectos!
              </p>
            )}
            <Link href={`/e/${event.short_code}`} className={secondaryButton}>
              <List className="size-5" /> Ver todos los proyectos
            </Link>
            {isOpen ? (
              <button type="button" className={secondaryButton} onClick={() => setMode("form")}>
                <Pencil className="size-5" /> Editar mi evaluación
              </button>
            ) : (
              <p className="flex items-center justify-center gap-1 pt-2 text-sm text-slate-500">
                <Lock className="size-4" /> El evento está cerrado; ya no se pueden hacer cambios.
              </p>
            )}
          </div>
        </div>
      </>
    );

  return (
    <>
      {header}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{form.title}</h2>
        {isOpen && !wasSubmitted && (
          <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500" aria-live="polite">
            {saveState === "saving" && (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Guardando…
              </>
            )}
            {saveState === "saved" && savedAt && (
              <>
                <Cloud className="size-3.5" /> Avance guardado{" "}
                {savedAt.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </>
            )}
            {saveState === "offline" && (
              <>
                <CloudOff className="size-3.5 text-amber-600" /> Guardado solo en este celular
              </>
            )}
          </span>
        )}
      </div>
      {form.description && <p className="mb-4 text-sm text-slate-600">{form.description}</p>}
      {wasSubmitted && (
        <p className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Estás editando una evaluación que ya enviaste. Los cambios se guardan al presionar “Guardar cambios”.
        </p>
      )}
      {!isOpen && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          El evento está cerrado. Esta es una vista de solo lectura.
        </p>
      )}
      <FormRunner
        fields={fields}
        answers={answers}
        readOnly={!isOpen}
        upload={upload}
        onAnswer={(id, v) => {
          dirty.current = true;
          setAnswers((a) => ({ ...a, [id]: v }));
        }}
        submitLabel={wasSubmitted ? "Guardar cambios" : "Enviar evaluación"}
        onSubmit={async () => {
          const res = await persist("submitted", answers);
          if (!res.ok) {
            window.alert(
              /row-level security|no está recibiendo/i.test(res.error ?? "")
                ? "El evento ya no acepta evaluaciones."
                : `No se pudo enviar. Revisa tu conexión e intenta de nuevo.\n(${res.error})`,
            );
            return;
          }
          dirty.current = false;
          try {
            localStorage.removeItem(draftKey(evaluator.id, project.id));
          } catch {}
          setNextPending(undefined);
          setMode("done");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}
