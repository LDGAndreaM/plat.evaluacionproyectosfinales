"use client";

import { createClient } from "@/lib/supabase/client";
import type { WsPage } from "./types";

const BUCKET = "worksheet-assets";
const MAX_PAGES = 20;
const PAGE_WIDTH = 1240; // px (≈ carta a 150 dpi)

async function userFolder() {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  return { supabase, uid: uid as string };
}

/** Sube un archivo (audio, presentación, imagen) y devuelve su URL pública. */
export async function uploadAsset(file: Blob, name: string, folder = "media") {
  const { supabase, uid } = await userFolder();
  const ext = (name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo convertir la página"))), "image/jpeg", 0.86),
  );
}

/** Convierte un PDF (o imágenes) en páginas de imagen subidas a Storage. */
export async function filesToPages(files: File[], onProgress: (text: string) => void): Promise<WsPage[]> {
  const pages: WsPage[] = [];
  const folder = `ws-${crypto.randomUUID().slice(0, 8)}`;

  for (const file of files) {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      onProgress("Leyendo el PDF…");
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const total = Math.min(doc.numPages, MAX_PAGES - pages.length);
      for (let i = 1; i <= total; i++) {
        onProgress(`Convirtiendo página ${i} de ${total}…`);
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: PAGE_WIDTH / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const url = await uploadAsset(await canvasToBlob(canvas), "pagina.jpg", folder);
        pages.push({ url, width: canvas.width, height: canvas.height });
      }
    } else if (file.type.startsWith("image/")) {
      onProgress(`Subiendo ${file.name}…`);
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, PAGE_WIDTH / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = await uploadAsset(await canvasToBlob(canvas), "pagina.jpg", folder);
      pages.push({ url, width: canvas.width, height: canvas.height });
    }
    if (pages.length >= MAX_PAGES) break;
  }
  if (!pages.length) throw new Error("Sube un PDF o imágenes (JPG o PNG).");
  return pages;
}

/** Enlace de inserción de YouTube a partir de cualquier URL de video. */
export function youtubeEmbed(url: string, start = 0) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (!m) return null;
  return `https://www.youtube-nocookie.com/embed/${m[1]}${start ? `?start=${Math.floor(start)}` : ""}`;
}

/** Enlace de inserción para presentaciones (PowerPoint, Google Slides, OneDrive). */
export function presentationEmbed(url: string) {
  if (!url) return null;
  if (/docs\.google\.com\/presentation/.test(url)) return url.replace(/\/(edit|view|pub)(\?.*)?$/, "/embed");
  if (/onedrive\.live\.com|sharepoint\.com|1drv\.ms/.test(url)) return url;
  if (/\.(pptx?|ppsx?)(\?|$)/i.test(url)) return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  return url;
}
