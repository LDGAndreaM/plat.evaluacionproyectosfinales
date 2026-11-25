import Link from "next/link";
import type { ReactNode } from "react";
import { FeaturesPanel } from "./auth-panels";
import { LegalLinks } from "./legal-links";
import { INDEPENDENCE_SHORT } from "@/lib/legal";

/** Fondo de las pantallas de acceso: panel informativo (pantallas grandes) + tarjeta con el formulario. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-lilac lg:flex-row">
      {/* Formas decorativas */}
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-lilac/40 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-turquoise/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-turquoise/30 blur-3xl" aria-hidden />

      {/* Celular: solo el logo */}
      <section className="relative flex justify-center px-6 pb-6 pt-8 lg:hidden">
        <Link href="/" aria-label="EvalúaQR — inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/evaluaqr-logo-white.png" alt="EvalúaQR" className="h-14 w-auto sm:h-20" width={1200} height={365} />
        </Link>
      </section>
      {/* Escritorio: panel informativo */}
      <section className="relative hidden items-center justify-center px-10 py-12 text-white lg:flex lg:w-1/2">
        <FeaturesPanel />
      </section>

      <section className="relative flex flex-1 items-start justify-center px-4 pb-10 lg:items-center lg:py-12">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-9">{children}</div>
          <nav aria-label="Documentos legales" className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-violet-100">
            <LegalLinks />
          </nav>
          <p className="mx-auto mt-2 max-w-sm text-center text-[11px] leading-snug text-violet-200/90">{INDEPENDENCE_SHORT}</p>
        </div>
      </section>
    </main>
  );
}
