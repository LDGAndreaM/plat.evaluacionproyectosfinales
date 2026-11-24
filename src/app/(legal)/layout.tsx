import Link from "next/link";
import { AppLogo } from "@/components/brand/logo";
import { LegalLinks } from "@/components/brand/legal-links";
import { LEGAL_UPDATED } from "@/lib/legal";

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
        <article className="legal rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">{children}</article>
        <p className="mt-4 text-center text-xs text-slate-500">Última actualización: {LEGAL_UPDATED}</p>
      </main>
    </div>
  );
}
