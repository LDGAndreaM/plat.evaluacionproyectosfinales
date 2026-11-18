import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTeacherClass } from "@/lib/aula/data";
import { getClassAttendance } from "@/lib/aula/attendance-data";
import { byLastName } from "@/lib/aula/types";
import { getProfiles } from "@/lib/profile";
import { SessionView } from "./session-view";

export default async function SessionPage({ params }: PageProps<"/aula/[id]/asistencia/[sid]">) {
  const { id, sid } = await params;
  const { cls, students } = await getTeacherClass(id);
  const { sessions, records } = await getClassAttendance(id);
  const session = sessions.find((s) => s.id === sid);
  if (!session) notFound();
  const sessionRecords = records.filter((r) => r.session_id === sid);
  // Estudiantes activos + los que tengan registro aunque ya no estén activos
  const roster = students.filter((s) => s.status === "active" || sessionRecords.some((r) => r.student_id === s.id)).sort(byLastName);
  const { supabase } = await requireUser();
  const profiles = await getProfiles(supabase, roster.map((s) => s.user_id ?? ""));
  return (
    <div className="space-y-4">
      <Link href={`/aula/${id}/asistencia`} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Asistencia
      </Link>
      <SessionView
        classId={id}
        className={cls.name}
        hasLocation={cls.att_lat != null}
        session={session}
        students={roster}
        initialRecords={sessionRecords}
        avatars={Object.fromEntries([...profiles].map(([k, v]) => [k, v.avatar_url]))}
      />
    </div>
  );
}
