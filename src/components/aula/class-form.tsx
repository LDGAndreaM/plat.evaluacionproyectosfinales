"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { CLASS_COLORS, DAYS, type ClassRow, type ScheduleSlot } from "@/lib/aula/types";
import type { ActionResult } from "@/lib/types";
import { cn, SEMESTER_SUGGESTIONS } from "@/lib/utils";

function currentPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() < 6 ? `Enero–Mayo ${y}` : `Agosto–Diciembre ${y}`;
}

export function ClassForm({
  action,
  cls,
  submitLabel,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  cls?: ClassRow;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(cls?.schedule ?? []);
  const [color, setColor] = useState(cls?.color ?? CLASS_COLORS[0]);

  const update = (i: number, patch: Partial<ScheduleSlot>) =>
    setSchedule((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form action={formAction} className="space-y-5">
      {cls && <input type="hidden" name="id" value={cls.id} />}
      <input type="hidden" name="schedule" value={JSON.stringify(schedule)} />
      <input type="hidden" name="color" value={color} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre del grupo" htmlFor="name" required className="sm:col-span-2">
          <Input id="name" name="name" required maxLength={150} defaultValue={cls?.name} placeholder="Diseño de Interfaces · 7A" />
        </Field>
        <Field label="Materia" htmlFor="subject">
          <Input id="subject" name="subject" maxLength={150} defaultValue={cls?.subject ?? ""} placeholder="Diseño de Interfaces de Usuario" />
        </Field>
        <Field label="Periodo / ciclo escolar" htmlFor="period">
          <Input id="period" name="period" maxLength={80} defaultValue={cls?.period ?? currentPeriod()} />
        </Field>
        <Field label="Semestre o grado" htmlFor="grade">
          <Input id="grade" name="grade" maxLength={40} list="grade-suggestions" defaultValue={cls?.grade ?? ""} placeholder="7°" />
          <datalist id="grade-suggestions">
            {SEMESTER_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Color" htmlFor="color-0">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color del grupo">
            {CLASS_COLORS.map((c, i) => (
              <button
                key={c}
                id={`color-${i}`}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Color ${i + 1}`}
                onClick={() => setColor(c)}
                className={cn("size-9 rounded-full ring-offset-2", color === c && "ring-2 ring-slate-800")}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
        <Field label="Descripción" htmlFor="description" className="sm:col-span-2">
          <Textarea id="description" name="description" maxLength={2000} defaultValue={cls?.description ?? ""} placeholder="Aula, objetivos o lo que quieras que vean tus estudiantes." />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Días y horario</legend>
        <p className="mb-2 text-xs text-slate-500">Más adelante se usará para la asistencia y la tolerancia de retardos.</p>
        <div className="space-y-2">
          {schedule.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
              <Select aria-label="Día" value={s.day} onChange={(e) => update(i, { day: e.target.value as ScheduleSlot["day"] })} className="w-36">
                {DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </Select>
              <Input aria-label="Hora de inicio" type="time" value={s.start} onChange={(e) => update(i, { start: e.target.value })} className="w-32" />
              <span className="text-slate-400">a</span>
              <Input aria-label="Hora de fin" type="time" value={s.end} onChange={(e) => update(i, { end: e.target.value })} className="w-32" />
              <button
                type="button"
                onClick={() => setSchedule((x) => x.filter((_, j) => j !== i))}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Quitar día"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => {
            const last = schedule.at(-1);
            const nextDay = DAYS[Math.min(DAYS.findIndex((d) => d.key === last?.day) + 2, DAYS.length - 1)]?.key ?? "lun";
            setSchedule((x) => [...x, { day: last ? nextDay : "lun", start: last?.start ?? "08:00", end: last?.end ?? "10:00" }]);
          }}
        >
          <Plus className="size-4" /> Agregar día
        </Button>
      </fieldset>

      <FormMessage state={state} />
      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
