"use client";

import { CheckCheck, Loader2, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { clearRead, markAllRead } from "./actions";

/** Avisa a la campana que se actualice. */
const ping = () => window.dispatchEvent(new Event("evalqr:notifications"));

export function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllRead();
          ping();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />} Marcar todo leído
    </button>
  );
}

export function ClearReadButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await clearRead();
          ping();
        })
      }
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Borrar leídas
    </button>
  );
}
