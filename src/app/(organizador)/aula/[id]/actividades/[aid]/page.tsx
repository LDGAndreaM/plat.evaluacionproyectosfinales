import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getTeacherClass } from "@/lib/aula/data";
import { getClassActivities } from "@/lib/aula/activities-data";
import { byLastName } from "@/lib/aula/types";
import { getProfiles } from "@/lib/profile";
import type { ToolKind, WorksheetData } from "@/lib/tools/types";
import { worksheetAutoScore } from "../../../activity-actions";
import { ActivityDetail } from "./activity-detail";

export default async function ActivityPage({ params }: PageProps<"/aula/[id]/actividades/[aid]">) {
  const { id, aid } = await params;
  const { supabase } = await requireTeacher();
  const { students } = await getTeacherClass(id);
  const { activities, submissions, teams } = await getClassActivities(id);
  const activity = activities.find((a) => a.id === aid);
  if (!activity) notFound();
  const subs = submissions.filter((s) => s.activity_id === aid);

  type ToolRow = { kind: ToolKind; title: string; data: unknown };
  let tool: ToolRow | null = null;
  if (activity.tool_id) {
    const { data } = await supabase.from("teacher_tools").select("kind, title, data").eq("id", activity.tool_id).maybeSingle();
    if (data) tool = data as ToolRow;
  }
  // Calificación automática (fichas), calculada aquí con las respuestas guardadas
  const auto: Record<string, { earned: number; max: number; pendingManual: number; score: number }> = {};
  if (tool?.kind === "worksheet") {
    for (const s of subs) {
      const r = await worksheetAutoScore(tool.data as WorksheetData, s.answers, Number(activity.max_score));
      if (r) auto[s.id] = r;
    }
  }

  const roster = students.filter((s) => s.status === "active").sort(byLastName);
  const profiles = await getProfiles(supabase, roster.map((s) => s.user_id ?? ""));
  return (
    <div className="space-y-4">
      <Link href={`/aula/${id}/actividades`} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Actividades
      </Link>
      <ActivityDetail
        classId={id}
        activity={activity}
        students={roster}
        submissions={subs}
        teams={teams.filter((t) => t.activity_id === aid)}
        tool={tool ? { kind: tool.kind, title: tool.title, worksheet: tool.kind === "worksheet" ? (tool.data as WorksheetData) : null } : null}
        auto={auto}
        avatars={Object.fromEntries([...profiles].map(([k, v]) => [k, v.avatar_url]))}
      />
    </div>
  );
}
