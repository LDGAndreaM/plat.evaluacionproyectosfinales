"use client";

import { AlertCircle, CalendarDays, Clock, Loader2, Lock, MapPin, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { formatDate } from "@/lib/utils";
import { savedIdentity, useEvaluator } from "./evaluator-context";

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_25%,transparent)]";

export const primaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-base font-semibold text-[var(--brand-contrast)] disabled:opacity-60";

export const secondaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-base font-medium text-slate-800";

export function Spinner({ text = "Cargando…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500" role="status">
      <Loader2 className="size-8 animate-spin text-[var(--brand)]" />
      <span>{text}</span>
    </div>
  );
}

export function Message({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mb-3 text-[var(--brand)]">{icon}</div>
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {children && <div className="mt-2 text-slate-600">{children}</div>}
      {action && <div className="mt-6 w-full">{action}</div>}
    </div>
  );
}

/** Mensaje según el estado del evento. Devuelve null si el evento está abierto. */
export function EventStatusGate({ hasEvaluator }: { hasEvaluator: boolean }) {
  const { event } = useEvaluator();
  if (event.status === "draft")
    return (
      <Message icon={<Clock className="size-10" />} title="El evento aún no está abierto">
        Las evaluaciones comenzarán cuando el organizador abra el evento. Vuelve a escanear el código más tarde.
      </Message>
    );
  if (event.status === "published")
    return (
      <Message
        icon={<Trophy className="size-10" />}
        title="¡Resultados publicados!"
        action={
          <Link href={`/e/${event.short_code}/resultados`} className={primaryButton}>
            Ver resultados
          </Link>
        }
      >
        La evaluación terminó. Gracias por participar.
      </Message>
    );
  if (event.status === "closed" && !hasEvaluator)
    return (
      <Message icon={<Lock className="size-10" />} title="Evaluaciones cerradas">
        Este evento ya no recibe evaluaciones.
      </Message>
    );
  return null;
}

export function EventIntro() {
  const { event } = useEvaluator();
  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {event.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.cover_url} alt="" className="h-32 w-full object-cover" />
      )}
      <div className="space-y-1 p-4">
        <h1 className="text-xl font-semibold text-slate-900">{event.name}</h1>
        {event.description && <p className="text-sm text-slate-600">{event.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-slate-500">
          {event.event_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" /> {formatDate(event.event_date)}
            </span>
          )}
          {event.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4" /> {event.venue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function JoinForm({ projectName }: { projectName?: string }) {
  const { event, join } = useEvaluator();
  const [identity, setIdentity] = useState(savedIdentity);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!identity.name.trim()) return setError("Escribe tu nombre.");
        setBusy(true);
        setError(null);
        const err = await join(
          { name: identity.name.trim(), email: identity.email.trim(), institution: identity.institution.trim() },
          pin.trim(),
        );
        setBusy(false);
        if (err) setError(err);
      }}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--brand)_12%,white)] text-[var(--brand)]">
          <UserRound className="size-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">¿Quién evalúa?</h2>
          <p className="text-sm text-slate-500">
            {projectName ? `Para evaluar “${projectName}”, primero` : "Antes de empezar,"} escribe tu nombre.
          </p>
        </div>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-800">
          Nombre completo <span className="text-red-600">*</span>
        </span>
        <input
          className={inputClass}
          value={identity.name}
          onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
          autoComplete="name"
          maxLength={120}
          required
          placeholder="Ej. Mtra. Laura Gómez"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-800">Correo (opcional)</span>
        <input
          className={inputClass}
          type="email"
          inputMode="email"
          value={identity.email}
          onChange={(e) => setIdentity({ ...identity, email: e.target.value })}
          autoComplete="email"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-800">Institución o empresa (opcional)</span>
        <input
          className={inputClass}
          value={identity.institution}
          onChange={(e) => setIdentity({ ...identity, institution: e.target.value })}
          autoComplete="organization"
        />
      </label>
      {event.requires_pin && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-800">
            PIN del evento <span className="text-red-600">*</span>
          </span>
          <input
            className={`${inputClass} font-mono uppercase tracking-widest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal`}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            required
            placeholder="Te lo da el organizador"
          />
        </label>
      )}
      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      <button type="submit" className={primaryButton} disabled={busy}>
        {busy && <Loader2 className="size-5 animate-spin" />} Comenzar a evaluar
      </button>
      <p className="text-center text-xs text-slate-500">
        No necesitas crear cuenta. Tu nombre se guarda en este dispositivo para no pedírtelo en cada proyecto.
      </p>
    </form>
  );
}

export function WhoAmI() {
  const { state, switchEvaluator } = useEvaluator();
  if (state.status !== "ready") return null;
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
      <span className="flex min-w-0 items-center gap-1.5">
        <UserRound className="size-4 shrink-0" />
        <span className="truncate">
          Evaluando como <strong className="text-slate-900">{state.evaluator.name}</strong>
        </span>
      </span>
      <button
        type="button"
        className="shrink-0 text-[var(--brand)] underline-offset-2 hover:underline"
        onClick={() => {
          if (
            window.confirm(
              "¿Cambiar de evaluador? Se cerrará la sesión en este dispositivo. Las evaluaciones ya enviadas se conservan.",
            )
          )
            switchEvaluator();
        }}
      >
        ¿No eres tú?
      </button>
    </div>
  );
}
