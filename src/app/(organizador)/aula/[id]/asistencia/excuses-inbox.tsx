"use client";

import { Check, FileText, HelpCircle, Loader2, Paperclip, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { dateRangeLabel, EXCUSE_INFO, type Excuse } from "@/lib/aula/attendance";
import { studentName, type ClassStudent } from "@/lib/aula/types";
import { cn, formatDate } from "@/lib/utils";
import { openAfter } from "@/lib/qr";
import { excuseFileUrl, reviewExcuse } from "../../attendance-actions";

export function ExcusesInbox({ classId, excuses, students }: { classId: string; excuses: Excuse[]; students: ClassStudent[] }) {
  const [filter, setFilter] = useState<"pending" | "all">(excuses.some((e) => e.status === "pending") ? "pending" : "all");
  const names = new Map(students.map((s) => [s.id, studentName(s)]));
  const list = excuses.filter((e) => filter === "all" || e.status === "pending");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            ["pending", `Por revisar (${excuses.filter((e) => e.status === "pending").length})`],
            ["all", `Todos (${excuses.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={cn("rounded-full px-3 py-1 text-sm font-semibold", filter === k ? "bg-turquoise-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-10" />}
          title={filter === "pending" ? "No hay justificantes por revisar" : "Aún no hay justificantes"}
          description="Tus estudiantes los envían desde su cuenta, en la sección Justificantes."
        />
      ) : (
        list.map((e) => <ExcuseCard key={e.id} classId={classId} e={e} name={names.get(e.student_id) ?? "Estudiante"} />)
      )}
    </div>
  );
}

function ExcuseCard({ classId, e, name }: { classId: string; e: Excuse; name: string }) {
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [opening, setOpening] = useState(false);

  function decide(decision: "approved" | "rejected" | "needs_info") {
    setMsg(null);
    if (decision !== "approved" && !comment.trim()) {
      setMsg("Escribe un comentario para el estudiante.");
      return;
    }
    start(async () => {
      const res = await reviewExcuse(classId, e.id, decision, comment);
      if (!res.ok) setMsg(res.error);
      else if (decision === "approved") setMsg(res.updated ? `Aprobado. ${res.updated} falta(s) pasaron a justificadas.` : "Aprobado.");
    });
  }

  async function openFile() {
    if (!e.file_path) return;
    setOpening(true);
    await openAfter(() => excuseFileUrl(e.file_path!));
    setOpening(false);
  }

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">{name}</div>
          <div className="text-sm text-slate-600">
            Fechas: <strong>{dateRangeLabel(e.date_from, e.date_to)}</strong> · Enviado {formatDate(e.created_at)}
          </div>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", EXCUSE_INFO[e.status].cls)}>{EXCUSE_INFO[e.status].label}</span>
      </div>
      <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-slate-800">{e.reason}</p>
      {e.file_path && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={openFile} disabled={opening}>
          {opening ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />} Ver archivo{e.file_name ? `: ${e.file_name}` : ""}
        </Button>
      )}
      {e.teacher_comment && e.status !== "pending" && (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold">Tu comentario:</span> {e.teacher_comment}
        </p>
      )}
      {e.status === "pending" && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <Textarea
            value={comment}
            onChange={(ev) => setComment(ev.target.value)}
            maxLength={1000}
            placeholder="Comentario para el estudiante (obligatorio si rechazas o pides más información)"
            className="min-h-16"
            aria-label="Comentario"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => decide("approved")} disabled={pending}>
              <Check className="size-4" /> Aprobar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => decide("needs_info")} disabled={pending}>
              <HelpCircle className="size-4" /> Pedir más información
            </Button>
            <Button size="sm" variant="danger" onClick={() => decide("rejected")} disabled={pending}>
              <X className="size-4" /> Rechazar
            </Button>
          </div>
        </div>
      )}
      {msg && <p className="mt-3 rounded-lg bg-lavender px-3 py-2 text-sm text-violet-900">{msg}</p>}
    </Card>
  );
}
