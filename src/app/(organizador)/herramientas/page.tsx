import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireOrganizer } from "@/lib/auth";
import { TOOL_INFO, type TeacherTool, type ToolKind, type CrosswordData, type WheelData, type WordSearchData, type WorksheetData } from "@/lib/tools/types";
import { TOOL_ICONS } from "@/lib/tools/icons";
import { ToolsList, type ToolSummary } from "./tools-list";

export const metadata: Metadata = { title: "Herramientas para maestros" };

function detail(t: TeacherTool) {
  if (t.kind === "wheel") {
    const n = (t.data as WheelData).wheels?.length ?? 1;
    return n > 1 ? `${n} ruletas` : `${(t.data as WheelData).entries?.length ?? 0} opciones`;
  }
  if (t.kind === "wordsearch") return `${(t.data as WordSearchData).words?.length ?? 0} palabras`;
  if (t.kind === "worksheet") return `${(t.data as WorksheetData).pages?.length ?? 0} pág. · ${(t.data as WorksheetData).elements?.length ?? 0} elementos`;
  return `${(t.data as CrosswordData).entries?.length ?? 0} palabras`;
}

export default async function ToolsHome() {
  const { supabase } = await requireOrganizer();
  const { data } = await supabase.from("teacher_tools").select("*").order("updated_at", { ascending: false }).returns<TeacherTool[]>();
  const tools: ToolSummary[] = (data ?? []).map((t) => ({
    id: t.id,
    kind: t.kind,
    title: t.title,
    is_public: t.is_public,
    updated_at: t.updated_at,
    detail: detail(t),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Herramientas para maestros</h1>
        <p className="text-sm text-slate-500">Gratuitas. Todo lo que guardes queda en tu cuenta para volver a usarlo.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["worksheet", "wheel", "wordsearch", "crossword"] as ToolKind[]).map((k) => {
          const Icon = TOOL_ICONS[k];
          return (
            <Link
              key={k}
              href={`/herramientas/nueva/${k}`}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-turquoise text-white">
                <Icon className="size-6" />
              </span>
              <span className="mt-3 text-lg font-semibold text-slate-900">{TOOL_INFO[k].name}</span>
              <span className="mt-1 flex-1 text-sm text-slate-600">{TOOL_INFO[k].description}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-700 group-hover:underline">
                Crear nueva <ArrowRight className="size-4" />
              </span>
            </Link>
          );
        })}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Mis creaciones</h2>
        <ToolsList tools={tools} />
      </section>
    </div>
  );
}
