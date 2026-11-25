"use server";

import { requireTeacher } from "@/lib/auth";
import type { Resource, SubmissionFile } from "@/lib/aula/activities";

export interface BackupFile {
  /** Ruta dentro del ZIP (sin carpeta raíz). */
  zip: string;
  url: string | null;
}
export interface BackupText {
  zip: string;
  text: string;
}

const clean = (s: string) => s.replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "sin nombre";

/** Lista los archivos de un grupo (entregas, justificantes y material) con enlaces temporales para armar el respaldo. */
export async function backupManifest(classId: string) {
  const { supabase } = await requireTeacher();
  const [{ data: students }, { data: acts }, { data: subs }, { data: excuses }] = await Promise.all([
    supabase.from("class_students").select("id, first_name, last_name").eq("class_id", classId),
    supabase.from("activities").select("id, title, resources").eq("class_id", classId),
    supabase.from("activity_submissions").select("activity_id, student_id, attempt, body, link, files, submitted_at").eq("class_id", classId),
    supabase.from("excuses").select("student_id, date_from, file_path, file_name, reason").eq("class_id", classId),
  ]);
  if (!acts && !students) return { ok: false as const, error: "No se encontró el grupo." };

  const who = new Map((students ?? []).map((s) => [s.id, clean(`${s.last_name}${s.last_name ? ", " : ""}${s.first_name}`)]));
  const actName = new Map((acts ?? []).map((a) => [a.id, clean(a.title)]));
  const wanted: { bucket: string; path: string; zip: string }[] = [];
  const texts: BackupText[] = [];
  const used = new Set<string>();
  const unique = (p: string) => {
    let out = p;
    for (let i = 2; used.has(out); i++) out = p.replace(/(\.[^./]+)?$/, ` (${i})$1`);
    used.add(out);
    return out;
  };

  for (const a of acts ?? [])
    for (const r of (a.resources ?? []) as Resource[])
      if (r.type === "file" && r.path) wanted.push({ bucket: "activity-files", path: r.path, zip: unique(`Material de actividades/${clean(a.title)}/${clean(r.name)}`) });

  for (const s of subs ?? []) {
    const base = `Entregas/${actName.get(s.activity_id) ?? "Actividad"}/${who.get(s.student_id) ?? "Estudiante"}`;
    const pre = s.attempt > 1 ? `intento ${s.attempt} - ` : "";
    for (const f of (s.files ?? []) as SubmissionFile[]) if (f.path) wanted.push({ bucket: "activity-files", path: f.path, zip: unique(`${base}/${pre}${clean(f.name)}`) });
    if (s.body || s.link)
      texts.push({ zip: unique(`${base}/${pre}respuesta.txt`), text: [s.body, s.link ? `Enlace: ${s.link}` : ""].filter(Boolean).join("\n\n") });
  }

  for (const e of excuses ?? [])
    if (e.file_path)
      wanted.push({ bucket: "excuses", path: e.file_path, zip: unique(`Justificantes/${who.get(e.student_id) ?? "Estudiante"}/${e.date_from} - ${clean(e.file_name ?? "comprobante")}`) });

  const files: BackupFile[] = [];
  for (const bucket of ["activity-files", "excuses"]) {
    const list = wanted.filter((w) => w.bucket === bucket);
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const { data } = await supabase.storage.from(bucket).createSignedUrls(chunk.map((c) => c.path), 3600);
      chunk.forEach((c, j) => files.push({ zip: c.zip, url: data?.[j]?.signedUrl ?? null }));
    }
  }
  return { ok: true as const, files, texts };
}
