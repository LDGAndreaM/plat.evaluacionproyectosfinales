"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

type InstallState = "standalone" | "prompt" | "ios" | "none";

function snapshot(): InstallState {
  if (installed || window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone) return "standalone";
  if (deferred) return "prompt";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  return "none";
}

function useInstallState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    () => "none" as InstallState,
  );
}

/** Registra el service worker (solo en producción). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}

/** Botón "Instalar app": usa el aviso del navegador o, en iPhone, muestra los pasos. */
export function InstallAppButton({ className }: { className?: string }) {
  const state = useInstallState();
  const [help, setHelp] = useState(false);
  if (state === "standalone" || state === "none") return null;
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (state === "ios" || !deferred) return setHelp(true);
          await deferred.prompt();
          await deferred.userChoice.catch(() => null);
          deferred = null;
          emit();
        }}
        className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold", className)}
      >
        <Download className="size-4" /> Instalar app
      </button>
      <Modal open={help} onClose={() => setHelp(false)} title="Instalar EvalúaQR en tu iPhone">
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-800">1</span>
            <span>
              Abre esta página en <strong>Safari</strong> y toca el botón <strong>Compartir</strong> <Share className="inline size-4 align-text-bottom" />.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-800">2</span>
            <span>
              Elige <strong>Agregar a inicio</strong> <SquarePlus className="inline size-4 align-text-bottom" />.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-800">3</span>
            <span>Toca <strong>Agregar</strong>. El ícono de EvalúaQR aparecerá en tu pantalla de inicio.</span>
          </li>
        </ol>
      </Modal>
    </>
  );
}
