"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { setAvatar } from "./actions";

/** Recorta al centro en cuadrado y reduce a 400×400 JPG. */
async function squareJpeg(file: File, size = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo procesar la imagen."))), "image/jpeg", 0.88));
}

export function AvatarUpload({ userId, url, name }: { userId: string; url: string | null; name: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Elige una imagen (JPG, PNG o WebP).");
    if (file.size > 15 * 1024 * 1024) return setError("La imagen pesa demasiado (máx. 15 MB).");
    setBusy(true);
    try {
      const blob = await squareJpeg(file);
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const supabase = createClient();
      const { error: up } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up) throw up;
      const res = await setAvatar(path);
      if (!res.ok) throw new Error(res.error);
      setPreview(URL.createObjectURL(blob));
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "No se pudo subir la foto.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (!confirm("¿Quitar tu foto de perfil?")) return;
    setBusy(true);
    const res = await setAvatar(null);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "No se pudo quitar la foto.");
    setPreview(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative">
        <Avatar url={preview} name={name} className="size-32 text-3xl ring-4 ring-lavender" />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full bg-turquoise-700 text-white shadow-lg hover:bg-[#006b5d]"
          aria-label="Cambiar foto de perfil"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </button>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Elegir foto" />
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {preview ? "Cambiar foto" : "Subir foto"}
        </Button>
        {preview && (
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
            <Trash2 className="size-4" /> Quitar
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500">Se recorta en cuadro automáticamente.</p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
