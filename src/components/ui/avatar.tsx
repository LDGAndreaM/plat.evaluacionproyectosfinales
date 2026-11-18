import { cn } from "@/lib/utils";

export function initials(name: string) {
  return (
    name
      .replace(/^(mtr[oa]\.?|dr[a]?\.?|lic\.?|ing\.?)\s+/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Foto de perfil redonda; si no hay foto, iniciales sobre degradado de la marca. */
export function Avatar({ url, name, className }: { url?: string | null; name: string; className?: string }) {
  if (url)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cn("size-10 shrink-0 rounded-full object-cover ring-2 ring-white", className)} />;
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-lilac text-sm font-bold text-white",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
