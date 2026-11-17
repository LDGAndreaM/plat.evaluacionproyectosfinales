import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrganizer } from "@/lib/auth";
import type { TeacherTool } from "@/lib/tools/types";
import { ToolEditor } from "../editor";

export const metadata: Metadata = { title: "Herramienta" };

export default async function ToolPage({ params }: PageProps<"/herramientas/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireOrganizer();
  const { data: tool } = await supabase.from("teacher_tools").select("*").eq("id", id).maybeSingle<TeacherTool>();
  if (!tool) notFound();
  return <ToolEditor key={tool.id} tool={tool} kind={tool.kind} />;
}
