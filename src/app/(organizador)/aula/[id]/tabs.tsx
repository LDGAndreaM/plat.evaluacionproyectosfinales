"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, FileSpreadsheet, LayoutDashboard, Megaphone, QrCode, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClassTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/aula/${id}`;
  const tabs = [
    { href: base, label: "Resumen", icon: LayoutDashboard },
    { href: `${base}/avisos`, label: "Avisos", icon: Megaphone },
    { href: `${base}/estudiantes`, label: "Estudiantes", icon: Users },
    { href: `${base}/asistencia`, label: "Asistencia", icon: QrCode },
    { href: `${base}/actividades`, label: "Actividades y tareas", icon: ClipboardList },
    { href: `${base}/calificaciones`, label: "Calificaciones", icon: BarChart3 },
    { href: `${base}/reportes`, label: "Reportes", icon: FileSpreadsheet },
    { href: `${base}/configuracion`, label: "Configuración", icon: Settings },
  ];
  return (
    <nav aria-label="Secciones del grupo" className="no-print -mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold",
                  active ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                <t.icon className="size-4" aria-hidden />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
