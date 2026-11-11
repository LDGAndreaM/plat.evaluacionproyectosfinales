"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {linkError && !state && (
        <FormMessage state={{ ok: false, error: "El enlace ya expiró o no es válido. Inicia sesión o solicita uno nuevo." }} />
      )}
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Entrando…">
        Iniciar sesión
      </SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/recuperar" className="text-slate-600 underline-offset-2 hover:underline">
          Olvidé mi contraseña
        </Link>
        <Link href="/registro" className="font-medium text-violet-700 underline-offset-2 hover:underline">
          Crear cuenta
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre completo" htmlFor="full_name" required>
        <Input id="full_name" name="full_name" autoComplete="name" required placeholder="Mtra. Andrea Martínez" />
      </Field>
      <Field label="Institución" htmlFor="institution">
        <Input id="institution" name="institution" placeholder="ITSON Unidad Guaymas" />
      </Field>
      <Field label="Correo electrónico" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirmar contraseña" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-violet-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Enviando…">
        Enviar enlace
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-slate-600 hover:underline">
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
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirmar contraseña" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
