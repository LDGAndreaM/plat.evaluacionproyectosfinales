import { BarChart3, CheckCircle2, ClipboardList, Disc3, Grid3x3, LayoutGrid, NotebookPen, QrCode, Smartphone } from "lucide-react";
import { AppLogo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

/** Cada tarjeta usa un color de la paleta (ícono sobre su tono claro). */
const FEATURES = [
  { icon: ClipboardList, title: "Rúbricas a tu medida", text: "Arma formularios con criterios, escalas y ponderaciones.", color: "#6A11CB", tint: "#EDE9FE" },
  { icon: QrCode, title: "Un QR por stand", text: "Imprime los códigos y pégalos en cada proyecto.", color: "#008574", tint: "#C2F5EE" },
  { icon: Smartphone, title: "Evaluar desde el celular", text: "El jurado no necesita crear cuenta.", color: "#A855F7", tint: "#F3E8FF" },
  { icon: BarChart3, title: "Ranking en vivo", text: "Podio, desglose por criterio y exportación a Excel y PDF.", color: "#B7791F", tint: "#FFF4D6" },
];

const TOOLS = [
  { icon: NotebookPen, title: "Fichas interactivas", text: "Sube un PDF y conviértelo en una actividad que se califica sola.", color: "#6A11CB", tint: "#EDE9FE" },
  { icon: Disc3, title: "Ruleta de sorteos", text: "Elige al azar quién expone, equipos o temas.", color: "#E0466A", tint: "#FFE4EA" },
  { icon: Grid3x3, title: "Sopa de letras", text: "Escribe tus palabras y obtén la hoja lista para imprimir.", color: "#008574", tint: "#C2F5EE" },
  { icon: LayoutGrid, title: "Crucigrama", text: "Palabras y pistas; el crucigrama se arma solo.", color: "#B7791F", tint: "#FFF4D6" },
];

function Card({ f }: { f: (typeof FEATURES)[number] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid size-11 place-items-center rounded-xl" style={{ background: f.tint, color: f.color }}>
        <f.icon className="size-6" aria-hidden />
      </span>
      <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{f.text}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-lavender via-white to-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <AppLogo size="md" />
        <LinkButton href="/login" variant="secondary">
          Iniciar sesión
        </LinkButton>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pb-6 pt-8 sm:pt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200">
            <span className="size-2 rounded-full bg-turquoise" /> Para eventos académicos
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-violet-950 sm:text-5xl">
            Califica proyectos finales <span className="text-violet-600">escaneando un código</span>{" "}
            <span className="relative whitespace-nowrap text-turquoise-600">
              QR
              <span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-turquoise" aria-hidden />
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Registra tu evento, da de alta a los equipos, diseña la rúbrica y deja que el jurado evalúe desde su celular. Al
            final, el ranking se calcula solo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/registro" size="lg">
              Crear cuenta gratis
            </LinkButton>
            <LinkButton href="/login" size="lg" variant="secondary">
              Ya tengo cuenta
            </LinkButton>
          </div>
        </div>

        {/* Ilustración: tarjeta de evaluación */}
        <div className="relative mx-auto w-full max-w-sm" aria-hidden>
          <div className="absolute -right-4 -top-4 size-24 rounded-3xl bg-sun/70" />
          <div className="absolute -bottom-5 -left-5 size-20 rounded-full bg-coral/60" />
          <div className="relative rounded-3xl bg-white p-5 shadow-xl ring-1 ring-violet-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-violet-600">Stand A1</div>
                <div className="font-bold text-slate-900">Raíces del Mar</div>
              </div>
              <QrCode className="size-10 text-violet-900" />
            </div>
            {[
              ["Creatividad", 5],
              ["Concepto", 4],
              ["Ejecución técnica", 5],
            ].map(([label, n]) => (
              <div key={label as string} className="mt-4">
                <div className="mb-1.5 text-sm font-medium text-slate-700">{label}</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={`grid h-8 place-items-center rounded-lg text-sm font-semibold ${i === n ? "bg-violet-600 text-white" : "bg-lavender text-violet-700"}`}
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-turquoise py-2.5 font-semibold text-violet-950">
              <CheckCircle2 className="size-5" /> Evaluación enviada
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} f={f} />
          ))}
        </div>

        <h2 className="mt-16 text-2xl font-bold text-violet-950">Además: herramientas gratuitas para tu clase</h2>
        <p className="mt-1 text-slate-600">Con tu misma cuenta. Todo se guarda para que lo vuelvas a usar.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((f) => (
            <Card key={f.title} f={f} />
          ))}
        </div>
      </section>
    </main>
  );
}
