import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { IconInput } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Unirme a un grupo" };

export default async function UnirsePage({ searchParams }: PageProps<"/unirse">) {
  const sp = await searchParams;
  const code = typeof sp.codigo === "string" ? sp.codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (code) redirect(`/unirse/${code}`);
  return (
    <>
      <h1 className="text-center text-3xl font-extrabold text-violet-950">Unirme a un grupo</h1>
      <p className="mb-6 mt-2 text-center text-slate-600">Escribe el código que te dio tu docente.</p>
      <form method="get" className="space-y-4">
        <IconInput
          icon={<KeyRound className="size-5" />}
          name="codigo"
          required
          maxLength={12}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Código del grupo"
          aria-label="Código del grupo"
          className="h-12 rounded-xl font-mono uppercase tracking-widest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
        />
        <Button type="submit" size="lg" className="w-full rounded-xl bg-turquoise-700 text-base font-semibold hover:bg-[#006b5d]">
          Continuar
        </Button>
      </form>
    </>
  );
}
