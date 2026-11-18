"use client";

import { FileSpreadsheet, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { downloadBlob, slugify } from "@/lib/qr";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { gradeWorksheet } from "@/lib/worksheet/grading";
import type { WorksheetData, WsAnswers } from "@/lib/worksheet/types";
import { WorksheetPlayer } from "./player";

interface Submission {
  id: string;
  student_name: string;
  student_group: string | null;
  answers: WsAnswers;
  manual_points: Record<string, number>;
  feedback: string | null;
  created_at: string;
}

export function WorksheetResults({ toolId, data, title }: { toolId: string; data: WorksheetData; title: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [group, setGroup] = useState("all");

  const load = useCallback(async () => {
    const { data: rows, error: err } = await supabase
      .from("worksheet_submissions")
      .select("*")
      .eq("tool_id", toolId)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setSubs((rows as Submission[]) ?? []);
  }, [supabase, toolId]);

  useEffect(() => {
    // Carga inicial desde Supabase
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const graded = useMemo(
    () => (subs ?? []).map((s) => ({ ...s, grade: gradeWorksheet(data.elements, s.answers ?? {}, s.manual_points ?? {}) })),
    [subs, data.elements],
  );
  const groups = [...new Set(graded.map((s) => s.student_group).filter(Boolean))] as string[];
  const visible = graded.filter((s) => group === "all" || s.student_group === group);
  const open = graded.find((s) => s.id === openId) ?? null;
  const avg = visible.length ? visible.reduce((a, s) => a + (s.grade.max ? s.grade.score / s.grade.max : 0), 0) / visible.length : 0;

  async function exportExcel() {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Respuestas");
    ws.addRow([title]).font = { bold: true, size: 14 };
    ws.addRow([data.topic ? `Tema: ${data.topic}` : ""]);
    ws.addRow([]);
    const head = ws.addRow(["Alumno", "Grupo", "Enviada", "Calificación", "Máximo", "Porcentaje", "Por revisar (pts)", "Comentario"]);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } };
    visible.forEach((s) =>
      ws.addRow([
        s.student_name,
        s.student_group ?? "",
        new Date(s.created_at),
        s.grade.score,
        s.grade.max,
        s.grade.max ? s.grade.score / s.grade.max : 0,
        s.grade.pendingManual || "",
        s.feedback ?? "",
      ]),
    );
    ws.columns = [{ width: 30 }, { width: 12 }, { width: 18 }, { width: 13 }, { width: 10 }, { width: 12 }, { width: 16 }, { width: 40 }];
    ws.getColumn(3).numFmt = "dd/mm/yyyy hh:mm";
    ws.getColumn(6).numFmt = "0%";
    const buf = await wb.xlsx.writeBuffer();
    downloadBlob(`respuestas-${slugify(title)}.xlsx`, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  }

  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>;
  if (!subs) return <Loader2 className="mx-auto size-6 animate-spin text-slate-400" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="violet">{visible.length} respuestas</Badge>
        {visible.length > 0 && <Badge>Promedio: {Math.round(avg * 100)}%</Badge>}
        {groups.length > 0 && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm" aria-label="Grupo">
            <option value="all">Todos los grupos</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={load}>
            <RefreshCw className="size-4" /> Actualizar
          </Button>
          <Button size="sm" variant="secondary" onClick={exportExcel} disabled={!visible.length}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Aún no hay respuestas. Usa <strong>Compartir</strong> para enviar el enlace o QR a tus alumnos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Alumno</th>
                <th className="px-4 py-2">Grupo</th>
                <th className="px-4 py-2">Enviada</th>
                <th className="px-4 py-2">Calificación</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((s) => {
                const pct = s.grade.max ? Math.round((s.grade.score / s.grade.max) * 100) : 0;
                return (
                  <tr key={s.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setOpenId(s.id)}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{s.student_name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.student_group}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDateTime(s.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold tabular-nums">
                        {s.grade.score} / {s.grade.max}
                      </span>{" "}
                      <span className="text-slate-500">({pct}%)</span>
                      {s.grade.pendingManual > 0 && <Badge tone="amber" className="ml-2">Por revisar</Badge>}
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        aria-label={`Eliminar respuesta de ${s.student_name}`}
                        className="rounded p-1 text-red-600 hover:bg-red-50"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`¿Eliminar la respuesta de ${s.student_name}?`)) return;
                          await supabase.from("worksheet_submissions").delete().eq("id", s.id);
                          load();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpenId(null)} title={open ? `${open.student_name}${open.student_group ? ` · ${open.student_group}` : ""}` : ""} size="xl">
        {open && <SubmissionDetail key={open.id} sub={open} data={data} onSaved={load} />}
      </Modal>
    </div>
  );
}

function SubmissionDetail({
  sub,
  data,
  onSaved,
}: {
  sub: Submission & { grade: ReturnType<typeof gradeWorksheet> };
  data: WorksheetData;
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [manual, setManual] = useState<Record<string, number>>(sub.manual_points ?? {});
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const openEls = data.elements.filter((e) => e.type === "open");
  const grade = gradeWorksheet(data.elements, sub.answers ?? {}, manual);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="violet">
          Calificación: {grade.score} / {grade.max} ({grade.max ? Math.round((grade.score / grade.max) * 100) : 0}%)
        </Badge>
        <span className="text-slate-500">Enviada {formatDateTime(sub.created_at)}</span>
      </div>

      {openEls.length > 0 && (
        <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
          <h3 className="font-semibold text-teal-900">Respuestas abiertas</h3>
          {openEls.map((el, i) => (
            <div key={el.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px] sm:items-start">
              <div>
                <div className="text-xs font-medium text-teal-800">
                  Pregunta abierta {i + 1} (página {el.page + 1})
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-sm text-slate-800">
                  {typeof sub.answers[el.id] === "string" && (sub.answers[el.id] as string).trim() ? (sub.answers[el.id] as string) : <em className="text-slate-400">Sin respuesta</em>}
                </p>
              </div>
              <Field label={`Puntos (de ${el.points})`}>
                <Input
                  type="number"
                  min={0}
                  max={el.points}
                  step="0.5"
                  value={manual[el.id] ?? ""}
                  onChange={(e) => {
                    setSaved(false);
                    const v = e.target.value;
                    setManual((m) => {
                      const next = { ...m };
                      if (v === "") delete next[el.id];
                      else next[el.id] = Math.min(el.points, Math.max(0, Number(v)));
                      return next;
                    });
                  }}
                  className="h-9 bg-white"
                />
              </Field>
            </div>
          ))}
        </div>
      )}

      <Field label="Comentario para el alumno (opcional)">
        <Textarea rows={2} value={feedback} onChange={(e) => (setFeedback(e.target.value), setSaved(false))} />
      </Field>
      <div className="flex items-center gap-2">
        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const { error } = await supabase.from("worksheet_submissions").update({ manual_points: manual, feedback: feedback || null }).eq("id", sub.id);
            setSaving(false);
            if (error) return window.alert(error.message);
            setSaved(true);
            onSaved();
          }}
        >
          {saving && <Loader2 className="size-4 animate-spin" />} Guardar calificación
        </Button>
        {saved && <span className="text-sm text-emerald-700">Guardado</span>}
      </div>

      <WorksheetPlayer data={data} answers={sub.answers ?? {}} grade={grade} reveal readOnly />
    </div>
  );
}
