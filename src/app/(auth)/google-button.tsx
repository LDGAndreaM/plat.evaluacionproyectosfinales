"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { firebaseConfigured, getFirebaseApp } from "@/lib/firebase";
import { createClient } from "@/lib/supabase/client";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function friendlyError(code: string, message: string) {
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (code === "auth/popup-blocked") return "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.";
  if (code === "auth/unauthorized-domain")
    return "Este dominio no está autorizado en Firebase. Agrégalo en Firebase → Authentication → Configuración → Dominios autorizados.";
  if (code === "auth/operation-not-allowed") return "Falta activar Google en Firebase → Authentication → Método de acceso.";
  if (/provider.*(not enabled|disabled)|unacceptable audience|audience/i.test(message))
    return "Falta activar Google en Supabase (Authentication → Sign In / Providers → Google) con el ID de cliente de Firebase.";
  if (/nonce/i.test(message)) return "En Supabase, activa “Skip nonce checks” en el proveedor de Google.";
  return message || "No se pudo iniciar sesión con Google.";
}

/**
 * "Continuar con Google": Firebase muestra la ventana de Google y Supabase crea/abre la cuenta
 * con el token de Google (así las cuentas, permisos y datos siguen en Supabase).
 */
export function GoogleButton({
  next,
  label = "Continuar con Google",
  role,
  acceptPrivacy,
  disabled,
}: {
  /** Versión del aviso aceptado en la casilla (al registrarse). */
  acceptPrivacy?: string;
  disabled?: boolean;
  next?: string;
  label?: string;
  /** Al registrarse: rol elegido ("teacher" | "student"). Solo se aplica si la cuenta aún no tiene uno. */
  role?: "teacher" | "student";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    if (!firebaseConfigured()) {
      setError("El acceso con Google aún no está activado. Por ahora usa tu correo y contraseña.");
      return;
    }
    setBusy(true);
    try {
      const app = await getFirebaseApp();
      const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import("firebase/auth");
      const auth = getAuth(app!);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const idToken = GoogleAuthProvider.credentialFromResult(result)?.idToken;
      await signOut(auth).catch(() => {});
      if (!idToken) throw new Error("Google no devolvió un token válido.");

      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
      if (err) throw err;
      if (role) await supabase.rpc("set_my_role", { new_role: role });
      if (acceptPrivacy) await supabase.rpc("accept_privacy", { version: acceptPrivacy });
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/inicio";
      window.location.assign(safeNext);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(friendlyError(err.code ?? "", err.message ?? ""));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={go}
        disabled={busy || disabled}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <GoogleLogo />}
        {label}
      </button>
      {error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function OrDivider({ text = "o continúa con" }: { text?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-sm text-slate-500">
      <span className="h-px flex-1 bg-slate-200" /> {text} <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
