import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileCheck2 } from "lucide-react";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getStudentClasses } from "@/lib/aula/data";
import type { Excuse } from "@/lib/aula/attendance";
import { ExcuseForm, MyExcuseCard } from "./excuse-ui";

export const metadata: Metadata = { title: "Justificantes" };

export default async function ExcusesPage({ searchParams }: PageProps<"/justificantes">) {
  const { supabase, userId, role } = await requireUser();
  if (role === "teacher") redirect("/aula");
  const sp = await searchParams;
  const classes = (await getStudentClasses()).filter((c) => !c.archived);
  const { data } = await supabase.from("excuses").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  const excuses = (data ?? []) as Excuse[];
  const names = Object.fromEntries(classes.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-violet-950">Justificantes</h1>
        <p className="mt-1 text-slate-600">Envía a tu docente el motivo de una falta con su comprobante. Solo tu docente puede verlo.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="h-fit rounded-2xl">
          <CardHeader title="Nuevo justificante" />
          <div className="p-5">
            {classes.length === 0 ? (
              <p className="text-sm text-slate-500">Primero únete a un grupo.</p>
            ) : (
              <ExcuseForm
                userId={userId}
                classes={classes.map((c) => ({ id: c.id, name: c.name }))}
                defaultClass={typeof sp.grupo === "string" ? sp.grupo : undefined}
                defaultDate={typeof sp.fecha === "string" ? sp.fecha : undefined}
              />
            )}
          </div>
        </Card>
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-violet-950">Mis justificantes</h2>
          {excuses.length === 0 ? (
            <EmptyState icon={<FileCheck2 className="size-10" />} title="No has enviado justificantes" />
          ) : (
            excuses.map((e) => <MyExcuseCard key={e.id} e={e} className={names[e.class_id] ?? "Grupo"} userId={userId} />)
          )}
        </div>
      </div>
    </div>
  );
}
