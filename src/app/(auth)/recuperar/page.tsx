import type { Metadata } from "next";
import { ResetForm } from "../forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Recuperar contraseña</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Te enviaremos un enlace para crear una nueva.</p>
      <ResetForm />
    </>
  );
}
