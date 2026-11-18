import { Card, CardHeader } from "@/components/ui/card";
import { ClassForm } from "@/components/aula/class-form";
import { getTeacherClass } from "@/lib/aula/data";
import { updateClass } from "../../actions";
import { DangerZone, JoinSettings } from "./settings";

export default async function ClassSettingsPage({ params }: PageProps<"/aula/[id]/configuracion">) {
  const { id } = await params;
  const { cls, students } = await getTeacherClass(id);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="rounded-2xl">
        <CardHeader title="Datos del grupo" />
        <div className="p-5">
          <ClassForm action={updateClass} cls={cls} submitLabel="Guardar cambios" />
        </div>
      </Card>
      <div className="space-y-6">
        <JoinSettings id={cls.id} code={cls.join_code} enabled={cls.join_enabled} />
        <DangerZone id={cls.id} name={cls.name} archived={!!cls.archived_at} studentCount={students.length} />
      </div>
    </div>
  );
}
