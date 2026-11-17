import type { Metadata } from "next";
import { LoginForm } from "../forms";
import { GoogleButton, OrDivider } from "../google-button";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Accede para administrar tus eventos.</p>
      <GoogleButton next={next} />
      <OrDivider />
      {sp.error === "google" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          No se completó el inicio de sesión con Google. Inténtalo de nuevo.
        </p>
      )}
      <LoginForm next={next} linkError={sp.error === "enlace"} />
    </>
  );
}
