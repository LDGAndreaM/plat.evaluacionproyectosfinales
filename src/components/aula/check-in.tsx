"use client";

import { AlertTriangle, CheckCircle2, Clock, Loader2, MapPin, MapPinOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ATT_INFO } from "@/lib/aula/attendance";
import { cn } from "@/lib/utils";
import { checkIn, type CheckInResult } from "@/app/(organizador)/asistencia/actions";

type Geo = { lat: number; lng: number; accuracy: number } | { error: string };

function getLocation(): Promise<Geo> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({ error: "El navegador no permite ubicación" });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        resolve({
          error: e.code === 1 ? "Permiso de ubicación denegado" : e.code === 3 ? "Se agotó el tiempo para obtener la ubicación" : "Ubicación no disponible",
        }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

/** Registro de asistencia del estudiante (desde el QR o escribiendo el código). */
export function CheckIn({ session, code: initialCode }: { session?: string; code?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [step, setStep] = useState<"idle" | "locating" | "sending">("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const fromQr = !!(session && initialCode);
  const clean = code.replace(/\D/g, "");

  async function go(withLocation: boolean) {
    setResult(null);
    setGeoNote(null);
    let geo: Geo | null = null;
    if (withLocation) {
      setStep("locating");
      geo = await getLocation();
      if ("error" in geo) setGeoNote(`${geo.error}. Se registró sin ubicación.`);
    }
    setStep("sending");
    const res = await checkIn({
      code: clean,
      session: session ?? null,
      ...(geo && !("error" in geo) ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : {}),
      locationError: geo && "error" in geo ? geo.error : withLocation ? null : "No quiso compartir su ubicación",
    });
    setStep("idle");
    setResult(res);
  }

  if (result?.ok && result.status) {
    const st = result.status;
    const good = st === "present" || st === "late";
    return (
      <div className="space-y-4 text-center">
        <span
          className={cn(
            "mx-auto grid size-24 place-items-center rounded-full",
            st === "present" ? "bg-emerald-100 text-emerald-600" : st === "late" ? "bg-amber-100 text-amber-600" : "bg-violet-100 text-violet-600",
          )}
        >
          {good ? <CheckCircle2 className="size-14" /> : <Clock className="size-14" />}
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{result.className}</p>
          <h2 className="text-3xl font-extrabold text-violet-950">{result.already ? "Ya estabas registrado" : "¡Asistencia registrada!"}</h2>
        </div>
        <p className={cn("mx-auto inline-block rounded-full px-4 py-1.5 text-lg font-bold", ATT_INFO[st].cls)}>{ATT_INFO[st].label}</p>
        {st === "review" && (
          <p className="mx-auto max-w-sm text-sm text-slate-600">
            Tu docente revisará este registro
            {result.distance != null ? ` porque tu ubicación quedó a ${Math.round(result.distance)} m del aula` : " porque no se compartió la ubicación"}.
          </p>
        )}
        {st === "late" && <p className="text-sm text-slate-600">Te registraste después de la tolerancia.</p>}
        {geoNote && <p className="text-sm text-amber-700">{geoNote}</p>}
        <LinkButton href="/asistencia" variant="secondary" className="rounded-xl">
          Ver mi asistencia
        </LinkButton>
      </div>
    );
  }

  const busy = step !== "idle";
  return (
    <div className="space-y-5">
      {!fromQr && (
        <div>
          <label htmlFor="att-code" className="mb-1.5 block text-sm font-medium text-slate-800">
            Código de 6 dígitos que muestra tu docente
          </label>
          <Input
            id="att-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, "").slice(0, 7))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123 456"
            className="h-14 text-center font-mono text-3xl tracking-[0.3em]"
          />
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl bg-turquoise-50 p-4 text-sm text-slate-700 ring-1 ring-turquoise-100">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-turquoise-700" />
        <p>
          Tu ubicación se toma <strong>una sola vez</strong>, solo para validar que estás en el aula, y solo la ve tu docente. No se rastrea después.
        </p>
      </div>

      <div className="grid gap-2">
        <Button size="lg" className="h-14 rounded-xl bg-turquoise-700 text-base font-bold hover:bg-[#006b5d]" disabled={busy || clean.length !== 6} onClick={() => go(true)}>
          {step === "locating" ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Obteniendo ubicación…
            </>
          ) : step === "sending" ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Registrando…
            </>
          ) : (
            <>
              <MapPin className="size-5" /> Registrar con mi ubicación
            </>
          )}
        </Button>
        <Button variant="secondary" size="lg" className="rounded-xl" disabled={busy || clean.length !== 6} onClick={() => go(false)}>
          <MapPinOff className="size-5" /> Registrar sin ubicación
        </Button>
        <p className="text-center text-xs text-slate-500">Si tu grupo exige ubicación, registrarte sin ella deja tu asistencia pendiente de revisión.</p>
      </div>

      {result && !result.ok && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            {result.error}
            {fromQr && (
              <div className="mt-1">
                <Link href="/asistencia" className="font-semibold underline">
                  Escribir el código a mano
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
