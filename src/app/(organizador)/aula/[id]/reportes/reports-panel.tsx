"use client";

import { AlertTriangle, BarChart3, CalendarCheck, ClipboardList, FileCheck2, FileSpreadsheet, FileText, Loader2, Table2, User, Users, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { exportReport, type ReportFormat } from "@/components/aula/report-export";
import { buildReport, reportFileName, REPORTS, type ReportData, type ReportKey } from "@/lib/aula/reports";
import { studentName } from "@/lib/aula/types";
import { cn } from "@/lib/utils";
import { BackupCard } from "./backup";

const ICONS: Record<ReportKey, { icon: LucideIcon; cls: string }> = {
  students: { icon: Users, cls: "bg-violet-100 text-violet-700" },
  attendance_sessions: { icon: CalendarCheck, cls: "bg-turquoise-50 text-turquoise-700" },
  attendance_summary: { icon: BarChart3, cls: "bg-turquoise-50 text-turquoise-700" },
  excuses: { icon: FileCheck2, cls: "bg-sky-100 text-sky-800" },
  deliveries: { icon: ClipboardList, cls: "bg-[#fff8e6] text-[#9a6400]" },
  activity_scores: { icon: Table2, cls: "bg-[#fff8e6] text-[#9a6400]" },
  final_grades: { icon: FileSpreadsheet, cls: "bg-emerald-100 text-emerald-800" },
  risk: { icon: AlertTriangle, cls: "bg-[#fff1f4] text-[#b4234a]" },
  individual: { icon: User, cls: "bg-[#f6efff] text-[#8a2be2]" },
};

const LABEL: Record<ReportFormat, string> = { xlsx: "Excel", csv: "CSV", pdf: "PDF" };

export function ReportsPanel({ data }: { data: ReportData }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [student, setStudent] = useState(data.students[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const meta = [data.cls.subject, data.cls.period, data.teacher, `Generado ${new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Hermosillo" }).format(new Date())}`]
    .filter(Boolean)
    .join(" · ");

  async function run(key: ReportKey, format: ReportFormat) {
    setError(null);
    const s = key === "individual" ? data.students.find((x) => x.id === student) : undefined;
    if (key === "individual" && !s) return setError("Elige un estudiante.");
    setBusy(`${key}:${format}`);
    try {
      const tables = buildReport(key, data, s?.id);
      const title = REPORTS.find((r) => r.key === key)!.title;
      await exportReport(format, tables, {
        fileName: reportFileName(key, data.cls.name, s),
        heading: s ? `${studentName(s)} · ${data.cls.name}` : `${title} · ${data.cls.name}`,
        meta,
      });
    } catch {
      setError("No se pudo generar el archivo. Inténtalo de nuevo.");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {data.students.length} estudiantes · {data.sessions.length} sesiones de asistencia · {data.activities.length} actividades publicadas. Los
        archivos se generan en tu navegador con los datos actuales.
      </p>
      <BackupCard data={data} meta={meta} />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => {
          const { icon: Icon, cls } = ICONS[r.key];
          return (
            <Card key={r.key} className="flex flex-col rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", cls)}>
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{r.title}</h3>
                  <p className="text-sm text-slate-500">{r.description}</p>
                </div>
              </div>
              {r.key === "individual" && (
                <Select value={student} onChange={(e) => setStudent(e.target.value)} className="mt-3" aria-label="Estudiante del reporte individual">
                  {data.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.last_name}
                      {s.last_name && ", "}
                      {s.first_name}
                    </option>
                  ))}
                </Select>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {r.formats.map((f) => {
                  const id = `${r.key}:${f}`;
                  return (
                    <button
                      key={f}
                      type="button"
                      disabled={!!busy || !data.students.length}
                      onClick={() => run(r.key, f)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
                      aria-label={`${r.title} en ${LABEL[f]}`}
                    >
                      {busy === id ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4 text-slate-400" />} {LABEL[f]}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
