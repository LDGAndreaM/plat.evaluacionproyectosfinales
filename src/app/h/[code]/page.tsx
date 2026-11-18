import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { AppLogo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { TOOL_INFO, type ToolKind } from "@/lib/tools/types";
import { SharedTool } from "./shared-tool";

type Shared = { kind: ToolKind; title: string; data: unknown } | null;

async function load(code: string): Promise<Shared> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_tool", { code });
  return (data as Shared) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/h/[code]">): Promise<Metadata> {
  const tool = await load((await params).code);
  return { title: tool ? tool.title : "Herramienta no disponible" };
}

export default async function SharedToolPage({ params }: PageProps<"/h/[code]">) {
  const { code } = await params;
  const tool = await load(code);
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <AppLogo />
          {tool && <span className="text-sm text-slate-500">{TOOL_INFO[tool.kind].name}</span>}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {tool ? (
          <>
            <h1 className="mb-4 text-2xl font-semibold text-slate-900">{tool.title}</h1>
            <SharedTool kind={tool.kind} title={tool.title} data={tool.data} code={code} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Lock className="size-10 text-slate-400" />
            <h1 className="text-xl font-semibold text-slate-900">Esta herramienta no está disponible</h1>
            <p className="max-w-md text-sm text-slate-500">El enlace no existe o el maestro dejó de compartirla.</p>
          </div>
        )}
      </main>
    </div>
  );
}
