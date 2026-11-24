"use client";

import { Loader2, MessageSquareText, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/aula/notifications";
import { cn } from "@/lib/utils";
import { addComment, deleteComment } from "@/app/(organizador)/aula/collab-actions";

interface Comment {
  id: string;
  author_id: string | null;
  author_name: string;
  is_teacher: boolean;
  body: string;
  created_at: string;
}

/** Conversación corta entre docente y estudiante sobre una entrega. */
export function SubmissionComments({ submissionId, classId, startOpen = false }: { submissionId: string; classId: string; startOpen?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(startOpen);
  const [items, setItems] = useState<Comment[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date().getTime());

  const load = useCallback(async () => {
    const [{ data }, { data: auth }] = await Promise.all([supabase.rpc("submission_comment_list", { sid: submissionId }), supabase.auth.getClaims()]);
    setItems((data ?? []) as Comment[]);
    setMe((auth?.claims?.sub as string) ?? null);
    setNow(new Date().getTime());
  }, [supabase, submissionId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [open, load]);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await addComment(submissionId, classId, text);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "No se pudo enviar.");
    setText("");
    load();
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:underline">
        <MessageSquareText className="size-4" /> Comentarios
      </button>
    );

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <MessageSquareText className="size-4 text-violet-600" /> Comentarios
      </div>
      {items === null ? (
        <Loader2 className="size-5 animate-spin text-slate-400" />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay comentarios. Escribe una duda o retroalimentación.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => {
            const mine = c.author_id === me;
            return (
              <li key={c.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-violet-600 text-white" : c.is_teacher ? "bg-lavender text-violet-950" : "bg-slate-100 text-slate-800")}>
                  <div className={cn("text-[11px] font-semibold", mine ? "text-violet-100" : "text-slate-500")}>
                    {mine ? "Tú" : c.author_name}
                    {c.is_teacher && !mine ? " · Docente" : ""} · {timeAgo(c.created_at, now)}
                  </div>
                  <p className="whitespace-pre-line">{c.body}</p>
                  {mine && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("¿Borrar tu comentario?")) return;
                        await deleteComment(c.id);
                        load();
                      }}
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-violet-100 hover:text-white"
                    >
                      <Trash2 className="size-3" /> Borrar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Escribe un comentario…"
          aria-label="Escribe un comentario"
          className="min-h-11 w-full flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !text.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:bg-violet-300"
          aria-label="Enviar comentario"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
