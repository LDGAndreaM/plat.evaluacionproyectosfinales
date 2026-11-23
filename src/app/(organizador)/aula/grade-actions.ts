"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { normalizeSettings, weightTotal, type GradeSettings } from "@/lib/aula/grades";

export async function saveGradeSettings(classId: string, input: GradeSettings) {
  const { supabase } = await requireTeacher();
  const s = normalizeSettings(input);
  s.categories = s.categories
    .map((c) => ({ ...c, id: c.id.slice(0, 40) || crypto.randomUUID().slice(0, 8), name: c.name.trim().slice(0, 60), weight: Math.round(c.weight * 10) / 10 }))
    .filter((c) => c.name)
    .slice(0, 12);
  if (!s.categories.length) return { ok: false, error: "Agrega al menos un rubro." };
  if (new Set(s.categories.map((c) => c.id)).size !== s.categories.length) return { ok: false, error: "Hay rubros repetidos." };
  if (Math.abs(weightTotal(s) - 100) > 0.01) return { ok: false, error: `Los porcentajes deben sumar 100 (ahora suman ${weightTotal(s)}).` };
  if (s.categories.filter((c) => c.type === "attendance").length > 1) return { ok: false, error: "Solo puede haber un rubro de asistencia." };
  if (!(s.passing > 0 && s.passing <= s.scale)) return { ok: false, error: `La calificación aprobatoria debe estar entre 0 y ${s.scale}.` };
  const { error } = await supabase.from("classes").update({ grade_settings: s }).eq("id", classId);
  revalidatePath(`/aula/${classId}`, "layout");
  revalidatePath("/calificaciones");
  return error ? { ok: false, error: "No se pudieron guardar los ajustes." } : { ok: true };
}

export async function setManualGrade(classId: string, studentId: string, categoryId: string, score: number | null, scale: number) {
  const { supabase } = await requireTeacher();
  if (score != null && !(Number.isFinite(score) && score >= 0 && score <= scale)) return { ok: false, error: `Debe estar entre 0 y ${scale}.` };
  const { error } =
    score == null
      ? await supabase.from("class_manual_grades").delete().eq("student_id", studentId).eq("category_id", categoryId).eq("class_id", classId)
      : await supabase
          .from("class_manual_grades")
          .upsert({ class_id: classId, student_id: studentId, category_id: categoryId, score: Math.round(score * 100) / 100 });
  revalidatePath(`/aula/${classId}`, "layout");
  return error ? { ok: false, error: "No se pudo guardar." } : { ok: true };
}

export async function setActivityCategory(classId: string, activityId: string, categoryId: string) {
  const { supabase } = await requireTeacher();
  await supabase.from("activities").update({ grade_category: categoryId.slice(0, 40) || null }).eq("id", activityId).eq("class_id", classId);
  revalidatePath(`/aula/${classId}`, "layout");
}
