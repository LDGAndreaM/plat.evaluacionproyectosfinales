import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireTeacher } from "@/lib/auth";
import { getTeacherClass } from "@/lib/aula/data";
import { normalizeSettings } from "@/lib/aula/grades";
import { ActivityForm, type ToolOption } from "../activity-form";

export default async function NewActivityPage({ params }: PageProps<"/aula/[id]/actividades/nueva">) {
  const { id } = await params;
  const { supabase, userId } = await requireTeacher();
  const { cls } = await getTeacherClass(id);
  const gradeCategories = normalizeSettings(cls.grade_settings).categories.filter((c) => c.type === "activities").map((c) => ({ id: c.id, name: c.name }));
  const { data: tools } = await supabase.from("teacher_tools").select("id, kind, title").eq("owner_id", userId).order("updated_at", { ascending: false });
  return (
    <div className="space-y-4">
      <Link href={`/aula/${id}/actividades`} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Actividades
      </Link>
      <h2 className="text-2xl font-extrabold text-violet-950">Nueva actividad</h2>
      <Card className="rounded-2xl p-5 sm:p-6">
        <ActivityForm classId={id} newId={crypto.randomUUID()} tools={(tools ?? []) as ToolOption[]} gradeCategories={gradeCategories} />
      </Card>
    </div>
  );
}
