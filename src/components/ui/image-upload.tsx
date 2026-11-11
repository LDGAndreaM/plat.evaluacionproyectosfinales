"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_MB = 5;

/** Sube una imagen a Supabase Storage (bucket event-assets) y guarda la URL en un input oculto. */
export function ImageUpload({
  name,
  defaultValue,
  label,
  aspect = "square",
  onChange,
}: {
  name: string;
  defaultValue?: string | null;
  label: string;
  aspect?: "square" | "wide";
  onChange?: (url: string) => void;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("El archivo debe ser una imagen.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`La imagen debe pesar menos de ${MAX_MB} MB.`);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims?.sub;
      if (!userId) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("event-assets")
        .upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("event-assets").getPublicUrl(path);
      setUrl(data.publicUrl);
      onChange?.(data.publicUrl);
    } catch (e) {
      setError((e as Error).message || "No se pudo subir la imagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-800">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400",
            aspect === "square" ? "size-20" : "h-20 w-36",
          )}
          aria-label={url ? `Cambiar ${label.toLowerCase()}` : `Subir ${label.toLowerCase()}`}
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6" />
          )}
        </button>
        <div className="text-xs text-slate-500">
          <p>PNG, JPG, WEBP o SVG. Máx. {MAX_MB} MB.</p>
          {url && (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                onChange?.("");
              }}
              className="mt-1 inline-flex items-center gap-1 text-red-600 hover:underline"
            >
              <Trash2 className="size-3.5" /> Quitar
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
