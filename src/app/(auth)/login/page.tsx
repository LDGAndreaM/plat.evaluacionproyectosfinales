import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "../forms";
import { GoogleButton, OrDivider } from "../google-button";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <>
      <h1 className="text-center text-3xl font-extrabold text-violet-950">Iniciar sesión</h1>
      <p className="mb-7 mt-2 text-center text-slate-600">Accede a tu cuenta de EvalúaQR</p>
      {sp.error === "google" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          No se completó el inicio de sesión con Google. Inténtalo de nuevo.
        </p>
      )}
      <LoginForm next={next} linkError={sp.error === "enlace"} />
      <OrDivider />
      <GoogleButton next={next} label="Google" />
      <p className="mt-6 text-center text-sm text-slate-600">
        ¿Aún no tienes cuenta?{" "}
        <Link
          href={next ? `/registro?next=${encodeURIComponent(next)}` : "/registro"}
          className="font-semibold text-violet-700 underline underline-offset-2"
        >
          Regístrate
        </Link>
      </p>
    </>
  );
}
