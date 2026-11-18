import { CheckCircle2, GraduationCap, QrCode } from "lucide-react";
import Link from "next/link";

/** Panel ilustrado (pantallas grandes) + tarjeta con el formulario. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-lilac lg:flex-row">
      {/* Formas decorativas */}
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-lilac/40 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-turquoise/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-turquoise/30 blur-3xl" aria-hidden />

      <section className="relative flex flex-col items-center px-6 pb-6 pt-8 text-center text-white lg:w-1/2 lg:justify-center lg:py-12">
        <Link href="/" aria-label="EvalúaQR — inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/evaluaqr-logo-white.png" alt="EvalúaQR" className="h-14 w-auto sm:h-20 lg:h-24" width={1200} height={365} />
        </Link>
        <p className="mt-4 hidden text-3xl font-bold leading-tight lg:block xl:text-4xl">
          Evalúa. Gestiona.
          <br />
          Conecta. Enseña.
        </p>
        <span className="mt-3 hidden h-1.5 w-40 rounded-full bg-turquoise lg:block" aria-hidden />

        {/* Ilustración: laptop con lista y QR */}
        <div className="relative mt-12 hidden w-80 lg:block" aria-hidden>
          <GraduationCap className="absolute -right-6 -top-14 size-24 rotate-12 text-violet-200 drop-shadow-lg" strokeWidth={1.5} />
          <div className="rounded-2xl bg-violet-950/60 p-3 shadow-2xl ring-1 ring-white/20">
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-white p-5">
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="size-6 shrink-0 text-turquoise-600" />
                    <span className="h-2.5 flex-1 rounded-full bg-violet-200" />
                  </div>
                ))}
              </div>
              <QrCode className="size-20 text-violet-800" />
            </div>
          </div>
          <div className="mx-auto h-3 w-[110%] -translate-x-[4.5%] rounded-b-2xl bg-violet-300/80" />
          <div className="absolute -bottom-6 -left-10 h-6 w-24 rounded-md bg-sun shadow" />
          <div className="absolute -bottom-12 -left-12 h-6 w-28 rounded-md bg-violet-500 shadow" />
        </div>
      </section>

      <section className="relative flex flex-1 items-start justify-center px-4 pb-10 lg:items-center lg:py-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-9">{children}</div>
      </section>
    </main>
  );
}
