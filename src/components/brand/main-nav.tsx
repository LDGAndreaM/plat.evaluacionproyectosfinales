"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/eventos", label: "Eventos", icon: CalendarCheck },
  { href: "/herramientas", label: "Herramientas", icon: Wrench },
];

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" className="flex gap-1">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium",
              active ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700",
            )}
          >
            <l.icon className="size-4" aria-hidden />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
