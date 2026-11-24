"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { useSyncExternalStore } from "react";

const KEY = "evalqr:cookies-ok";
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

/** Aviso breve: solo usamos cookies esenciales. */
export function CookieNotice() {
  const accepted = useSyncExternalStore(subscribe, read, () => true);
  if (accepted) return null;
  return (
    <div role="region" aria-label="Aviso de cookies" className="no-print fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl bg-violet-950 p-4 text-sm text-white shadow-2xl sm:left-4 sm:right-auto">
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 size-5 shrink-0 text-sun" aria-hidden />
        <p className="flex-1">
          Usamos solo cookies esenciales para mantener tu sesión iniciada. Sin publicidad ni rastreo.{" "}
          <Link href="/cookies" className="font-semibold text-turquoise underline">
            Más información
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {}
            listeners.forEach((l) => l());
          }}
          className="shrink-0 rounded-lg bg-turquoise px-3 py-1.5 font-bold text-violet-950 hover:bg-[#33e0c8]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
