"use client";

import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { LegalLinks } from "@/components/brand/legal-links";
import { deleteMyAccount } from "./actions";

export function PrivacyCard({ role, acceptedAt }: { role: "teacher" | "student"; acceptedAt: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card className="rounded-2xl">
      <CardHeader title="Privacidad" />
      <div className="space-y-4 p-5 text-sm">
        <p className="flex items-start gap-2 text-slate-600">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-turquoise-700" />
          {acceptedAt
            ? `Aceptaste el Aviso de privacidad el ${new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Hermosillo" }).format(new Date(acceptedAt))}.`
            : "Aviso de privacidad aceptado."}
        </p>
        <div className="flex flex-col gap-1">
          <LegalLinks className="text-violet-700" />
        </div>
        <div className="border-t border-slate-100 pt-4">
          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setOpen(true)}>
            <Trash2 className="size-4" /> Eliminar mi cuenta
          </Button>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Eliminar mi cuenta">
        <div className="space-y-4 text-sm text-slate-700">
          <p>Se borrarán de forma permanente:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tu cuenta, foto, datos de contacto y notificaciones.</li>
            {role === "teacher" ? (
              <li>
                <strong>Tus grupos (con sus estudiantes, asistencia, actividades y calificaciones), tus eventos y tus herramientas.</strong> Descarga
                antes tus reportes si los necesitas.
              </li>
            ) : (
              <>
                <li>Tus justificantes, tus archivos entregados y la ubicación de tus registros de asistencia.</li>
                <li>Tus calificaciones y asistencia pueden quedar en la lista de tu docente como registro académico.</li>
              </>
            )}
          </ul>
          <p>
            Escribe <strong>ELIMINAR</strong> para confirmar.
          </p>
          <Input value={text} onChange={(e) => setText(e.target.value)} aria-label="Escribe ELIMINAR" autoComplete="off" />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={text.trim().toUpperCase() !== "ELIMINAR" || busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await deleteMyAccount(text);
                if (!res.ok) {
                  setBusy(false);
                  setError(res.error ?? "No se pudo eliminar.");
                  return;
                }
                router.replace("/?cuenta=eliminada");
                router.refresh();
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Eliminar definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
