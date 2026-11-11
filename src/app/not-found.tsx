import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="text-xl font-semibold text-slate-900">No encontramos esta página</h1>
      <p className="text-sm text-slate-500">Puede que el enlace esté mal escrito o que ya no tengas acceso.</p>
      <LinkButton href="/" variant="secondary">
        Ir al inicio
      </LinkButton>
    </main>
  );
}
