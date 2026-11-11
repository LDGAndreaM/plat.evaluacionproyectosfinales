import type { Metadata } from "next";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-900">Crear cuenta de organizador</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Solo quienes organizan eventos necesitan cuenta. Los evaluadores entran con el QR.
      </p>
      <SignUpForm />
    </>
  );
}
