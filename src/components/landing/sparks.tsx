import { cn } from "@/lib/utils";

/** Tres trazos decorativos en turquesa (como en el logo). */
export function Sparks({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn("text-turquoise", flip && "-scale-x-100", className)}>
      <path d="M8 22 L2 26" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M14 13 L10 4" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M22 16 L30 9" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
