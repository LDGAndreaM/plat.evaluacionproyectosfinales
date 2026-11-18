"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileDown,
  FileUp,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import Papa from "papaparse";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { errorReport, parseRoster, ROSTER_TEMPLATE, type RosterParse } from "@/lib/aula/roster";
import { studentName, type ClassStudent } from "@/lib/aula/types";
import { downloadBlob, slugify } from "@/lib/qr";
import { cn, formatDate } from "@/lib/utils";
import { addStudent, importStudents, removeStudent, updateStudent } from "../../actions";

type Filter = "all" | "active" | "invited";

function csvBlob(text: string) {
  return new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
}

export function StudentsManager({
  classId,
  className,
  students,
  openImport,
  openAdd,
}: {
  classId: string;
  className: string;
  students: ClassStudent[];
  openImport?: boolean;
  openAdd?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [importOpen, setImportOpen] = useState(!!openImport);
  const [addOpen, setAddOpen] = useState(!!openAdd);
  const [editing, setEditing] = useState<ClassStudent | null>(null);
  const [pending, start] = useTransition();

  const counts = {
    all: students.length,
    active: students.filter((s) => s.status === "active").length,
    invited: students.filter((s) => s.status === "invited").length,
  };
  const visible = useMemo(() => {
    const q = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    return students.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!q) return true;
      const hay = `${s.first_name} ${s.last_name} ${s.email ?? ""} ${s.student_number ?? ""} ${s.section ?? ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      return hay.includes(q);
    });
  }, [students, query, filter]);

  function exportList() {
    const csv = Papa.unparse({
      fields: ["No.", "Apellidos", "Nombre", "Correo", "Matrícula", "Grupo", "ID", "Estado", "Se unió"],
      data: students.map((s, i) => [
        i + 1,
        s.last_name,
        s.first_name,
        s.email ?? "",
        s.student_number ?? "",
        s.section ?? "",
        s.extra_id ?? "",
        s.status === "active" ? "Activo" : "Invitado",
        s.joined_at ? formatDate(s.joined_at) : "",
      ]),
    });
    downloadBlob(`lista-${slugify(className)}.csv`, csvBlob(csv));
  }

  function confirmRemove(s: ClassStudent) {
    const msg =
      s.status === "active"
        ? `¿Quitar a ${studentName(s)} del grupo? Ya no verá este grupo en su cuenta.`
        : `¿Quitar la invitación de ${studentName(s)}?`;
    if (confirm(msg)) start(() => removeStudent(classId, s.id));
  }

  return (
    <Card className="rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar estudiantes">
          {(
            [
              ["all", "Todos"],
              ["active", "Activos"],
              ["invited", "Invitados"],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-semibold",
                filter === k ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-violet-50",
              )}
            >
              {label} ({counts[k]})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="size-4" /> Agregar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" /> Importar CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={exportList} disabled={!students.length}>
            <Download className="size-4" /> Descargar lista
          </Button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o matrícula"
              aria-label="Buscar estudiante"
              className="pl-9"
            />
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={<Users className="size-10" />}
            title="Aún no hay estudiantes"
            description="Importa tu lista en CSV, agrégalos uno por uno o comparte el código del grupo."
            action={
              <Button onClick={() => setImportOpen(true)}>
                <Upload className="size-4" /> Importar lista
              </Button>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">Ningún estudiante coincide con la búsqueda.</p>
      ) : (
        <>
          {/* Tabla (pantallas medianas en adelante) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">#</th>
                  <th className="px-4 py-2.5 font-semibold">Estudiante</th>
                  <th className="px-4 py-2.5 font-semibold">Correo</th>
                  <th className="px-4 py-2.5 font-semibold">Matrícula</th>
                  <th className="px-4 py-2.5 font-semibold">Grupo</th>
                  <th className="px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((s, i) => (
                  <tr key={s.id} className="hover:bg-violet-50/40">
                    <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">
                        {s.last_name}
                        {s.last_name && ", "}
                        {s.first_name}
                      </div>
                    </td>
                    <td className="max-w-56 truncate px-4 py-2.5 text-slate-600">{s.email}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.student_number}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.section}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge s={s} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <RowActions onEdit={() => setEditing(s)} onRemove={() => confirmRemove(s)} disabled={pending} name={studentName(s)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Tarjetas (celular) */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {visible.map((s) => (
              <li key={s.id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">{studentName(s)}</div>
                  <div className="truncate text-sm text-slate-500">{s.email}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <StatusBadge s={s} />
                    {s.student_number && <span>Mat. {s.student_number}</span>}
                    {s.section && <span>Grupo {s.section}</span>}
                  </div>
                </div>
                <RowActions onEdit={() => setEditing(s)} onRemove={() => confirmRemove(s)} disabled={pending} name={studentName(s)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar estudiante">
        {addOpen && <StudentForm classId={classId} onDone={() => setAddOpen(false)} />}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar estudiante">
        {editing && <StudentForm key={editing.id} classId={classId} student={editing} onDone={() => setEditing(null)} />}
      </Modal>
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar estudiantes desde CSV" size="xl">
        {importOpen && (
          <ImportWizard
            classId={classId}
            className={className}
            existingEmails={students.map((s) => s.email ?? "").filter(Boolean)}
            onClose={() => setImportOpen(false)}
          />
        )}
      </Modal>
    </Card>
  );
}

function StatusBadge({ s }: { s: ClassStudent }) {
  return s.status === "active" ? (
    <Badge tone="green">
      <CheckCircle2 className="size-3" /> Activo
    </Badge>
  ) : (
    <Badge tone="amber" title="Se activará cuando entre con este correo o con el código del grupo">
      Invitado
    </Badge>
  );
}

function RowActions({ onEdit, onRemove, disabled, name }: { onEdit: () => void; onRemove: () => void; disabled?: boolean; name: string }) {
  return (
    <div className="flex shrink-0 justify-end gap-1">
      <button type="button" onClick={onEdit} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Editar a ${name}`}>
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
        aria-label={`Quitar a ${name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function StudentForm({ classId, student, onDone }: { classId: string; student?: ClassStudent; onDone: () => void }) {
  const [state, action] = useActionState(student ? updateStudent : addStudent, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state?.ok && student) onDone();
  }
  useEffect(() => {
    if (state?.ok && !student) formRef.current?.reset();
  }, [state, student]);
  const linked = !!student?.user_id;
  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      {student && <input type="hidden" name="id" value={student.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre(s)" htmlFor="st-first" required>
          <Input id="st-first" name="first_name" required maxLength={80} defaultValue={student?.first_name} />
        </Field>
        <Field label="Apellidos" htmlFor="st-last">
          <Input id="st-last" name="last_name" maxLength={120} defaultValue={student?.last_name} />
        </Field>
        <Field
          label="Correo"
          htmlFor="st-email"
          required={!student}
          className="sm:col-span-2"
          hint={linked ? "Ya entró con su cuenta; el correo no se puede cambiar." : "Al crear su cuenta con este correo, entrará al grupo automáticamente."}
        >
          <Input id="st-email" name="email" type="email" required={!student} disabled={linked} maxLength={200} defaultValue={student?.email ?? ""} />
        </Field>
        <Field label="Matrícula" htmlFor="st-num">
          <Input id="st-num" name="student_number" maxLength={40} defaultValue={student?.student_number ?? ""} />
        </Field>
        <Field label="Grupo / sección" htmlFor="st-sec">
          <Input id="st-sec" name="section" maxLength={40} defaultValue={student?.section ?? ""} placeholder="7A" />
        </Field>
        <Field label="ID (opcional)" htmlFor="st-id" hint="Otro identificador de tu escuela.">
          <Input id="st-id" name="extra_id" maxLength={60} defaultValue={student?.extra_id ?? ""} />
        </Field>
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          {student ? "Cancelar" : "Cerrar"}
        </Button>
        <SubmitButton>{student ? "Guardar" : "Agregar"}</SubmitButton>
      </div>
    </form>
  );
}

const STATUS_INFO = {
  ok: { label: "Lista", cls: "bg-emerald-100 text-emerald-800" },
  error: { label: "Error", cls: "bg-red-100 text-red-800" },
  duplicate: { label: "Duplicado", cls: "bg-amber-100 text-amber-800" },
  existing: { label: "Ya en el grupo", cls: "bg-slate-200 text-slate-700" },
} as const;

function ImportWizard({
  classId,
  className,
  existingEmails,
  onClose,
}: {
  classId: string;
  className: string;
  existingEmails: string[];
  onClose: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<RosterParse | null>(null);
  const [done, setDone] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setError(null);
    setDone(null);
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("El archivo es muy grande (máx. 2 MB).");
      return;
    }
    if (/\.xlsx?$/i.test(file.name)) {
      setError("Ese es un archivo de Excel. En Excel elige Archivo → Guardar como → “CSV UTF-8 (delimitado por comas)” y súbelo de nuevo.");
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    const parsed = parseRoster(text, existingEmails);
    if (!parsed.rows.length) {
      setError("El archivo no tiene filas con estudiantes.");
      setResult(null);
      return;
    }
    setResult(parsed);
  }

  const valid = result?.rows.filter((r) => r.status === "ok") ?? [];
  const problems = result ? result.rows.length - valid.length : 0;
  const blocked = !!result?.missingColumns.length;

  function doImport() {
    if (!result) return;
    start(async () => {
      const res = await importStudents(
        classId,
        valid.map((r) => r.entry),
      );
      if (!res.ok) setError(res.error);
      else setDone({ inserted: res.inserted, skipped: res.skipped });
    });
  }

  if (done) {
    return (
      <div className="space-y-4 py-4 text-center">
        <CheckCircle2 className="mx-auto size-14 text-turquoise-600" />
        <h3 className="text-xl font-bold text-slate-900">
          {done.inserted} estudiante{done.inserted === 1 ? "" : "s"} importado{done.inserted === 1 ? "" : "s"}
        </h3>
        <p className="mx-auto max-w-md text-slate-600">
          Quedaron como <strong>invitados</strong>. Entrarán al grupo automáticamente cuando creen su cuenta (o inicien sesión) con su correo.
          Comparte también el enlace o el código del grupo.
        </p>
        {problems > 0 && result && (
          <Button variant="secondary" onClick={() => downloadBlob(`errores-${slugify(className)}.csv`, csvBlob(errorReport(result.rows)))}>
            <FileDown className="size-4" /> Descargar las {problems} filas no importadas
          </Button>
        )}
        <div>
          <Button onClick={onClose}>Listo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ol className="grid gap-3 text-sm sm:grid-cols-3">
        {[
          "Descarga la plantilla y llénala en Excel o Google Sheets.",
          "Guárdala como CSV (UTF-8) y súbela aquí.",
          "Revisa la vista previa y confirma.",
        ].map((t, i) => (
          <li key={t} className="flex gap-2 rounded-xl bg-lavender/60 p-3 text-violet-950">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-600 text-xs font-bold text-white">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => downloadBlob("plantilla-estudiantes.csv", csvBlob(ROSTER_TEMPLATE))}>
          <FileDown className="size-4" /> Descargar plantilla
        </Button>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-300">
          <FileUp className="size-4" /> {fileName ? "Elegir otro archivo" : "Subir archivo CSV"}
          <input type="file" accept=".csv,text/csv,.txt,.xlsx,.xls" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {fileName && <span className="truncate text-sm text-slate-500">{fileName}</span>}
      </div>
      <p className="text-xs text-slate-500">
        Columnas obligatorias: <strong>Nombre, Apellidos, Correo</strong>. Opcionales: Matrícula, Grupo, ID.
      </p>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          {blocked && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              Faltan columnas: <strong>{result.missingColumns.join(", ")}</strong>. Usa la plantilla para que los encabezados coincidan.
            </p>
          )}
          {result.unknownColumns.length > 0 && (
            <p className="text-xs text-slate-500">Se ignorarán estas columnas: {result.unknownColumns.join(", ")}.</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">{valid.length} listas para importar</span>
            {problems > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">{problems} con problemas</span>}
            {problems > 0 && (
              <>
                <label className="ml-auto inline-flex items-center gap-2 text-slate-600">
                  <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} className="accent-violet-600" />
                  Ver solo problemas
                </label>
                <Button size="sm" variant="secondary" onClick={() => downloadBlob(`errores-${slugify(className)}.csv`, csvBlob(errorReport(result.rows)))}>
                  <FileDown className="size-4" /> Reporte de errores
                </Button>
              </>
            )}
          </div>
          <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Línea</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Apellidos</th>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2">Matrícula</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.rows
                  .filter((r) => !onlyProblems || r.status !== "ok")
                  .map((r) => (
                    <tr key={r.line} className={r.status === "error" ? "bg-red-50/50" : undefined}>
                      <td className="px-3 py-1.5 text-slate-400">{r.line}</td>
                      <td className="px-3 py-1.5">{r.entry.first_name || <em className="text-red-600">vacío</em>}</td>
                      <td className="px-3 py-1.5">{r.entry.last_name || <em className="text-red-600">vacío</em>}</td>
                      <td className="max-w-48 truncate px-3 py-1.5">{r.entry.email || <em className="text-red-600">vacío</em>}</td>
                      <td className="px-3 py-1.5">{r.entry.student_number}</td>
                      <td className="px-3 py-1.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_INFO[r.status].cls)}>{STATUS_INFO[r.status].label}</span>
                        {r.problems.length > 0 && <div className="mt-0.5 text-xs text-slate-500">{r.problems.join("; ")}</div>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={doImport} disabled={blocked || !valid.length || pending}>
              {pending ? "Importando…" : `Importar ${valid.length} estudiante${valid.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
