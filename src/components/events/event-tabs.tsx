"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, FolderKanban, LayoutDashboard, QrCode, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/eventos/${eventId}`;
  const tabs = [
    { href: base, label: "Resumen", icon: LayoutDashboard },
    { href: `${base}/proyectos`, label: "Proyectos", icon: FolderKanban },
    { href: `${base}/formularios`, label: "Formularios", icon: ClipboardList },
    { href: `${base}/qr`, label: "Códigos QR", icon: QrCode },
    { href: `${base}/resultados`, label: "Resultados", icon: BarChart3 },
    { href: `${base}/ajustes`, label: "Ajustes", icon: Settings },
  ];
  return (
    <nav className="no-print -mx-4 overflow-x-auto px-4" aria-label="Secciones del evento">
      <ul className="flex min-w-max gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium",
                  active
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
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
