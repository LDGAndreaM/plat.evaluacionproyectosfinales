import { ArrowRight, CalendarCheck, CheckCircle2, GraduationCap, Layers, QrCode } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { LegalLinks } from "@/components/brand/legal-links";
import { AppLogo } from "@/components/brand/logo";
import { AulaLaptop } from "@/components/landing/aula-laptop";
import { MORE_TOOLS, TONES } from "@/components/landing/content";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { HeroArt } from "@/components/landing/hero-art";
import { SiteHeader } from "@/components/landing/site-header";
import { Sparks } from "@/components/landing/sparks";
import { INDEPENDENCE_SHORT } from "@/lib/legal";
import { siteUrl } from "@/lib/utils";

const STRIP = [
  { icon: QrCode, title: "Evaluación por QR", text: "Un código por stand, sin cuentas." },
  { icon: CalendarCheck, title: "Asistencia y tareas", text: "Control, entregas y calificaciones." },
  { icon: Layers, title: "Herramientas interactivas", text: "Actividades dinámicas y listas para usar." },
];

const AULA_POINTS = ["Invita estudiantes o importa tu lista", "Asistencia con QR", "Tareas y rúbricas", "Calificaciones y reportes", "Avisos y calendario"];

export default async function Home({ searchParams }: PageProps<"/">) {
  const deleted = (await searchParams).cuenta === "eliminada";
  const qrSvg = await QRCode.toString(siteUrl(), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#24054a", light: "#0000" } });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {deleted && (
          <p role="status" className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-6xl rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Tu cuenta y tus datos se eliminaron. Gracias por usar EvalúaQR.
          </p>
        )}

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#f3edff] via-[#f7f3ff] to-white">
          <div className="pointer-events-none absolute -right-40 top-10 size-[36rem] rounded-full bg-violet-200/40 blur-3xl" aria-hidden />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-4 pb-10 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-6">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200">
                <span className="size-2 rounded-full bg-turquoise" /> Para docentes y estudiantes · Gratis
              </p>
              <h1 className="mt-5 text-[2.5rem] font-extrabold leading-[1.08] tracking-tight text-violet-950 sm:text-5xl lg:text-[3.1rem]">
                Evalúa proyectos y organiza tu clase desde un solo lugar{" "}
                <span className="relative whitespace-nowrap text-turquoise-600">
                  QR
                  <span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-turquoise" aria-hidden />
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Registra ferias y exposiciones, diseña rúbricas, evalúa con códigos QR y gestiona tu aula: asistencia, tareas, calificaciones y más.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/registro"
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-700"
                >
                  Crear cuenta gratis <ArrowRight className="size-5" />
                </Link>
                <Link
                  href="#herramientas"
                  className="inline-flex items-center rounded-xl border-2 border-violet-950/80 bg-white px-6 py-3 font-bold text-violet-950 hover:bg-violet-50"
                >
                  Explorar herramientas
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                ¿Eres estudiante?{" "}
                <Link href="/unirse" className="font-semibold text-violet-700 underline-offset-2 hover:underline">
                  Únete a tu grupo con un código
                </Link>
              </p>
            </div>
            <div className="sm:hidden">
              <HeroArt qrSvg={qrSvg} compact />
            </div>
            <div className="hidden sm:block">
              <HeroArt qrSvg={qrSvg} />
            </div>
          </div>

          {/* Franja de beneficios */}
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-8">
            <ul className="grid gap-4 rounded-3xl bg-white p-5 shadow-xl shadow-violet-900/5 ring-1 ring-violet-100 md:grid-cols-3 md:gap-0 md:p-6">
              {STRIP.map((s, i) => (
                <li key={s.title} className={`flex items-center gap-4 md:px-6 ${i > 0 ? "md:border-l md:border-violet-100" : ""}`}>
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600">
                    <s.icon className="size-7" />
                  </span>
                  <span>
                    <span className="block font-extrabold text-violet-950">{s.title}</span>
                    <span className="block text-sm text-slate-600">{s.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Todo lo que necesitas */}
        <section id="evaluacion" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-14">
          <h2 className="relative mx-auto w-fit text-center text-3xl font-extrabold text-violet-950 sm:text-4xl">
            Todo lo que necesitas para tu clase
            <Sparks className="absolute -right-10 -top-5 size-9" />
          </h2>
          <div className="mt-8">
            <FeatureTabs />
          </div>
        </section>

        {/* Aula */}
        <section id="aula" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#efe6ff] via-[#f5efff] to-[#ece3ff] px-6 py-8 sm:px-10">
            <div className="pointer-events-none absolute -bottom-24 -right-16 size-44 rounded-full bg-turquoise/60" aria-hidden />
            <Sparks className="absolute left-4 top-4 size-10" flip />
            <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
              <div className="mx-auto w-full max-w-md">
                <AulaLaptop />
              </div>
              <div className="lg:border-l lg:border-violet-200 lg:pl-8">
                <div className="flex flex-wrap items-center gap-3">
                  <GraduationCap className="size-9 text-violet-700" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/evaluaqr-logo.png" alt="EvalúaQR" className="h-10 w-auto" width={1200} height={365} />
                  <span className="rounded-xl bg-violet-600 px-3 py-1 text-2xl font-extrabold text-white">Aula</span>
                </div>
                <p className="mt-4 text-lg text-slate-700">Grupos, asistencia, tareas y calificaciones en un solo lugar.</p>
                <Link
                  href="/registro?rol=docente"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-bold text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700"
                >
                  Conocer EvaluaQR Aula <ArrowRight className="size-5" />
                </Link>
              </div>
              <ul className="relative z-10 space-y-3">
                {AULA_POINTS.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-slate-700">
                    <CheckCircle2 className="size-5 shrink-0 text-turquoise-600" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Más herramientas */}
        <section id="herramientas" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-14">
          <h2 className="relative mx-auto w-fit text-center text-3xl font-extrabold text-violet-950 sm:text-4xl">
            Más herramientas para activar tu clase
            <Sparks className="absolute -right-10 -top-5 size-9" />
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {MORE_TOOLS.map((t, i) => {
              const tone = TONES[t.tone];
              return (
                <li key={t.title} className={i === MORE_TOOLS.length - 1 ? "col-span-2 sm:col-span-1" : ""}>
                  <Link
                    href="/herramientas"
                    className="flex h-full flex-col items-center gap-3 rounded-2xl border px-4 py-6 text-center transition hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ background: tone.bg, borderColor: tone.border }}
                  >
                    <t.icon className="size-11" strokeWidth={1.8} style={{ color: tone.color }} aria-hidden />
                    <span className="font-extrabold text-violet-950">{t.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-center text-sm text-slate-500">Además: tablero de trivia y fichas interactivas desde PDF. Todo se guarda en tu cuenta.</p>
        </section>
      </main>

      <footer className="border-t border-violet-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            <AppLogo size="md" />
            <span className="hidden h-8 w-px bg-violet-200 lg:block" aria-hidden />
          </div>
          <nav aria-label="Enlaces" className="flex flex-1 flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
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
          <div className="max-w-xs text-xs leading-relaxed text-slate-500 lg:text-right">
            <p>© {new Date().getFullYear()} EvalúaQR. Plataforma gratuita de evaluación y gestión educativa.</p>
            <p className="mt-1">{INDEPENDENCE_SHORT}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
