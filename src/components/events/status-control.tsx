"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { setEventStatus } from "@/app/(organizador)/eventos/actions";
import type { EventStatus } from "@/lib/types";
import { STATUS_DESCRIPTIONS, STATUS_LABELS, STATUS_ORDER, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CONFIRM: Partial<Record<EventStatus, string>> = {
  open: "¿Abrir el evento? Los evaluadores podrán escanear el QR y calificar.",
  closed: "¿Cerrar el evento? Ya no se aceptarán evaluaciones nuevas ni cambios.",
  published: "¿Publicar resultados? Se habilitará la pantalla de premiación con el podio.",
  draft: "¿Regresar a borrador? Los evaluadores ya no podrán entrar.",
};

const NEXT_LABEL: Partial<Record<EventStatus, string>> = {
  draft: "Abrir evaluaciones",
  open: "Cerrar evaluaciones",
  closed: "Publicar resultados",
};

export function StatusControl({ eventId, status, canEdit }: { eventId: string; status: EventStatus; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const idx = STATUS_ORDER.indexOf(status);

  function go(target: EventStatus) {
    if (!window.confirm(CONFIRM[target] ?? "¿Cambiar el estado del evento?")) return;
    setError(null);
    start(async () => {
      const res = await setEventStatus(eventId, target);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <ol className="grid gap-2 sm:grid-cols-4">
        {STATUS_ORDER.map((s, i) => (
          <li
            key={s}
            className={cn(
              "rounded-lg border p-3",
              i === idx ? "border-slate-900 bg-slate-900 text-white" : i < idx ? "border-slate-200 bg-slate-50" : "border-slate-200",
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-xs",
                  i === idx ? "bg-white text-slate-900" : i < idx ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600",
                )}
              >
                {i < idx ? <Check className="size-3" /> : i + 1}
              </span>
              {STATUS_LABELS[s]}
            </div>
            <p className={cn("mt-1 text-xs", i === idx ? "text-slate-200" : "text-slate-500")}>{STATUS_DESCRIPTIONS[s]}</p>
          </li>
        ))}
      </ol>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          {NEXT_LABEL[status] && (
            <Button onClick={() => go(STATUS_ORDER[idx + 1])} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {NEXT_LABEL[status]}
            </Button>
          )}
          {idx > 0 && (
            <Button variant="secondary" onClick={() => go(STATUS_ORDER[idx - 1])} disabled={pending}>
              Regresar a “{STATUS_LABELS[STATUS_ORDER[idx - 1]]}”
            </Button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
