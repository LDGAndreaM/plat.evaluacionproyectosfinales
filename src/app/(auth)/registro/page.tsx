import type { Metadata } from "next";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const rol = sp.rol === "estudiante" ? "student" : sp.rol === "docente" ? "teacher" : undefined;
  return (
    <>
      <h1 className="text-center text-3xl font-extrabold text-violet-950">Crear cuenta</h1>
      <p className="mb-6 mt-2 text-center text-slate-600">
        Gratis. Los evaluadores de eventos no necesitan cuenta: entran con el QR.
      </p>
      <SignUpForm next={next} initialRole={rol} />
    </>
  );
}
