import type { Metadata } from "next";
import { ResetForm } from "../forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <>
      <h1 className="text-center text-3xl font-extrabold text-violet-950">Recuperar contraseña</h1>
      <p className="mb-6 mt-2 text-center text-slate-600">Te enviaremos un enlace para crear una nueva.</p>
      <ResetForm />
    </>
  );
}
