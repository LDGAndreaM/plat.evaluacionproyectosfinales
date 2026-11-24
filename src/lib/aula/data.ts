import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { ClassRow, ClassStudent, MyClass } from "./types";

export interface ClassWithStats extends ClassRow {
  activeCount: number;
  invitedCount: number;
  /** true si el usuario es co-docente (no titular). */
  isCoTeacher: boolean;
}

/** Ids de los grupos donde el usuario es co-docente. */
const coTaughtIds = cache(async () => {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("class_teachers").select("class_id").eq("user_id", userId);
  return (data ?? []).map((r) => r.class_id as string);
});

/** Grupos del docente (titular o co-docente) con conteo de estudiantes. */
export const getTeacherClasses = cache(async (): Promise<ClassWithStats[]> => {
  const { supabase, userId } = await requireUser();
  const co = await coTaughtIds();
  const filter = co.length ? `owner_id.eq.${userId},id.in.(${co.join(",")})` : `owner_id.eq.${userId}`;
  const { data: classes } = await supabase.from("classes").select("*").or(filter).order("created_at", { ascending: false });
  const ids = (classes ?? []).map((c) => c.id);
  const { data: students } = ids.length ? await supabase.from("class_students").select("class_id, status").in("class_id", ids) : { data: [] };
  const counts = new Map<string, { a: number; i: number }>();
  for (const s of students ?? []) {
    const c = counts.get(s.class_id) ?? { a: 0, i: 0 };
    if (s.status === "active") c.a++;
    else c.i++;
    counts.set(s.class_id, c);
  }
  return ((classes ?? []) as ClassRow[]).map((c) => ({
    ...c,
    activeCount: counts.get(c.id)?.a ?? 0,
    invitedCount: counts.get(c.id)?.i ?? 0,
    isCoTeacher: c.owner_id !== userId,
  }));
});

/** Grupo + lista de estudiantes (solo para sus docentes: titular o co-docente). */
export const getTeacherClass = cache(async (id: string) => {
  const { supabase, userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const co = await coTaughtIds();
  const [{ data: cls }, { data: students }] = await Promise.all([
    supabase.from("classes").select("*").eq("id", id).maybeSingle(),
    supabase.from("class_students").select("*").eq("class_id", id),
  ]);
  if (!cls || (cls.owner_id !== userId && !co.includes(id))) notFound();
  return { cls: cls as ClassRow, students: (students ?? []) as ClassStudent[], isOwner: cls.owner_id === userId };
});

/** Grupos del estudiante (con nombre del docente). */
export const getStudentClasses = cache(async (): Promise<MyClass[]> => {
  const { supabase } = await requireUser();
  // Vincula invitaciones nuevas hechas a su correo
  await supabase.rpc("claim_invitations");
  const { data } = await supabase.rpc("my_classes");
  return (data ?? []) as MyClass[];
});
