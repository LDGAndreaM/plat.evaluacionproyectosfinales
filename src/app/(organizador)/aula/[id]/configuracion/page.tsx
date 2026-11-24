import { Card, CardHeader } from "@/components/ui/card";
import { ClassForm } from "@/components/aula/class-form";
import { requireUser } from "@/lib/auth";
import { getTeacherClass } from "@/lib/aula/data";
import { updateClass } from "../../actions";
import { CoTeachers, DuplicateClass } from "./collab";
import { DangerZone, JoinSettings } from "./settings";

export default async function ClassSettingsPage({ params }: PageProps<"/aula/[id]/configuracion">) {
  const { id } = await params;
  const { cls, students, isOwner } = await getTeacherClass(id);
  const { supabase } = await requireUser();
  const { data: teachers } = await supabase.rpc("class_teacher_list", { cid: id });
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader title="Datos del grupo" />
          <div className="p-5">
            <ClassForm action={updateClass} cls={cls} submitLabel="Guardar cambios" />
          </div>
        </Card>
        <DuplicateClass id={cls.id} name={cls.name} />
      </div>
      <div className="space-y-6">
        <CoTeachers
          classId={cls.id}
          isOwner={isOwner}
          teachers={(teachers ?? []) as { user_id: string; full_name: string; email: string; is_owner: boolean }[]}
        />
        <JoinSettings id={cls.id} code={cls.join_code} enabled={cls.join_enabled} />
        <DangerZone id={cls.id} name={cls.name} archived={!!cls.archived_at} studentCount={students.length} isOwner={isOwner} />
      </div>
    </div>
  );
}
