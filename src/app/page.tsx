import { BarChart3, ClipboardList, QrCode, Smartphone } from "lucide-react";
import { AppLogo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

const FEATURES = [
  { icon: ClipboardList, title: "Rúbricas a tu medida", text: "Arma formularios con criterios, escalas y ponderaciones." },
  { icon: QrCode, title: "Un QR por stand", text: "Imprime los códigos y pégalos en cada proyecto." },
  { icon: Smartphone, title: "Evaluar desde el celular", text: "El jurado no necesita crear cuenta." },
  { icon: BarChart3, title: "Ranking en vivo", text: "Podio, desglose por criterio y exportación a Excel y PDF." },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <AppLogo />
        <LinkButton href="/login" variant="ghost">
          Iniciar sesión
        </LinkButton>
      </header>
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Para eventos académicos</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
          Califica proyectos finales escaneando un código QR
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Registra tu evento, da de alta a los equipos, diseña la rúbrica y deja que el jurado evalúe desde su celular. Al
          final, el ranking se calcula solo.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/registro" size="lg">
            Crear cuenta de organizador
          </LinkButton>
          <LinkButton href="/login" size="lg" variant="secondary">
            Ya tengo cuenta
          </LinkButton>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <f.icon className="size-6 text-violet-700" aria-hidden />
              <h2 className="mt-3 font-semibold text-slate-900">{f.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="py-6 text-center text-xs text-slate-500">Hecho para ITSON Guaymas</footer>
    </main>
  );
}
