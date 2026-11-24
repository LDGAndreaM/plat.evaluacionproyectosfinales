import type { Metadata } from "next";
import Link from "next/link";
import { Backpack, Lightbulb, Presentation } from "lucide-react";
import { AppLogo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { FAQ, STUDENT_HELP, TEACHER_HELP } from "@/lib/help";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ayuda", description: "Guía paso a paso de EvalúaQR para docentes y estudiantes." };

export default async function HelpPage({ searchParams }: PageProps<"/ayuda">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims && !data.claims.is_anonymous;
  let role: string | null = null;
  if (loggedIn) {
    const { data: me } = await supabase.from("organizers").select("role").eq("id", data!.claims!.sub).maybeSingle();
    role = me?.role ?? null;
  }
  const student = sp.rol === "estudiante" || (sp.rol !== "docente" && role === "student");
  const groups = student ? STUDENT_HELP : TEACHER_HELP;

  return (
    <div className="min-h-screen bg-[#f7f5fd]">
      <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <AppLogo href={loggedIn ? "/inicio" : "/"} size="sm" />
          <LinkButton href={loggedIn ? "/inicio" : "/login"} variant="secondary" size="sm">
            {loggedIn ? "Volver a mi inicio" : "Iniciar sesión"}
          </LinkButton>
        </div>
      </header>

      <div className="bg-gradient-to-r from-lavender via-[#f3ecff] to-turquoise-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-3xl font-extrabold text-violet-950 sm:text-4xl">Ayuda</h1>
          <p className="mt-1 text-slate-600">Guía paso a paso para usar EvalúaQR.</p>
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Guía para">
            {[
              { key: "docente", label: "Soy docente", icon: Presentation, active: !student },
              { key: "estudiante", label: "Soy estudiante", icon: Backpack, active: student },
            ].map((t) => (
              <Link
                key={t.key}
                href={`/ayuda?rol=${t.key}`}
                role="tab"
                aria-selected={t.active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
                  t.active ? "bg-violet-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-violet-50",
                )}
              >
                <t.icon className="size-4" /> {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Temas" className="hidden lg:block">
          <div className="sticky top-24 space-y-4 text-sm">
            {groups.map((g) => (
              <div key={g.id}>
                <div className="mb-1 font-bold uppercase tracking-wide text-slate-500">{g.title}</div>
                <ul className="space-y-0.5">
                  {g.topics.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="block rounded-lg px-2 py-1 text-slate-700 hover:bg-violet-50 hover:text-violet-800">
                        {t.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <a href="#preguntas" className="block rounded-lg px-2 py-1 font-semibold text-violet-700 hover:bg-violet-50">
              Preguntas frecuentes
            </a>
          </div>
        </nav>

        <main className="space-y-12">
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`g-${g.id}`} className="space-y-6">
              <h2 id={`g-${g.id}`} className="text-2xl font-extrabold text-violet-950">
                {g.title}
              </h2>
              {g.topics.map((t) => (
                <article key={t.id} id={t.id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className={cn("grid grid-cols-1 gap-6 p-5 sm:p-6", t.mobile ? "md:grid-cols-[minmax(0,1fr)_260px]" : "")}>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">{t.title}</h3>
                      {t.intro && <p className="mt-1 text-slate-600">{t.intro}</p>}
                      <ol className="mt-3 space-y-2">
                        {t.steps.map((s, i) => (
                          <li key={i} className="flex gap-3 text-slate-700">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-600 text-xs font-bold text-white">{i + 1}</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                      {t.tip && (
                        <p className="mt-4 flex gap-2 rounded-xl bg-[#fff8e6] px-3 py-2 text-sm text-[#7a5000]">
                          <Lightbulb className="mt-0.5 size-4 shrink-0" /> {t.tip}
                        </p>
                      )}
                    </div>
                    {t.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/ayuda/${t.image}.webp`}
                        alt={`Captura: ${t.title}`}
                        loading="lazy"
                        className={cn(
                          "rounded-xl border border-slate-200 shadow-sm",
                          t.mobile ? "mx-auto w-full max-w-[260px]" : "w-full",
                        )}
                      />
                    )}
                  </div>
                </article>
              ))}
            </section>
          ))}

          <section id="preguntas" className="scroll-mt-24 space-y-3">
            <h2 className="text-2xl font-extrabold text-violet-950">Preguntas frecuentes</h2>
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer font-semibold text-slate-900">{f.q}</summary>
                <p className="mt-2 text-slate-600">{f.a}</p>
              </details>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
