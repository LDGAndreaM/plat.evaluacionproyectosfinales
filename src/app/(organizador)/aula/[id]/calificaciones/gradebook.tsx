"use client";

import { AlertTriangle, Download, GraduationCap, Loader2, Plus, Settings2, Trash2, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { exportReport, type ReportFormat } from "@/components/aula/report-export";
import { formatRate } from "@/lib/aula/attendance";
import { CATEGORY_TYPE_LABEL, classAverage, round1, weightTotal, type CategoryType, type GradeSettings, type ManualGrade } from "@/lib/aula/grades";
import { buildReport, reportFileName, type ReportData } from "@/lib/aula/reports";
import { cn } from "@/lib/utils";
import { saveGradeSettings, setActivityCategory, setManualGrade } from "../../grade-actions";

export function Gradebook({
  classId,
  data,
  manual,
  allActivities,
}: {
  classId: string;
  data: ReportData;
  manual: ManualGrade[];
  allActivities: { id: string; title: string; status: string; grade_category: string | null }[];
}) {
  const router = useRouter();
  const { settings, students, grades } = data;
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState<ReportFormat | null>(null);
  const avg = classAverage(grades);
  const withFinal = grades.filter((g) => g.final != null);
  const passing = withFinal.filter((g) => g.passing).length;
  const risk = grades.filter((g) => g.risk.length).length;
  const pct = (v: number | null | undefined) => (v == null ? "—" : `${round1(v * 100)}%`);

  async function download(format: ReportFormat) {
    setExporting(format);
    await exportReport(format, buildReport("final_grades", data), {
      fileName: reportFileName("final_grades", data.cls.name),
      heading: `Calificaciones · ${data.cls.name}`,
      meta: [data.cls.subject, data.cls.period, data.teacher].filter(Boolean).join(" · "),
    });
    setExporting(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Promedio del grupo", avg == null ? "—" : `${avg}`, "bg-violet-50 text-violet-950", TrendingUp],
          ["Aprobados", `${passing} / ${withFinal.length}`, "bg-emerald-50 text-emerald-900", GraduationCap],
          ["En riesgo", String(risk), "bg-[#fff1f4] text-[#b4234a]", AlertTriangle],
          [`Escala · aprueba con ${settings.passing}`, `0–${settings.scale}`, "bg-turquoise-50 text-turquoise-700", Settings2],
        ].map(([label, value, cls, Icon]) => {
          const I = Icon as typeof TrendingUp;
          return (
            <div key={label as string} className={cn("flex items-center gap-3 rounded-2xl p-4", cls as string)}>
              <I className="size-7 shrink-0 opacity-80" />
              <div className="min-w-0">
                <div className="truncate text-xl font-extrabold">{value as string}</div>
                <div className="text-sm">{label as string}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {settings.categories.map((c) => `${c.name} ${c.weight}%`).join(" · ")}
          {!settings.visible_to_students && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">Oculto para estudiantes</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowSettings((v) => !v)}>
            <Settings2 className="size-4" /> Ponderaciones y escala
          </Button>
          {(["xlsx", "pdf", "csv"] as const).map((f) => (
            <Button key={f} variant="secondary" size="sm" disabled={!!exporting || !students.length} onClick={() => download(f)}>
              {exporting === f ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {f === "xlsx" ? "Excel" : f.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {showSettings && (
        <SettingsEditor
          classId={classId}
          settings={settings}
          activities={allActivities}
          onSaved={() => {
            setShowSettings(false);
            router.refresh();
          }}
        />
      )}

      {students.length === 0 ? (
        <EmptyState icon={<GraduationCap className="size-10" />} title="No hay estudiantes activos" />
      ) : (
        <Card className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="sticky left-0 z-10 min-w-44 bg-slate-50 px-4 py-2.5 uppercase tracking-wide">Estudiante</th>
                  {settings.categories.map((c) => (
                    <th key={c.id} className="px-3 py-2.5 text-right font-semibold">
                      {c.name}
                      <span className="block font-normal text-slate-400">
                        {c.weight}% · {c.type === "manual" ? `captura /${settings.scale}` : c.type === "attendance" ? "asistencia" : "actividades"}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-semibold">Final</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Asistencia</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Entregas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s, i) => {
                  const g = grades[i];
                  return (
                    <tr key={s.id} className={g.passing === false ? "bg-[#fff7f9]" : undefined}>
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-2">
                        <div className="font-medium text-slate-900">
                          {s.last_name}
                          {s.last_name && ", "}
                          {s.first_name}
                        </div>
                        {g.risk.length > 0 && <div className="text-xs text-[#b4234a]">{g.risk.join(" · ")}</div>}
                      </td>
                      {settings.categories.map((c) => (
                        <td key={c.id} className="px-3 py-2 text-right">
                          {c.type === "manual" ? (
                            <ManualCell
                              classId={classId}
                              studentId={s.id}
                              categoryId={c.id}
                              scale={settings.scale}
                              initial={manual.find((m) => m.student_id === s.id && m.category_id === c.id)?.score ?? null}
                              label={`${c.name} de ${s.first_name} ${s.last_name}`}
                              onSaved={() => router.refresh()}
                            />
                          ) : (
                            <span className="text-slate-700">{pct(g.byCategory[c.id])}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <span
                          className={cn(
                            "inline-block min-w-12 rounded-full px-2.5 py-0.5 text-center font-extrabold",
                            g.final == null ? "text-slate-400" : g.passing ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
                          )}
                        >
                          {g.final ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatRate(g.attendanceRate)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{g.deliveryRate == null ? "—" : `${g.deliveryRate}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            Los rubros sin datos (por ejemplo, un examen aún no capturado) no cuentan: la calificación se calcula con los rubros que sí tienen datos.
            {settings.missing_counts_zero ? " Las actividades vencidas sin entregar cuentan como 0." : " Las actividades vencidas sin entregar no cuentan."}
          </p>
        </Card>
      )}
    </div>
  );
}

function ManualCell({
  classId,
  studentId,
  categoryId,
  scale,
  initial,
  label,
  onSaved,
}: {
  classId: string;
  studentId: string;
  categoryId: string;
  scale: number;
  initial: number | null;
  label: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(initial == null ? "" : String(initial));
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  async function save() {
    const v = value.trim() === "" ? null : Number(value);
    if ((v ?? null) === (initial ?? null)) return;
    setState("saving");
    const res = await setManualGrade(classId, studentId, categoryId, v, scale);
    setState(res.ok ? "idle" : "error");
    if (res.ok) onSaved();
  }
  return (
    <Input
      type="number"
      min={0}
      max={scale}
      step="0.1"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      aria-label={label}
      className={cn("ml-auto h-8 w-20 text-right", state === "error" && "border-red-400 bg-red-50", state === "saving" && "opacity-60")}
      placeholder="—"
    />
  );
}

function SettingsEditor({
  classId,
  settings,
  activities,
  onSaved,
}: {
  classId: string;
  settings: GradeSettings;
  activities: { id: string; title: string; status: string; grade_category: string | null }[];
  onSaved: () => void;
}) {
  const [s, setS] = useState<GradeSettings>(settings);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const total = weightTotal(s);
  const actCats = s.categories.filter((c) => c.type === "activities");
  const setCat = (i: number, patch: Partial<GradeSettings["categories"][number]>) =>
    setS((x) => ({ ...x, categories: x.categories.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  return (
    <Card className="rounded-2xl">
      <CardHeader title="Ponderaciones y escala" description="Cambios aplican a todo el grupo y se recalcula al instante." />
      <div className="space-y-6 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1 text-sm">
            <span className="block font-medium text-slate-800">Escala</span>
            <Select
              value={s.scale}
              onChange={(e) => {
                const scale = Number(e.target.value) === 100 ? 100 : 10;
                setS((x) => ({ ...x, scale, passing: scale === 100 ? (x.scale === 10 ? x.passing * 10 : x.passing) : x.scale === 100 ? x.passing / 10 : x.passing }));
              }}
              className="w-32"
            >
              <option value={10}>0 a 10</option>
              <option value={100}>0 a 100</option>
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block font-medium text-slate-800">Calificación aprobatoria</span>
            <Input type="number" min={0} max={s.scale} step="0.1" value={s.passing} onChange={(e) => setS((x) => ({ ...x, passing: Number(e.target.value) }))} className="w-28" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-violet-600" checked={s.visible_to_students} onChange={(e) => setS((x) => ({ ...x, visible_to_students: e.target.checked }))} />
            Los estudiantes ven su calificación
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-violet-600" checked={s.missing_counts_zero} onChange={(e) => setS((x) => ({ ...x, missing_counts_zero: e.target.checked }))} />
            Actividades vencidas sin entregar cuentan como 0
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-900">Rubros</span>
            <span className={cn("rounded-full px-2.5 py-0.5 font-bold", Math.abs(total - 100) < 0.01 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>
              Total: {round1(total)}%
            </span>
          </div>
          {s.categories.map((c, i) => (
            <div key={c.id} className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_14rem_6rem_auto]">
              <Input value={c.name} onChange={(e) => setCat(i, { name: e.target.value })} maxLength={60} aria-label={`Nombre del rubro ${i + 1}`} />
              <Select value={c.type} onChange={(e) => setCat(i, { type: e.target.value as CategoryType })} aria-label={`Tipo del rubro ${i + 1}`}>
                {(Object.keys(CATEGORY_TYPE_LABEL) as CategoryType[]).map((t) => (
                  <option key={t} value={t}>
                    {CATEGORY_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
              <div className="flex items-center gap-1">
                <Input type="number" min={0} max={100} value={c.weight} onChange={(e) => setCat(i, { weight: Number(e.target.value) })} aria-label={`Porcentaje del rubro ${i + 1}`} />
                <span className="text-sm text-slate-500">%</span>
              </div>
              <button
                type="button"
                onClick={() => setS((x) => ({ ...x, categories: x.categories.filter((_, j) => j !== i) }))}
                className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Quitar rubro ${c.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setS((x) => ({ ...x, categories: [...x.categories, { id: crypto.randomUUID().slice(0, 8), name: "Participación", weight: 0, type: "manual" }] }))}
          >
            <Plus className="size-4" /> Agregar rubro
          </Button>
        </div>

        {actCats.length > 1 && activities.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">¿A qué rubro pertenece cada actividad?</div>
            {activities.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{a.title}</span>
                <Select
                  defaultValue={actCats.some((c) => c.id === a.grade_category) ? (a.grade_category ?? "") : actCats[0].id}
                  onChange={(e) => start(() => setActivityCategory(classId, a.id, e.target.value))}
                  className="h-8 w-48 py-0"
                  aria-label={`Rubro de ${a.title}`}
                >
                  {actCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
            <p className="text-xs text-slate-500">Guarda primero los rubros nuevos para poder asignarles actividades.</p>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await saveGradeSettings(classId, s);
              if (!res.ok) setError(res.error ?? "Error");
              else onSaved();
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Guardar ponderaciones
        </Button>
      </div>
    </Card>
  );
}
