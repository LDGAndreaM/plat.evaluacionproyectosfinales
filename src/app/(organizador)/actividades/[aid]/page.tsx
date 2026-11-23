import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getStudentClasses } from "@/lib/aula/data";
import { formatScore, KIND_INFO, type Activity, type Submission } from "@/lib/aula/activities";
import { dueLabel } from "@/lib/aula/attendance";
import type { ToolKind, WorksheetData } from "@/lib/tools/types";
import { cn } from "@/lib/utils";
import { worksheetAutoScore } from "../../aula/activity-actions";
import { StudentActivity } from "./student-activity";

export const metadata: Metadata = { title: "Actividad" };

export default async function StudentActivityPage({ params }: PageProps<"/actividades/[aid]">) {
  const { aid } = await params;
  const { supabase, userId, role } = await requireUser();
  if (role === "teacher") redirect("/aula");
  if (!/^[0-9a-f-]{36}$/i.test(aid)) notFound();
  const { data } = await supabase.from("activities").select("*").eq("id", aid).maybeSingle();
  const a = data as Activity | null;
  if (!a) notFound();
  const cls = (await getStudentClasses()).find((c) => c.id === a.class_id);
  if (!cls) notFound();

  const [{ data: subs }, { data: team }, { data: tools }] = await Promise.all([
    supabase.from("activity_submissions").select("*").eq("activity_id", aid).order("submitted_at", { ascending: false }),
    a.mode === "team" ? supabase.rpc("my_activity_team", { aid }) : Promise.resolve({ data: null }),
    a.kind === "interactive" ? supabase.rpc("get_activity_tool", { aid }) : Promise.resolve({ data: null }),
  ]);
  const tool = ((tools as { kind: ToolKind; title: string; data: unknown }[] | null) ?? [])[0] ?? null;
  const mySubs = (subs ?? []) as Submission[];
  const auto: Record<string, number> = {};
  if (tool?.kind === "worksheet") {
    for (const s of mySubs) {
      const r = await worksheetAutoScore(tool.data as WorksheetData, s.answers, Number(a.max_score));
      if (r) auto[s.id] = r.score;
    }
  }
  const members = (team as { team_name: string; member_name: string; is_me: boolean }[] | null) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/actividades" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Mis actividades
      </Link>
      <Card className="overflow-hidden rounded-2xl">
        <div className="h-2" style={{ background: cls.color }} />
        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", KIND_INFO[a.kind].cls)}>{KIND_INFO[a.kind].label}</span>
            <span className="text-sm text-slate-500">{cls.name}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-violet-950 sm:text-3xl">{a.title}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" /> {a.due_at ? `Entrega: ${dueLabel(a.due_at)}` : "Sin fecha límite"}
            </span>
            <span>Vale {formatScore(Number(a.max_score))} pts</span>
            {a.due_at && a.allow_late && a.late_penalty_pct > 0 && <span>Entrega tardía: −{a.late_penalty_pct}%</span>}
            {a.due_at && !a.allow_late && <span>No se aceptan entregas tardías</span>}
          </div>
          {a.mode === "team" && (
            <div className="rounded-xl bg-lavender/70 px-4 py-3 text-sm text-violet-950">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Users className="size-4" /> {members[0]?.team_name ?? "Actividad en equipo"}
              </span>
              <p className="mt-0.5">
                {members.length
                  ? members.map((m) => (m.is_me ? `${m.member_name} (tú)` : m.member_name)).join(", ")
                  : "Aún no estás en un equipo. Tu docente te asignará uno."}
              </p>
              {members.length > 0 && <p className="mt-1 text-xs text-violet-800">Cualquier integrante puede entregar por todo el equipo.</p>}
            </div>
          )}
        </div>
      </Card>
      <StudentActivity
        activity={a}
        submissions={mySubs}
        tool={tool ? { kind: tool.kind, title: tool.title, data: tool.data } : null}
        auto={auto}
        userId={userId}
        canSubmitTeam={a.mode !== "team" || members.length > 0}
      />
    </div>
  );
}
