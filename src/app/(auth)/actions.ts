"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { siteUrl } from "@/lib/utils";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : siteUrl();
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/eventos";
}

function translateAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Aún no confirmas tu correo. Revisa tu bandeja de entrada (y spam).";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
  if (m.includes("password should be") || m.includes("weak password"))
    return "La contraseña es muy débil. Usa al menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (m.includes("same password")) return "La nueva contraseña debe ser distinta a la anterior.";
  return message;
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Escribe tu correo y contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!fullName) return { ok: false, error: "Escribe tu nombre." };
  if (!email) return { ok: false, error: "Escribe tu correo." };
  if (password.length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { ok: false, error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, institution },
      emailRedirectTo: `${await origin()}/auth/callback?next=/eventos`,
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  if (data.session) redirect("/eventos");
  return {
    ok: true,
    message: `¡Listo! Te enviamos un correo a ${email}. Abre el enlace para confirmar tu cuenta y después inicia sesión.`,
  };
}

export async function requestPasswordReset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Escribe tu correo." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/actualizar-contrasena`,
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return { ok: true, message: "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña." };
}

export async function updatePassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { ok: false, error: "Las contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  redirect("/eventos");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
