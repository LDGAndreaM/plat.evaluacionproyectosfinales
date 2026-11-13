"use client";

import Papa from "papaparse";
import { Download, FileUp, FolderKanban, Pencil, Plus, Search, Tags, Trash2, Users } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult, Category, Project } from "@/lib/types";
import { SEMESTER_SUGGESTIONS, semesterLabel, semestersOf } from "@/lib/utils";
import {
  deleteCategory,
  deleteProject,
  importProjects,
  saveCategory,
  saveProject,
  type ImportRow,
} from "./actions";

type ProjectWithCount = Project & { evaluations: number };

export function ProjectsManager({
  eventId,
  projects,
  categories,
  canEdit,
}: {
  eventId: string;
  projects: ProjectWithCount[];
  categories: Category[];
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [semFilter, setSemFilter] = useState("all");
  const semesters = useMemo(() => semestersOf(projects), [projects]);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [pending, start] = useTransition();

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filtered = projects.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.members.some((m) => m.toLowerCase().includes(q)) ||
      (p.stand ?? "").toLowerCase().includes(q);
    const matchC = catFilter === "all" || (catFilter === "none" ? !p.category_id : p.category_id === catFilter);
    const matchS = semFilter === "all" || (semFilter === "none" ? !p.semester : p.semester === semFilter);
    return matchQ && matchC && matchS;
  });

  function onDelete(p: ProjectWithCount) {
    const extra = p.evaluations ? ` También se borrarán sus ${p.evaluations} evaluaciones.` : "";
    if (!window.confirm(`¿Eliminar “${p.name}”?${extra}`)) return;
    start(async () => {
      const res = await deleteProject(eventId, p.id);
      if (res && !res.ok) window.alert(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Buscar por proyecto, integrante o stand…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Buscar proyectos"
          />
        </div>
        {categories.length > 0 && (
          <Select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="w-auto"
            aria-label="Filtrar por categoría"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="none">Sin categoría</option>
          </Select>
        )}
        {semesters.length > 0 && (
          <Select
            value={semFilter}
            onChange={(e) => setSemFilter(e.target.value)}
            className="w-auto"
            aria-label="Filtrar por semestre"
          >
            <option value="all">Todos los semestres</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                {semesterLabel(s)}
              </option>
            ))}
            <option value="none">Sin semestre</option>
          </Select>
        )}
        {canEdit && (
          <>
            <Button variant="secondary" onClick={() => setCatsOpen(true)}>
              <Tags className="size-4" /> Categorías ({categories.length})
            </Button>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <FileUp className="size-4" /> Importar CSV
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Agregar proyecto
            </Button>
          </>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-10" />}
          title="Aún no hay proyectos"
          description="Agrega cada equipo uno por uno o importa una lista desde Excel (guardada como CSV)."
          action={
            canEdit && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  <FileUp className="size-4" /> Importar CSV
                </Button>
                <Button onClick={() => setEditing("new")}>
                  <Plus className="size-4" /> Agregar proyecto
                </Button>
              </div>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-2 text-sm text-slate-500">
            {filtered.length} de {projects.length} proyectos
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500">
                    {p.stand || "—"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{p.name}</span>
                    {p.category_id && <Badge tone="violet">{catName.get(p.category_id)}</Badge>}
                    {p.semester && <Badge tone="blue">{semesterLabel(p.semester)}</Badge>}
                    {p.stand && <Badge>Stand {p.stand}</Badge>}
                  </div>
                  <p className="truncate text-sm text-slate-500">
                    {p.members.length ? p.members.join(", ") : "Sin integrantes registrados"}
                  </p>
                </div>
                <div className="hidden items-center gap-1 text-sm text-slate-500 sm:flex" title="Evaluaciones recibidas">
                  <Users className="size-4" /> {p.evaluations}
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(p)}
                      disabled={pending}
                      aria-label={`Eliminar ${p.name}`}
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">Ningún proyecto coincide con la búsqueda.</li>
            )}
          </ul>
        </Card>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Agregar proyecto" : "Editar proyecto"}
        size="lg"
      >
        {editing !== null && (
          <ProjectForm
            key={editing === "new" ? "new" : editing.id}
            eventId={eventId}
            project={editing === "new" ? null : editing}
            categories={categories}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar proyectos desde CSV" size="xl">
        {importOpen && <CsvImport eventId={eventId} onDone={() => setImportOpen(false)} />}
      </Modal>

      <Modal open={catsOpen} onClose={() => setCatsOpen(false)} title="Categorías del evento">
        <CategoriesEditor eventId={eventId} categories={categories} projects={projects} />
      </Modal>
    </div>
  );
}

function ProjectForm({
  eventId,
  project,
  categories,
  onDone,
}: {
  eventId: string;
  project: Project | null;
  categories: Category[];
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveProject.bind(null, eventId), null as ActionResult);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={project?.id ?? ""} />
      <Field label="Nombre del proyecto" htmlFor="p-name" required>
        <Input id="p-name" name="name" required maxLength={200} defaultValue={project?.name} autoFocus />
      </Field>
      <Field label="Integrantes" htmlFor="p-members" hint="Uno por línea, o separados por coma.">
        <Textarea id="p-members" name="members" rows={3} defaultValue={project?.members.join("\n")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Semestre" htmlFor="p-sem" hint="Elige o escribe, ej. 7°">
          <Input id="p-sem" name="semester" list="semestres" maxLength={40} defaultValue={project?.semester ?? ""} placeholder="7°" />
          <datalist id="semestres">
            {SEMESTER_SUGGESTIONS.map((s) => (
              <option key={s} value={s}>
                {semesterLabel(s)}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Categoría" htmlFor="p-cat">
          <Select id="p-cat" name="category_id" defaultValue={project?.category_id ?? ""}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Stand / mesa" htmlFor="p-stand">
          <Input id="p-stand" name="stand" maxLength={20} defaultValue={project?.stand ?? ""} placeholder="A1" />
        </Field>
      </div>
      <Field label="Descripción breve" htmlFor="p-desc">
        <Textarea id="p-desc" name="description" rows={3} defaultValue={project?.description ?? ""} />
      </Field>
      <ImageUpload name="image_url" label="Imagen del proyecto (opcional)" aspect="wide" defaultValue={project?.image_url} />
      <FormMessage state={state?.ok ? null : state} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>{project ? "Guardar cambios" : "Agregar proyecto"}</SubmitButton>
      </div>
    </form>
  );
}

const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  nombre: "name",
  proyecto: "name",
  "nombre del proyecto": "name",
  name: "name",
  integrantes: "members",
  equipo: "members",
  alumnos: "members",
  members: "members",
  categoria: "category",
  category: "category",
  descripcion: "description",
  description: "description",
  stand: "stand",
  mesa: "stand",
  "stand/mesa": "stand",
  semestre: "semester",
  semester: "semester",
};

function normalizeHeader(h: string) {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function CsvImport({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, start] = useTransition();

  function downloadTemplate() {
    const csv =
      "﻿nombre,integrantes,semestre,categoria,descripcion,stand\n" +
      '"Raíces del Mar","Ana Valenzuela; Diego Ruiz",7°,Branding,"Identidad para cooperativa pesquera",A1\n' +
      '"Revista Marea Alta","Valeria Ochoa; Jorge Armenta",8°,Editorial,"Revista de cultura del Golfo",A2\n';
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-proyectos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
      complete: (res) => {
        const fields = res.meta.fields ?? [];
        const mapped = fields.map((f) => HEADER_ALIASES[f]);
        if (!mapped.includes("name")) {
          setError('No encontramos la columna "nombre". Descarga la plantilla para ver el formato.');
          setRows([]);
          return;
        }
        const out: ImportRow[] = res.data.map((r) => {
          const row: ImportRow = { name: "", members: "", category: "", description: "", stand: "", semester: "" };
          fields.forEach((f, i) => {
            const key = mapped[i];
            if (key) row[key] = (r[f] ?? "").toString().trim();
          });
          return row;
        });
        setRows(out.filter((r) => r.name));
      },
      error: (err) => setError(`No se pudo leer el archivo: ${err.message}`),
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          Prepara una hoja en Excel o Google Sheets con las columnas <strong>nombre</strong>, <strong>integrantes</strong>,{" "}
          <strong>semestre</strong>, <strong>categoria</strong>, <strong>descripcion</strong> y <strong>stand</strong> (solo “nombre” es obligatoria).
          Separa a los integrantes con punto y coma. Luego guárdala como <em>CSV UTF-8</em>.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={downloadTemplate}>
          <Download className="size-4" /> Descargar plantilla
        </Button>
      </div>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center hover:border-slate-400">
        <FileUp className="size-8 text-slate-400" />
        <span className="text-sm font-medium text-slate-800">Selecciona tu archivo .csv</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>
      {error && <FormMessage state={{ ok: false, error }} />}
      {rows.length > 0 && (
        <>
          <p className="text-sm font-medium text-slate-800">Vista previa: {rows.length} proyectos</p>
          <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Integrantes</th>
                  <th className="px-3 py-2">Semestre</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2">Stand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-medium">{r.name}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.members}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.semester}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.category}</td>
                    <td className="px-3 py-1.5 text-slate-600">{r.stand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <FormMessage state={result} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          {result?.ok ? "Cerrar" : "Cancelar"}
        </Button>
        {!result?.ok && (
          <Button
            disabled={!rows.length || pending}
            onClick={() =>
              start(async () => {
                const res = await importProjects(eventId, rows);
                setResult(res);
                if (res?.ok) setRows([]);
              })
            }
          >
            {pending ? "Importando…" : `Importar ${rows.length || ""} proyectos`}
          </Button>
        )}
      </div>
    </div>
  );
}

function CategoriesEditor({
  eventId,
  categories,
  projects,
}: {
  eventId: string;
  categories: Category[];
  projects: Project[];
}) {
  const [state, action] = useActionState(saveCategory.bind(null, eventId), null as ActionResult);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Las categorías son opcionales. Sirven para tener ganadores por categoría y para asignar formularios distintos.
      </p>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {categories.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Sin categorías.</li>}
        {categories.map((c) => {
          const n = projects.filter((p) => p.category_id === c.id).length;
          return (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-sm font-medium">{c.name}</span>
              <span className="text-xs text-slate-500">{n} proyectos</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const name = window.prompt("Nuevo nombre de la categoría:", c.name);
                  if (!name?.trim()) return;
                  const fd = new FormData();
                  fd.set("id", c.id);
                  fd.set("name", name);
                  start(() => action(fd));
                }}
                aria-label={`Renombrar ${c.name}`}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`¿Eliminar la categoría “${c.name}”? Sus proyectos quedarán sin categoría.`)) return;
                  start(async () => {
                    await deleteCategory(eventId, c.id);
                  });
                }}
                aria-label={`Eliminar ${c.name}`}
              >
                <Trash2 className="size-4 text-red-600" />
              </Button>
            </li>
          );
        })}
      </ul>
      <form action={action} className="flex gap-2">
        <Input name="name" placeholder="Nueva categoría (ej. Branding)" maxLength={100} aria-label="Nombre de la categoría" />
        <SubmitButton pendingText="…">
          <Plus className="size-4" /> Agregar
        </SubmitButton>
      </form>
      <FormMessage state={state?.ok ? null : state} />
    </div>
  );
}
