"use client";

import { Mail } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { setEmailDigest } from "./actions";

export function EmailDigestCard({ enabled, email, role }: { enabled: boolean; email: string | null; role: "teacher" | "student" }) {
  const [on, setOn] = useOptimistic(enabled);
  const [pending, start] = useTransition();
  return (
    <Card className="rounded-2xl">
      <CardHeader title="Correos" />
      <div className="space-y-3 p-5 text-sm">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 shrink-0 text-violet-600" />
            <span>
              <span className="block font-semibold text-slate-900">Resumen diario por correo</span>
              <span className="text-slate-600">
                {role === "student"
                  ? "Cada mañana, si hay algo nuevo: tareas que vencen pronto, calificaciones, avisos y comentarios."
                  : "Cada mañana, si hay algo nuevo: entregas, justificantes, comentarios y estudiantes que se unieron."}
              </span>
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={on}
            disabled={pending}
            aria-label="Resumen diario por correo"
            onChange={(e) => {
              const v = e.target.checked;
              start(async () => {
                setOn(v);
                await setEmailDigest(v);
              });
            }}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-violet-600 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
          />
        </label>
        {email && <p className="text-xs text-slate-500">Se envía a {email}. Solo llega un correo al día, y solo cuando hay novedades.</p>}
      </div>
    </Card>
  );
}
