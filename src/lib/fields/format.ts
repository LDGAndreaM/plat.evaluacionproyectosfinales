import type { FormField } from "@/lib/types";

/** Texto legible de una respuesta (para tablas, Excel y PDF). */
export function formatAnswer(field: FormField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const c = field.config ?? {};
  switch (field.type) {
    case "single_choice":
    case "dropdown":
    case "likert": {
      const o = c.options?.find((x) => x.id === value);
      return o ? (field.scored ? `${o.label} (${o.points})` : o.label) : "";
    }
    case "multiple_choice":
      return Array.isArray(value)
        ? (c.options ?? [])
            .filter((o) => (value as string[]).includes(o.id))
            .map((o) => o.label)
            .join(", ")
        : "";
    case "matrix": {
      const ans = value as Record<string, string>;
      return (c.rows ?? [])
        .map((r) => {
          const col = c.columns?.find((x) => x.id === ans[r.id]);
          return `${r.label}: ${col ? `${col.label} (${col.points})` : "—"}`;
        })
        .join(" · ");
    }
    case "yes_no":
      return value === true ? c.yesLabel || "Sí" : value === false ? c.noLabel || "No" : "";
    case "rating":
      return `${value} de ${c.max ?? 5} estrellas`;
    case "linear_scale":
      return `${value} (de ${c.min ?? 0} a ${c.max ?? 10})`;
    case "datetime": {
      const s = String(value);
      if (c.mode === "time") return s;
      const d = new Date(c.mode === "date" ? `${s}T00:00` : s);
      if (Number.isNaN(d.getTime())) return s;
      return new Intl.DateTimeFormat("es-MX", c.mode === "date" ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" }).format(d);
    }
    case "signature":
      return "Firmado";
    case "file":
      return (value as { name?: string })?.name ?? "Archivo";
    default:
      return String(value);
  }
}
