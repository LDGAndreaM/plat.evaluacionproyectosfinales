"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FEATURE_TABS, TONES } from "./content";

/** Pestañas con un carrusel de tarjetas (desliza en celular; flechas y puntos en pantallas grandes). */
export function FeatureTabs() {
  const [tab, setTab] = useState(FEATURE_TABS[0].key);
  const current = FEATURE_TABS.find((t) => t.key === tab)!;
  const scroller = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ page: 0, pages: 1 });

  function measure() {
    const el = scroller.current;
    if (!el) return;
    const pages = Math.max(1, Math.round(el.scrollWidth / el.clientWidth));
    const page = Math.min(pages - 1, Math.round(el.scrollLeft / el.clientWidth));
    setPos((p) => (p.page === page && p.pages === pages ? p : { page, pages }));
  }

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: 0 });
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);

  const go = (page: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: page * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div role="tablist" aria-label="Funciones" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {FEATURE_TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls="feature-panel"
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition",
                active ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25" : "bg-white text-violet-950 ring-1 ring-violet-100 hover:bg-violet-50",
              )}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative mt-6">
        <button
          type="button"
          aria-label="Anteriores"
          onClick={() => go(pos.page - 1)}
          disabled={pos.page === 0}
          className="absolute -left-5 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-violet-700 shadow-lg ring-1 ring-violet-100 transition hover:bg-violet-50 disabled:opacity-0 lg:grid"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div
          id="feature-panel"
          role="tabpanel"
          ref={scroller}
          onScroll={measure}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {current.items.map((f) => {
            const t = TONES[f.tone];
            return (
              <article
                key={f.title}
                className="flex w-[78%] shrink-0 snap-start flex-col rounded-3xl border p-6 sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
                style={{ background: t.bg, borderColor: t.border }}
              >
                <div className="relative h-20">
                  <span className="absolute left-0 top-5 h-12 w-28 rounded-full" style={{ background: t.blob }} />
                  <f.icon className="relative left-8 size-16" strokeWidth={1.8} style={{ color: t.color }} aria-hidden />
                </div>
                <h3 className="mt-3 text-xl font-extrabold text-violet-950">{f.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{f.text}</p>
              </article>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Siguientes"
          onClick={() => go(pos.page + 1)}
          disabled={pos.page >= pos.pages - 1}
          className="absolute -right-5 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-violet-700 shadow-lg ring-1 ring-violet-100 transition hover:bg-violet-50 disabled:opacity-0 lg:grid"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {pos.pages > 1 && (
        <div className="mt-5 flex justify-center gap-2">
          {Array.from({ length: pos.pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Página ${i + 1}`}
              aria-current={i === pos.page}
              onClick={() => go(i)}
              className={cn("h-2.5 rounded-full transition-all", i === pos.page ? "w-6 bg-violet-600" : "w-2.5 bg-violet-200 hover:bg-violet-300")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
