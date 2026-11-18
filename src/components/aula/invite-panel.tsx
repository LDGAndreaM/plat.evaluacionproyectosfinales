"use client";

import { Maximize2, QrCode } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Modal } from "@/components/ui/modal";
import { qrDataUrl } from "@/lib/qr";

/** Enlace, código y QR para que los estudiantes entren al grupo. */
export function InvitePanel({ code, enabled, className }: { code: string; enabled: boolean; className?: string }) {
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [qr, setQr] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (origin) qrDataUrl(`${origin}/unirse/${code}`, 640).then(setQr);
  }, [origin, code]);
  const link = origin ? `${origin}/unirse/${code}` : `/unirse/${code}`;

  return (
    <div className={className}>
      {!enabled && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Las inscripciones están cerradas. Actívalas en Configuración para que se puedan unir.
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setBig(true)}
          className="group relative mx-auto size-32 shrink-0 overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:mx-0"
          aria-label="Ver QR en grande para proyectarlo"
        >
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="" className="size-full" />
          ) : (
            <QrCode className="size-full text-slate-200" />
          )}
          <span className="absolute inset-0 hidden place-items-center bg-violet-900/60 text-white group-hover:grid">
            <Maximize2 className="size-6" />
          </span>
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Código del grupo</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-[0.2em] text-violet-800">{code}</span>
              <CopyButton value={code} />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enlace de invitación</div>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2 py-1.5 text-sm text-slate-700">{link}</code>
              <CopyButton value={link} />
            </div>
          </div>
        </div>
      </div>
      <Modal open={big} onClose={() => setBig(false)} title="Únete al grupo" size="xl">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt={`QR para unirse con el código ${code}`} className="w-full max-w-md" />}
          <p className="text-lg text-slate-600">Escanea el QR o entra a <strong className="text-slate-900">{origin}/unirse</strong> y escribe:</p>
          <p className="font-mono text-5xl font-extrabold tracking-[0.25em] text-violet-800 sm:text-6xl">{code}</p>
          <Button variant="secondary" onClick={() => setBig(false)}>
            Cerrar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
