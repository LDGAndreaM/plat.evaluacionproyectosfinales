import type { Metadata } from "next";
import { UpdatePasswordForm } from "../forms";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ActualizarPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Crea una nueva contraseña</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Escríbela dos veces para confirmarla.</p>
      <UpdatePasswordForm />
    </>
  );
}
