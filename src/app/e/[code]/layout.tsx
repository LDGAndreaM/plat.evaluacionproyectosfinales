import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PublicEvent } from "@/lib/types";
import { readableTextColor } from "@/lib/utils";
import { EvaluatorProvider } from "./evaluator-context";

const getPublicEvent = cache(async (code: string) => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_event", { code });
  return ((data as PublicEvent[] | null) ?? [])[0] ?? null;
});

export async function generateMetadata({ params }: LayoutProps<"/e/[code]">): Promise<Metadata> {
  const { code } = await params;
  const event = await getPublicEvent(code);
  return { title: event ? `Evaluar · ${event.name}` : "Evento no encontrado" };
}

export default async function EvaluatorLayout({ children, params }: LayoutProps<"/e/[code]">) {
  const { code } = await params;
  const event = await getPublicEvent(code);
  if (!event) notFound();
  const contrast = readableTextColor(event.primary_color);

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-50"
      style={{ "--brand": event.primary_color, "--brand-contrast": contrast } as React.CSSProperties}
    >
      <header style={{ background: event.primary_color, color: contrast }}>
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Link href={`/e/${event.short_code}`} className="flex min-w-0 items-center gap-3">
            {event.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.logo_url} alt="" className="size-10 shrink-0 rounded-lg bg-white object-contain p-1" />
            )}
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide opacity-80">Evaluación de proyectos</span>
              <span className="block truncate font-semibold leading-tight">{event.name}</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-5">
        <EvaluatorProvider event={event}>{children}</EvaluatorProvider>
      </main>
    </div>
  );
}
