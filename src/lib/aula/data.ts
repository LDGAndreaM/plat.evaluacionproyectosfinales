import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { ClassRow, ClassStudent, MyClass } from "./types";

export interface ClassWithStats extends ClassRow {
  activeCount: number;
  invitedCount: number;
}

/** Grupos del docente con conteo de estudiantes. */
export const getTeacherClasses = cache(async (): Promise<ClassWithStats[]> => {
  const { supabase, userId } = await requireUser();
  const [{ data: classes }, { data: students }] = await Promise.all([
    supabase.from("classes").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase.from("class_students").select("class_id, status, classes!inner(owner_id)").eq("classes.owner_id", userId),
  ]);
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
  }));
});

/** Grupo + lista de estudiantes (solo su docente). */
export const getTeacherClass = cache(async (id: string) => {
  const { supabase, userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ data: cls }, { data: students }] = await Promise.all([
    supabase.from("classes").select("*").eq("id", id).eq("owner_id", userId).maybeSingle(),
    supabase.from("class_students").select("*").eq("class_id", id),
  ]);
  if (!cls) notFound();
  return { cls: cls as ClassRow, students: (students ?? []) as ClassStudent[] };
});

/** Grupos del estudiante (con nombre del docente). */
export const getStudentClasses = cache(async (): Promise<MyClass[]> => {
  const { supabase } = await requireUser();
  // Vincula invitaciones nuevas hechas a su correo
  await supabase.rpc("claim_invitations");
  const { data } = await supabase.rpc("my_classes");
  return (data ?? []) as MyClass[];
});
