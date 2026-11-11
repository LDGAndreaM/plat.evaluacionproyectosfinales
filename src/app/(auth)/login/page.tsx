import type { Metadata } from "next";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Accede para administrar tus eventos.</p>
      <LoginForm next={next} linkError={sp.error === "enlace"} />
    </>
  );
}
