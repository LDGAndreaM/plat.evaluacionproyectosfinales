import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  violet: { card: "bg-violet-50 ring-violet-100", icon: "bg-white text-violet-600" },
  turquoise: { card: "bg-turquoise-50 ring-turquoise-100", icon: "bg-white text-turquoise-700" },
  coral: { card: "bg-[#fff1f4] ring-[#ffd9e1]", icon: "bg-white text-[#e0466a]" },
  sun: { card: "bg-[#fff8e6] ring-[#ffecb8]", icon: "bg-white text-[#b7791f]" },
  lilac: { card: "bg-[#f6efff] ring-[#ead9ff]", icon: "bg-white text-lilac" },
} as const;
export type Tone = keyof typeof TONES;

/** Tarjeta de indicador (número grande + etiqueta) en tonos de la paleta. */
export function StatCard({
  icon: Icon,
  value,
  label,
  tone = "violet",
  hint,
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  tone?: Tone;
  hint?: string;
}) {
  const t = TONES[tone];
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl p-4 ring-1", t.card)}>
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm", t.icon)}>
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-none text-slate-900">{value}</div>
        <div className="mt-1 text-sm text-slate-600">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}

/** Ícono cuadrado con el color del grupo. */
export function ClassBadge({ color, name, className }: { color: string; name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-base font-extrabold", className)}
      style={{ background: `${color}1f`, color }}
      aria-hidden
    >
      {letters || "G"}
    </span>
  );
}
