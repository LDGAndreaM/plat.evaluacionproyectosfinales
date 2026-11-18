import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { CheckIn } from "@/components/aula/check-in";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Registrar asistencia" };

export default async function RegisterAttendancePage({ searchParams }: PageProps<"/asistencia/registrar">) {
  const { role } = await requireUser();
  const sp = await searchParams;
  const s = typeof sp.s === "string" ? sp.s : undefined;
  const c = typeof sp.c === "string" ? sp.c.replace(/\D/g, "").slice(0, 6) : undefined;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-center text-3xl font-extrabold text-violet-950">Registrar asistencia</h1>
      <Card className="rounded-3xl p-6">
        {role === "teacher" ? (
          <p className="text-center text-slate-600">Este QR es para tus estudiantes. Con tu cuenta de docente no se registra asistencia.</p>
        ) : (
          <CheckIn session={s} code={c} />
        )}
      </Card>
    </div>
  );
}
