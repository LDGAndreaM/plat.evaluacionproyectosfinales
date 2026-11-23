"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { SubmissionFile } from "@/lib/aula/activities";

export async function submitActivity(input: {
  activityId: string;
  body?: string | null;
  link?: string | null;
  files?: SubmissionFile[];
  answers?: Record<string, unknown> | null;
}) {
  const { supabase, role } = await requireUser();
  if (role !== "student") return { ok: false, error: "Solo las cuentas de estudiante entregan actividades." };
  const files = (input.files ?? []).slice(0, 10).map((f) => ({
    path: String(f.path).slice(0, 300),
    name: String(f.name).slice(0, 200),
    size: Number(f.size) || 0,
    type: String(f.type ?? "").slice(0, 100),
  }));
  const { error } = await supabase.rpc("submit_activity", {
    aid: input.activityId,
    body: input.body ?? null,
    link: input.link ?? null,
    files,
    answers: input.answers ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/actividades");
  revalidatePath(`/actividades/${input.activityId}`);
  revalidatePath("/inicio");
  return { ok: true };
}

/** URL temporal para ver un archivo (recursos del docente o entregas propias / del equipo). */
export async function fileUrl(path: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.storage.from("activity-files").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
