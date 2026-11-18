import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo de EvalúaQR (imagen en /public/brand). */
export function AppLogo({ href = "/", size = "md", className }: { href?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const h = size === "sm" ? "h-7" : size === "lg" ? "h-14 sm:h-16" : "h-9";
  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center", className)} aria-label="EvalúaQR — inicio">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/evaluaqr-logo.png" alt="EvalúaQR" className={cn(h, "w-auto")} width={1200} height={365} />
    </Link>
  );
}

/** Solo el ícono (para espacios pequeños). */
export function AppIcon({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center", className)} aria-label="EvalúaQR — inicio">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/evaluaqr-icon.png" alt="EvalúaQR" className="size-9" width={128} height={128} />
    </Link>
  );
}
