"use client";

import { Copy, Crown, Loader2, LogOut, UserPlus, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { addCoTeacher, duplicateClass, leaveClass, removeCoTeacher } from "../../collab-actions";

function nextPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() < 6 ? `Agosto–Diciembre ${y}` : `Enero–Mayo ${y + 1}`;
}

export function CoTeachers({
  classId,
  isOwner,
  teachers,
}: {
  classId: string;
  isOwner: boolean;
  teachers: { user_id: string; full_name: string; email: string; is_owner: boolean }[];
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="rounded-2xl">
      <CardHeader
        title="Docentes del grupo"
        description="Los co-docentes pueden pasar lista, crear actividades, calificar y ver reportes. Solo el titular elimina el grupo."
      />
      <ul className="divide-y divide-slate-100">
        {teachers.map((t) => (
          <li key={t.user_id} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                {t.full_name || t.email}
                {t.is_owner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sun/40 px-2 py-0.5 text-xs font-bold text-[#8a5a00]">
                    <Crown className="size-3" /> Titular
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-slate-500">{t.email}</div>
            </div>
            {isOwner && !t.is_owner && (
              <button
                type="button"
                disabled={pending}
                onClick={() => confirm(`¿Quitar a ${t.full_name || t.email} del grupo?`) && start(() => removeCoTeacher(classId, t.user_id))}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Quitar a ${t.full_name || t.email}`}
              >
                <X className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-100 p-5">
        {isOwner ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(null);
              start(async () => {
                const res = await addCoTeacher(classId, email);
                if (res.ok) {
                  setMsg({ ok: true, text: `${res.name} ahora es co-docente.` });
                  setEmail("");
                } else setMsg({ ok: false, text: res.error });
              });
            }}
          >
            <label htmlFor="co-email" className="text-sm font-medium text-slate-800">
              Agregar co-docente por correo
            </label>
            <div className="flex gap-2">
              <Input id="co-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Agregar
              </Button>
            </div>
            <p className="text-xs text-slate-500">Debe tener cuenta de docente en EvalúaQR.</p>
            {msg && <p className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{msg.text}</p>}
          </form>
        ) : (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => confirm("¿Salir de este grupo? Dejarás de verlo.") && start(() => leaveClass(classId))}>
            <LogOut className="size-4" /> Salir del grupo
          </Button>
        )}
      </div>
    </Card>
  );
}

export function DuplicateClass({ id, name }: { id: string; name: string }) {
  const [state, action] = useActionState(duplicateClass, null);
  return (
    <Card className="rounded-2xl">
      <CardHeader
        title="Duplicar para otro periodo"
        description="Crea un grupo nuevo con el mismo horario, ajustes de asistencia y ponderaciones. Sin estudiantes."
      />
      <form action={action} className="space-y-4 p-5">
        <input type="hidden" name="class_id" value={id} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre del grupo nuevo" htmlFor="dup-name" required>
            <Input id="dup-name" name="name" required maxLength={150} defaultValue={`${name} (nuevo)`} />
          </Field>
          <Field label="Periodo" htmlFor="dup-period">
            <Input id="dup-period" name="period" maxLength={80} defaultValue={nextPeriod()} />
          </Field>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="with_activities" defaultChecked className="mt-0.5 size-5 accent-violet-600" />
          <span>
            <span className="font-medium text-slate-900">Copiar actividades</span>
            <span className="block text-slate-500">Con sus instrucciones, recursos y rúbricas, como borrador y sin fechas, para que las publiques cuando toque.</span>
          </span>
        </label>
        <FormMessage state={state} />
        <SubmitButton variant="secondary" pendingText="Duplicando…">
          <Copy className="size-4" /> Duplicar grupo
        </SubmitButton>
      </form>
    </Card>
  );
}
