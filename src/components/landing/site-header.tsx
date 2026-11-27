"use client";

import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const MENUS: { label: string; items: { href: string; title: string; text: string }[] }[] = [
  {
    label: "Para docentes",
    items: [
      { href: "#evaluacion", title: "Evaluación de proyectos", text: "Rúbricas, un QR por stand y ranking en vivo." },
      { href: "#aula", title: "EvaluaQR Aula", text: "Grupos, asistencia, tareas y calificaciones." },
      { href: "/registro?rol=docente", title: "Crear cuenta docente", text: "Gratis, en un minuto." },
      { href: "/unirse", title: "Soy estudiante", text: "Únete a tu grupo con el código de tu docente." },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { href: "#herramientas", title: "Trivia y ruleta", text: "Juegos para participar en clase." },
      { href: "#herramientas", title: "Sopa de letras y crucigrama", text: "Hojas listas para imprimir." },
      { href: "#herramientas", title: "Mapas y diagramas", text: "Mapas conceptuales y diagramas de flujo." },
      { href: "#herramientas", title: "PDF interactivos", text: "Fichas que se califican solas." },
    ],
  },
];

function Dropdown({ menu }: { menu: (typeof MENUS)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-semibold text-violet-950 hover:text-violet-700"
      >
        {menu.label} <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 pt-2">
          <ul className="w-72 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-violet-100">
            {menu.items.map((it) => (
              <li key={it.title}>
                <Link href={it.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 hover:bg-violet-50">
                  <span className="block text-sm font-semibold text-violet-950">{it.title}</span>
                  <span className="block text-xs text-slate-500">{it.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const [mobile, setMobile] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-violet-100/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center gap-4 px-4">
        <AppLogo size="md" className="[&_img]:h-10" />
        <span className="hidden h-8 w-px bg-violet-200 lg:block" aria-hidden />
        <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 lg:flex">
          {MENUS.map((m) => (
            <Dropdown key={m.label} menu={m} />
          ))}
          <Link href="#aula" className="rounded-lg px-3 py-2 font-semibold text-violet-950 hover:text-violet-700">
            EvaluaQR Aula
          </Link>
          <Link href="/ayuda" className="rounded-lg px-3 py-2 font-semibold text-violet-950 hover:text-violet-700">
            Ayuda
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-600/25 hover:bg-violet-700 sm:px-5"
          >
            <UserRound className="size-4" /> Iniciar sesión
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl text-violet-900 hover:bg-violet-50 lg:hidden"
            aria-label={mobile ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobile}
            onClick={() => setMobile((v) => !v)}
          >
            {mobile ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {mobile && (
        <nav aria-label="Menú" className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-violet-100 bg-white px-4 pb-5 lg:hidden">
          {MENUS.map((m) => (
            <div key={m.label} className="pt-4">
              <p className="px-2 text-xs font-bold uppercase tracking-wide text-violet-500">{m.label}</p>
              {m.items.map((it) => (
                <Link key={it.title} href={it.href} onClick={() => setMobile(false)} className="block rounded-xl px-2 py-2 font-semibold text-violet-950 hover:bg-violet-50">
                  {it.title}
                </Link>
              ))}
            </div>
          ))}
          <div className="mt-3 border-t border-violet-100 pt-3">
            <Link href="#aula" onClick={() => setMobile(false)} className="block rounded-xl px-2 py-2 font-semibold text-violet-950 hover:bg-violet-50">
              EvaluaQR Aula
            </Link>
            <Link href="/ayuda" className="block rounded-xl px-2 py-2 font-semibold text-violet-950 hover:bg-violet-50">
              Ayuda
            </Link>
            <Link href="/registro" className="mt-2 block rounded-xl bg-violet-600 px-4 py-3 text-center font-bold text-white">
              Crear cuenta gratis
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
