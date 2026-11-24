"use client";

import { Megaphone, Pin, PinOff, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Announcement } from "@/lib/aula/announcements";
import { cn, formatDate } from "@/lib/utils";
import { deleteAnnouncement, postAnnouncement, togglePin } from "../../collab-actions";

export function AnnouncementBoard({ classId, items }: { classId: string; items: Announcement[] }) {
  const [state, action] = useActionState(postAnnouncement, null);
  const [pending, start] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [last, setLast] = useState(state);
  if (state !== last) {
    setLast(state);
    if (state?.ok) setFormKey((k) => k + 1);
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card className="h-fit rounded-2xl">
        <CardHeader title="Nuevo aviso" description="Tus estudiantes recibirán una notificación." />
        <form key={formKey} action={action} className="space-y-3 p-5">
          <input type="hidden" name="class_id" value={classId} />
          <Input name="title" required maxLength={150} placeholder="Ej. Mañana no hay clase" aria-label="Título del aviso" />
          <Textarea name="body" maxLength={4000} placeholder="Detalles (opcional): material que deben traer, cambio de salón, fechas…" aria-label="Detalle del aviso" className="min-h-28" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="pinned" className="size-4 accent-violet-600" /> Fijar arriba
          </label>
          <FormMessage state={state} />
          <SubmitButton className="rounded-xl" pendingText="Publicando…">
            <Megaphone className="size-4" /> Publicar aviso
          </SubmitButton>
        </form>
      </Card>
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState icon={<Megaphone className="size-10" />} title="Aún no hay avisos" description="Publica anuncios para todo el grupo: cambios de horario, material, recordatorios." />
        ) : (
          items.map((a) => (
            <Card key={a.id} className={cn("rounded-2xl p-5", a.pinned && "border-sun bg-[#fffbeb]")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && <span className="inline-flex items-center gap-1 rounded-full bg-sun/40 px-2 py-0.5 text-xs font-bold text-[#8a5a00]"><Pin className="size-3" /> Fijado</span>}
                    <span className="text-xs text-slate-500">{formatDate(a.created_at)}</span>
                  </div>
                  <h3 className="mt-1 font-bold text-slate-900">{a.title}</h3>
                  {a.body && <p className="mt-1 whitespace-pre-line text-slate-700">{a.body}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => start(() => togglePin(classId, a.id, !a.pinned))}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={a.pinned ? "Desfijar aviso" : "Fijar aviso"}
                    title={a.pinned ? "Desfijar" : "Fijar arriba"}
                  >
                    {a.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => confirm("¿Eliminar este aviso?") && start(() => deleteAnnouncement(classId, a.id))}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar aviso"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
