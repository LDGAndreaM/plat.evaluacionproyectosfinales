import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/privacidad", label: "Aviso de privacidad" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/cookies", label: "Política de cookies" },
];

/** Enlaces a los documentos legales (pie de página, acceso, perfil). */
export function LegalLinks({ pills = false, className }: { pills?: boolean; className?: string }) {
  return (
    <>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            pills ? "rounded-full bg-white px-3 py-1 font-semibold text-violet-800 ring-1 ring-violet-100 hover:bg-violet-50" : "hover:text-violet-700 hover:underline",
            className,
          )}
        >
          {l.label}
        </Link>
      ))}
    </>
  );
}
