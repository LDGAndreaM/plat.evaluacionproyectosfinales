"use client";

import { QrCode } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { openAttendance } from "../../attendance-actions";

export function OpenAttendanceForm({ classId, lateAfter }: { classId: string; lateAfter: number }) {
  const [state, action] = useActionState(openAttendance, null);
  const [minutes, setMinutes] = useState(5);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="minutes" value={minutes} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-800">¿Cuánto tiempo estará activo el QR?</legend>
        <div className="flex flex-wrap gap-2">
          {[2, 5, 10, 15].map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minutes === m}
              onClick={() => setMinutes(m)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-bold ring-1",
                minutes === m ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-violet-50",
              )}
            >
              {m} min
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Quien se registre en los primeros {lateAfter} min queda como <strong>Presente</strong>; después, como <strong>Retardo</strong>. Al
          cerrar, quien no se registró queda con <strong>Falta</strong>.
        </p>
      </fieldset>
      <Input name="topic" maxLength={150} placeholder="Tema de la clase (opcional)" aria-label="Tema de la clase" />
      <FormMessage state={state} />
      <SubmitButton size="lg" className="w-full rounded-xl bg-turquoise-700 hover:bg-[#006b5d] sm:w-auto" pendingText="Abriendo…">
        <QrCode className="size-5" /> Mostrar QR de asistencia
      </SubmitButton>
    </form>
  );
}
