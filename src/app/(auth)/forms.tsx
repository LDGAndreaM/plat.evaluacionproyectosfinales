"use client";

import { Backpack, Building2, Lock, Mail, Presentation, User } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormMessage, IconInput } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";
import { GoogleButton, OrDivider } from "./google-button";
import { PrivacyConsent } from "@/components/brand/privacy-consent";
import { PRIVACY_VERSION } from "@/lib/legal";

/** Botón principal de las pantallas de acceso (turquesa, como en la identidad). */
export const AUTH_BUTTON = "w-full rounded-xl bg-turquoise-700 text-base font-semibold hover:bg-[#006b5d] disabled:bg-turquoise-600/60";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {linkError && !state && (
        <FormMessage state={{ ok: false, error: "El enlace ya expiró o no es válido. Inicia sesión o solicita uno nuevo." }} />
      )}
      <IconInput
        icon={<Mail className="size-5" />}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Correo electrónico"
        aria-label="Correo electrónico"
        className="h-12 rounded-xl"
      />
      <div>
        <PasswordInput
          icon={<Lock className="size-5" />}
          name="password"
          autoComplete="current-password"
          required
          placeholder="Contraseña"
          aria-label="Contraseña"
          className="h-12 rounded-xl"
        />
        <div className="mt-2 text-right text-sm">
          <Link href="/recuperar" className="font-medium text-violet-700 underline-offset-2 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton className={AUTH_BUTTON} size="lg" pendingText="Entrando…">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}

type Role = "teacher" | "student";

/** Tarjetas para elegir "Soy docente" / "Soy estudiante". */
export function RolePicker({ value, onChange }: { value: Role | null; onChange: (r: Role) => void }) {
  const options = [
    { value: "teacher" as const, label: "Soy docente", hint: "Grupos, eventos y herramientas", icon: Presentation, tint: "bg-violet-100 text-violet-700" },
    { value: "student" as const, label: "Soy estudiante", hint: "Mis clases, tareas y asistencia", icon: Backpack, tint: "bg-turquoise-100 text-turquoise-700" },
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-800">¿Cómo usarás EvalúaQR?</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-400",
                active ? "border-violet-600 bg-violet-50" : "border-slate-200 hover:border-violet-300",
              )}
            >
              <input type="radio" name="role" value={o.value} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
              <span className={cn("grid size-11 place-items-center rounded-xl", o.tint)}>
                <o.icon className="size-6" aria-hidden />
              </span>
              <span className="font-semibold text-slate-900">{o.label}</span>
              <span className="text-xs leading-snug text-slate-500">{o.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SignUpForm({ next, initialRole }: { next?: string; initialRole?: Role }) {
  const [state, action] = useActionState(signUp, null);
  const [role, setRole] = useState<Role | null>(initialRole ?? null);
  const [accepted, setAccepted] = useState(false);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <div className="space-y-5">
      <RolePicker value={role} onChange={setRole} />
      {role ? (
        <>
          <PrivacyConsent checked={accepted} onChange={setAccepted} name="privacy_google" />
          <GoogleButton label="Registrarme con Google" role={role} next={next} acceptPrivacy={PRIVACY_VERSION} disabled={!accepted} />
          <OrDivider text="o con tu correo" />
          <form action={action} className="space-y-4">
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="next" value={next ?? ""} />
            <input type="hidden" name="privacy" value={accepted ? "on" : ""} />
            <Field label="Nombre completo" htmlFor="full_name" required>
              <IconInput
                icon={<User className="size-5" />}
                id="full_name"
                name="full_name"
                autoComplete="name"
                required
                placeholder={role === "teacher" ? "Mtra. Andrea Martínez" : "Nombre y apellidos"}
              />
            </Field>
            {role === "teacher" && (
              <Field label="Institución" htmlFor="institution">
                <IconInput icon={<Building2 className="size-5" />} id="institution" name="institution" placeholder="ITSON Unidad Guaymas" />
              </Field>
            )}
            <Field
              label="Correo electrónico"
              htmlFor="email"
              required
              hint={role === "student" ? "Usa el correo con el que te invitó tu docente para entrar a tus grupos automáticamente." : undefined}
            >
              <IconInput icon={<Mail className="size-5" />} id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres." required>
              <PasswordInput icon={<Lock className="size-5" />} id="password" name="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label="Confirmar contraseña" htmlFor="confirm" required>
              <PasswordInput icon={<Lock className="size-5" />} id="confirm" name="confirm" autoComplete="new-password" minLength={8} required />
            </Field>
            <FormMessage state={state} />
            {!accepted && <p className="text-center text-xs text-slate-500">Acepta el aviso de privacidad (arriba) para crear tu cuenta.</p>}
            <SubmitButton className={AUTH_BUTTON} size="lg" pendingText="Creando cuenta…" disabled={!accepted}>
              Crear cuenta
            </SubmitButton>
          </form>
        </>
      ) : (
        <p className="rounded-xl bg-lavender px-4 py-3 text-center text-sm text-violet-900">Elige una opción para continuar.</p>
      )}
      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-violet-700 underline underline-offset-2">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="space-y-4">
      <IconInput
        icon={<Mail className="size-5" />}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Correo electrónico"
        aria-label="Correo electrónico"
        className="h-12 rounded-xl"
      />
      <FormMessage state={state} />
      <SubmitButton className={AUTH_BUTTON} size="lg" pendingText="Enviando…">
        Enviar enlace
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-violet-700 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Nueva contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
        <PasswordInput icon={<Lock className="size-5" />} id="password" name="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirmar contraseña" htmlFor="confirm">
        <PasswordInput icon={<Lock className="size-5" />} id="confirm" name="confirm" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className={AUTH_BUTTON} size="lg">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
