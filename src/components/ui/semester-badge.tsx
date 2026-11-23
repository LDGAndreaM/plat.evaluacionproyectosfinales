import { cn, semesterColor, semesterLabel } from "@/lib/utils";

/** Etiqueta de semestre con un color distinto para cada semestre. */
export function SemesterBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value?.trim()) return null;
  const c = semesterColor(value);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}
      style={{ background: c.bg, color: c.fg }}
    >
      <span className="size-2 rounded-full" style={{ background: c.dot }} aria-hidden />
      {semesterLabel(value)}
    </span>
  );
}
