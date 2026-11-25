import Link from "next/link";
import { AppLogo } from "@/components/brand/logo";
import { LegalLinks } from "@/components/brand/legal-links";
import { Info } from "lucide-react";
import { INDEPENDENCE_NOTICE, LEGAL_UPDATED } from "@/lib/legal";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-[#f7f5fd]">
      <header className="border-b border-violet-100 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4">
          <AppLogo size="sm" />
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50">
            Iniciar sesión
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Documentos legales">
          <LegalLinks pills />
        </nav>
        <p role="note" className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200">
          <Info className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <span>
            <strong>Aviso importante.</strong> {INDEPENDENCE_NOTICE}
          </span>
        </p>
        <article className="legal rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">{children}</article>
        <p className="mt-4 text-center text-xs text-slate-500">Última actualización: {LEGAL_UPDATED}</p>
      </main>
    </div>
  );
}
