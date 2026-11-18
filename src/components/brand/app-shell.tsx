"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  QrCode,
  Trophy,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/aula/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

const TEACHER_NAV: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/aula", label: "Aula · Mis grupos", icon: GraduationCap },
  { href: "/eventos", label: "Evaluación de proyectos", icon: Trophy },
  { href: "/herramientas", label: "Herramientas de actividades", icon: Wrench },
  { href: "#reportes", label: "Reportes y resultados", icon: BarChart3, soon: true },
];

const STUDENT_NAV: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/aula", label: "Mis grupos", icon: GraduationCap },
  { href: "#actividades", label: "Actividades", icon: ClipboardList, soon: true },
  { href: "#asistencia", label: "Asistencia", icon: QrCode, soon: true },
  { href: "#calificaciones", label: "Calificaciones", icon: BarChart3, soon: true },
  { href: "#justificantes", label: "Justificantes", icon: FileCheck2, soon: true },
  { href: "#calendario", label: "Calendario", icon: CalendarDays, soon: true },
];

function initials(name: string) {
  return (
    name
      .replace(/^(mtr[oa]\.?|dr[a]?\.?|lic\.?|ing\.?)\s+/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = !item.soon && (pathname === item.href || pathname.startsWith(item.href + "/"));
        const body = (
          <>
            <item.icon className="size-5 shrink-0" aria-hidden />
            <span className="flex-1 leading-tight">{item.label}</span>
            {item.soon && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Pronto</span>}
          </>
        );
        const cls = cn(
          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors",
          active ? "bg-turquoise text-violet-950 shadow-md" : "text-violet-50 hover:bg-white/10",
          item.soon && "cursor-default text-violet-200/80 hover:bg-transparent",
        );
        return (
          <li key={item.href}>
            {item.soon ? (
              <span className={cls} aria-disabled title="Disponible en una próxima etapa">
                {body}
              </span>
            ) : (
              <Link href={item.href} className={cls} aria-current={active ? "page" : undefined} onClick={onNavigate}>
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/inicio" className="block px-5 pb-6 pt-6" aria-label="EvalúaQR — inicio" onClick={onNavigate}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/evaluaqr-logo-white.png" alt="EvalúaQR" className="h-11 w-auto" width={1200} height={365} />
      </Link>
      <nav aria-label="Secciones" className="flex-1 overflow-y-auto px-3">
        <NavLinks items={role === "teacher" ? TEACHER_NAV : STUDENT_NAV} onNavigate={onNavigate} />
      </nav>
      <div className="m-4 rounded-2xl bg-white/10 p-4 text-center text-sm font-semibold leading-snug text-white">
        {role === "teacher" ? "Evalúa, gestiona y da seguimiento a tus grupos." : "Organiza tus clases, tareas y asistencia en un solo lugar."}
      </div>
    </div>
  );
}

export function AppShell({
  role,
  fullName,
  email,
  signOutAction,
  children,
}: {
  role: Role;
  fullName: string;
  email: string;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Cerrar el menú móvil al cambiar de página
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebarBg = "bg-gradient-to-b from-violet-800 via-violet-900 to-violet-950";

  return (
    <div className="min-h-screen bg-[#f7f5fd]">
      {/* Barra lateral (escritorio) */}
      <aside className={cn("no-print fixed inset-y-0 left-0 z-40 hidden w-64 lg:block", sidebarBg)}>
        <SidebarContent role={role} />
      </aside>

      {/* Menú móvil */}
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className={cn("absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-2xl", sidebarBg)}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-white hover:bg-white/10"
              aria-label="Cerrar menú"
            >
              <X className="size-5" />
            </button>
            <SidebarContent role={role} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64 print:pl-0">
        <header className="no-print sticky top-0 z-30 border-b border-violet-100 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-2 lg:invisible">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-lg p-2 text-violet-900 hover:bg-violet-50"
                aria-label="Abrir menú"
              >
                <Menu className="size-6" />
              </button>
              <Link href="/inicio" aria-label="EvalúaQR — inicio">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/evaluaqr-logo.png" alt="EvalúaQR" className="h-8 w-auto" width={1200} height={365} />
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-lilac text-sm font-bold text-white"
                aria-hidden
              >
                {initials(fullName)}
              </span>
              <div className="hidden min-w-0 text-sm sm:block">
                <div className="truncate font-semibold leading-tight text-slate-900">{fullName}</div>
                <div className="truncate text-xs leading-tight text-slate-500" title={email}>
                  {role === "teacher" ? "Docente" : "Estudiante"}
                </div>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  <LogOut className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
