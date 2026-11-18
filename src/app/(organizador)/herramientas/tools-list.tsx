"use client";

import { Copy, Search, Share2, Trash2 } from "lucide-react";
import { TOOL_ICONS } from "@/lib/tools/icons";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { TOOL_INFO, type ToolKind } from "@/lib/tools/types";
import { cn, formatDateTime } from "@/lib/utils";
import { deleteTool, duplicateTool } from "./actions";

export interface ToolSummary {
  id: string;
  kind: ToolKind;
  title: string;
  is_public: boolean;
  updated_at: string;
  detail: string;
}

export function ToolsList({ tools }: { tools: ToolSummary[] }) {
  const [filter, setFilter] = useState<ToolKind | "all">("all");
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const q = query.trim().toLowerCase();
  const visible = tools.filter((t) => (filter === "all" || t.kind === filter) && (!q || t.title.toLowerCase().includes(q)));

  if (!tools.length)
    return (
      <EmptyState
        title="Aún no has guardado nada"
        description="Crea una ruleta, sopa de letras o crucigrama y presiona Guardar para encontrarlo aquí después."
      />
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
          {(["all", "worksheet", "wheel", "wordsearch", "crossword"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", filter === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}
            >
              {k === "all" ? "Todas" : TOOL_INFO[k].plural}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className="h-9 pl-9" aria-label="Buscar" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => {
          const Icon = TOOL_ICONS[t.kind];
          return (
            <Card key={t.id} className="flex flex-col p-4">
              <Link href={`/herramientas/${t.id}`} className="group flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900 group-hover:underline">{t.title}</span>
                  <span className="block text-xs text-slate-500">
                    {TOOL_INFO[t.kind].name} · {t.detail}
                  </span>
                </span>
              </Link>
              <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
                <span className="mr-auto">Editado {formatDateTime(t.updated_at)}</span>
                {t.is_public && (
                  <Badge tone="green">
                    <Share2 className="size-3" /> Compartido
                  </Badge>
                )}
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => void (await duplicateTool(t.id)))} aria-label={`Duplicar ${t.title}`}>
                  <Copy className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => window.confirm(`¿Eliminar “${t.title}”?`) && start(async () => void (await deleteTool(t.id)))}
                  aria-label={`Eliminar ${t.title}`}
                >
                  <Trash2 className="size-4 text-red-600" />
                </Button>
              </div>
            </Card>
          );
        })}
        {visible.length === 0 && <p className="text-sm text-slate-500">Nada coincide con la búsqueda.</p>}
      </div>
    </div>
  );
}
