import { BarChart3, Bell, CalendarDays, CheckCircle2, ClipboardList, Disc3, FileSpreadsheet, Grid3x3, LayoutGrid, Megaphone, Network, NotebookPen, QrCode, ScanLine, Smartphone, Trophy, Users, Workflow } from "lucide-react";
import Link from "next/link";
import { LegalLinks } from "@/components/brand/legal-links";
import { INDEPENDENCE_SHORT } from "@/lib/legal";
import { AppLogo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

/** Cada tarjeta usa un color de la paleta (ícono sobre su tono claro). */
const FEATURES = [
  { icon: ClipboardList, title: "Rúbricas a tu medida", text: "Arma formularios con criterios, escalas y ponderaciones.", color: "#6A11CB", tint: "#EDE9FE" },
  { icon: QrCode, title: "Un QR por stand", text: "Imprime los códigos y pégalos en cada proyecto.", color: "#008574", tint: "#C2F5EE" },
  { icon: Smartphone, title: "Evaluar desde el celular", text: "El jurado no necesita crear cuenta.", color: "#A855F7", tint: "#F3E8FF" },
  { icon: BarChart3, title: "Ranking en vivo", text: "Podio, desglose por criterio y exportación a Excel y PDF.", color: "#B7791F", tint: "#FFF4D6" },
];

const AULA = [
  { icon: Users, title: "Grupos e invitaciones", text: "Importa tu lista en CSV o comparte un código o QR para que se unan.", color: "#6A11CB", tint: "#EDE9FE" },
  { icon: ScanLine, title: "Asistencia con QR", text: "Código que cambia cada 30 s, ubicación opcional y justificantes.", color: "#008574", tint: "#C2F5EE" },
  { icon: ClipboardList, title: "Tareas y rúbricas", text: "Entregas con archivos, equipos, fechas límite y comentarios.", color: "#E0466A", tint: "#FFE4EA" },
  { icon: FileSpreadsheet, title: "Calificaciones y reportes", text: "Ponderaciones, estudiantes en riesgo y reportes en Excel o PDF.", color: "#B7791F", tint: "#FFF4D6" },
  { icon: Megaphone, title: "Avisos del grupo", text: "Anuncios que llegan como notificación a tus estudiantes.", color: "#A855F7", tint: "#F3E8FF" },
  { icon: CalendarDays, title: "Calendario", text: "Entregas, clases y pases de lista; descárgalo a tu celular.", color: "#008574", tint: "#C2F5EE" },
  { icon: Bell, title: "Notificaciones", text: "Entregas nuevas, calificaciones y recordatorios de vencimiento.", color: "#6A11CB", tint: "#EDE9FE" },
  { icon: Smartphone, title: "Panel del estudiante", text: "Sus grupos, tareas, asistencia y calificaciones desde el celular.", color: "#E0466A", tint: "#FFE4EA" },
];

const TOOLS = [
  { icon: NotebookPen, title: "Fichas interactivas", text: "Sube un PDF y conviértelo en una actividad que se califica sola.", color: "#6A11CB", tint: "#EDE9FE" },
  { icon: Trophy, title: "Tablero de trivia", text: "Preguntas por categorías y puntos para competir por equipos.", color: "#5A0EAE", tint: "#F3E8FF" },
  { icon: Network, title: "Mapas conceptuales", text: "Conceptos y palabras de enlace que se acomodan solos.", color: "#008574", tint: "#C2F5EE" },
  { icon: Workflow, title: "Diagramas de flujo", text: "Procesos paso a paso con decisiones Sí / No.", color: "#E0466A", tint: "#FFE4EA" },
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

export default async function Home({ searchParams }: PageProps<"/">) {
  const deleted = (await searchParams).cuenta === "eliminada";
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-lavender via-white to-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <AppLogo size="md" />
        <div className="flex items-center gap-2">
          <Link href="/ayuda" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-white/70 sm:inline-block">
            Ayuda
          </Link>
          <LinkButton href="/login" variant="secondary">
            Iniciar sesión
          </LinkButton>
        </div>
      </header>

      {deleted && (
        <p role="status" className="mx-auto mt-2 w-[calc(100%-2rem)] max-w-6xl rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Tu cuenta y tus datos se eliminaron. Gracias por usar EvalúaQR.
        </p>
      )}
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pb-6 pt-8 sm:pt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200">
            <span className="size-2 rounded-full bg-turquoise" /> Para docentes y estudiantes · Gratis
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-violet-950 sm:text-5xl">
            Califica proyectos finales <span className="text-violet-600">escaneando un código</span>{" "}
            <span className="relative whitespace-nowrap text-turquoise-600">
              QR
              <span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-turquoise" aria-hidden />
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Registra tu evento, diseña la rúbrica y deja que el jurado evalúe desde su celular: el ranking se calcula solo. Y en el
            día a día, organiza tu aula: asistencia con QR, tareas, calificaciones y avisos.
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} f={f} />
          ))}
        </div>

        <h2 className="mt-16 text-2xl font-bold text-violet-950">EvalúaQR Aula: tu clase organizada</h2>
        <p className="mt-1 text-slate-600">Grupos, asistencia, tareas y calificaciones en un solo lugar, para ti y tus estudiantes.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AULA.map((f) => (
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

      <footer className="border-t border-violet-100 bg-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
          <div className="max-w-md space-y-1">
            <span>© {new Date().getFullYear()} EvalúaQR</span>
            <p className="text-xs leading-relaxed text-slate-500">{INDEPENDENCE_SHORT}</p>
          </div>
          <nav aria-label="Enlaces" className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/ayuda" className="hover:text-violet-700">
              Ayuda
            </Link>
            <Link href="/registro" className="hover:text-violet-700">
              Crear cuenta
            </Link>
            <Link href="/unirse" className="hover:text-violet-700">
              Unirme a un grupo
            </Link>
            <LegalLinks />
          </nav>
        </div>
      </footer>
    </main>
  );
}
