"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { gradeWorksheet } from "@/lib/worksheet/grading";
import { GRADED_TYPES, type WorksheetData, type WsAnswers } from "@/lib/worksheet/types";
import { WorksheetPlayer } from "./player";

/** Vista del alumno: nombre, contestar sobre el PDF y enviar al maestro. */
export function StudentWorksheet({ code, data }: { code: string; data: WorksheetData }) {
  const storageKey = `evalqr:ws:${code}`;
  const [answers, setAnswers] = useState<WsAnswers>({});
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recuperar avance guardado en este dispositivo
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { answers: WsAnswers; name: string; group: string; sent?: boolean };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAnswers(saved.answers ?? {});
        setName(saved.name ?? "");
        setGroup(saved.group ?? "");
        setSent(!!saved.sent);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, name, group, sent }));
    } catch {}
  }, [storageKey, answers, name, group, sent]);

  const grade = useMemo(() => (sent ? gradeWorksheet(data.elements, answers) : null), [sent, data.elements, answers]);
  const answerable = data.elements.filter((e) => GRADED_TYPES.includes(e.type)).length;

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Escribe tu nombre antes de enviar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const answered = Object.values(answers).filter((v) => v !== undefined && v !== "" && v !== false).length;
    if (answered < answerable && !window.confirm("Parece que hay preguntas sin contestar. ¿Enviar de todos modos?")) return;
    setSending(true);
    const { error: err } = await createClient().rpc("submit_worksheet", {
      code,
      student_name: name.trim(),
      student_group: group.trim() || null,
      answers,
    });
    setSending(false);
    if (err) return setError(/disponible/.test(err.message) ? "El maestro ya no está recibiendo respuestas de esta ficha." : err.message);
    setSent(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      {(data.topic || data.instructions) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {data.topic && <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{data.topic}</p>}
          {data.instructions && <p className="mt-1 whitespace-pre-wrap text-slate-700">{data.instructions}</p>}
        </div>
      )}

      {sent && grade ? (
        <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-6 text-center">
          <CheckCircle2 className="size-12 text-emerald-600" />
          <h2 className="mt-2 text-xl font-semibold text-slate-900">¡Enviado a tu maestro!</h2>
          <p className="mt-1 text-3xl font-black text-emerald-700">
            {grade.score} / {grade.max}
          </p>
          {grade.pendingManual > 0 && (
            <p className="mt-1 text-sm text-slate-600">Tu maestro todavía revisará {grade.pendingManual} punto(s) de respuestas abiertas.</p>
          )}
          <button
            type="button"
            className="mt-3 text-sm text-slate-600 underline"
            onClick={() => {
              if (!window.confirm("¿Contestar de nuevo? Tu envío anterior se conserva.")) return;
              setAnswers({});
              setSent(false);
            }}
          >
            Volver a contestar
          </button>
        </div>
      ) : (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[2fr_1fr]">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-800">
              Tu nombre <span className="text-red-600">*</span>
            </span>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Nombre y apellido" autoComplete="name" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-800">Grupo (opcional)</span>
            <Input value={group} onChange={(e) => setGroup(e.target.value)} maxLength={80} placeholder="Ej. 3°A" />
          </label>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}

      <WorksheetPlayer
        data={data}
        answers={answers}
        onAnswers={sent ? undefined : setAnswers}
        readOnly={sent}
        grade={sent && data.showCorrection ? grade : null}
        reveal={sent && data.showCorrection}
      />

      {!sent && (
        <div className="pointer-events-none sticky bottom-3 z-20 flex justify-center">
          <Button size="lg" onClick={submit} disabled={sending} className="pointer-events-auto shadow-lg">
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />} Terminar y enviar
          </Button>
        </div>
      )}
    </div>
  );
}
