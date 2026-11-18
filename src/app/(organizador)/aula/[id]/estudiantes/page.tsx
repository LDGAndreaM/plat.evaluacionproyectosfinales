import { Card } from "@/components/ui/card";
import { InvitePanel } from "@/components/aula/invite-panel";
import { getTeacherClass } from "@/lib/aula/data";
import { byLastName } from "@/lib/aula/types";
import { StudentsManager } from "./students-manager";
import { PartyPopper } from "lucide-react";

export default async function StudentsPage({ params, searchParams }: PageProps<"/aula/[id]/estudiantes">) {
  const { id } = await params;
  const sp = await searchParams;
  const { cls, students } = await getTeacherClass(id);
  const sorted = [...students].sort(byLastName);
  return (
    <div className="space-y-5">
      {sp.nuevo === "1" && (
        <Card className="rounded-2xl border-turquoise-100 bg-turquoise-50/60 p-5">
          <h2 className="flex items-center gap-2 font-bold text-violet-950">
            <PartyPopper className="size-5 text-turquoise-700" /> ¡Grupo creado! Ahora agrega a tus estudiantes
          </h2>
          <p className="mb-4 mt-1 text-sm text-slate-600">
            Importa tu lista en CSV o comparte el enlace o el código. Si los invitas con su correo, entrarán al grupo automáticamente al crear su cuenta.
          </p>
          <InvitePanel code={cls.join_code} enabled={cls.join_enabled} />
        </Card>
      )}
      <StudentsManager
        classId={cls.id}
        className={cls.name}
        students={sorted}
        openImport={sp.importar === "1"}
        openAdd={sp.agregar === "1"}
      />
    </div>
  );
}
