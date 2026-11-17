import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOL_INFO, isToolKind } from "@/lib/tools/types";
import { ToolEditor } from "../../editor";

export async function generateMetadata({ params }: PageProps<"/herramientas/nueva/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  return { title: isToolKind(kind) ? `Nueva ${TOOL_INFO[kind].name.toLowerCase()}` : "Herramienta" };
}

export default async function NewToolPage({ params }: PageProps<"/herramientas/nueva/[kind]">) {
  const { kind } = await params;
  if (!isToolKind(kind)) notFound();
  return <ToolEditor tool={null} kind={kind} />;
}
