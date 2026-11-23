import { notFound } from "next/navigation";
import { BarChart3, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/card";

const SECTIONS = {
  calificaciones: {
    icon: BarChart3,
    title: "Calificaciones",
    stage: "Etapa 4",
    items: ["Ponderaciones por rubro, escala 0–10 o 0–100.", "Asistencia y tareas como indicadores separados.", "Promedio por estudiante y por grupo."],
  },
  reportes: {
    icon: FileSpreadsheet,
    title: "Reportes",
    stage: "Etapa 4",
    items: ["Listas de asistencia, entregas y calificaciones.", "Descarga en Excel, CSV y PDF."],
  },
} as const;

export default async function ComingSoonSection({ params }: PageProps<"/aula/[id]/[seccion]">) {
  const { seccion } = await params;
  const s = SECTIONS[seccion as keyof typeof SECTIONS];
  if (!s) notFound();
  return (
    <Card className="rounded-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-lavender text-violet-700">
          <s.icon className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-sun/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#8a5a00]">
            Próximamente · {s.stage}
          </span>
          <h2 className="mt-2 text-xl font-extrabold text-violet-950">{s.title}</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700">
            {s.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
