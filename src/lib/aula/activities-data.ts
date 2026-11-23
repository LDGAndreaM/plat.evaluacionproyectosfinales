import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import type { Activity, Submission, Team } from "./activities";

/** Actividades, entregas y equipos de un grupo (docente). */
export const getClassActivities = cache(async (classId: string) => {
  const { supabase } = await requireUser();
  const [{ data: activities }, { data: subs }, { data: teams }, { data: members }] = await Promise.all([
    supabase.from("activities").select("*").eq("class_id", classId).order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("activity_submissions").select("*").eq("class_id", classId).order("submitted_at", { ascending: false }),
    supabase.from("activity_teams").select("id, activity_id, name, created_at").eq("class_id", classId).order("created_at"),
    supabase.from("activity_team_members").select("team_id, activity_id, student_id"),
  ]);
  const teamList: Team[] = (teams ?? []).map((t) => ({
    id: t.id,
    activity_id: t.activity_id,
    name: t.name,
    members: (members ?? []).filter((m) => m.team_id === t.id).map((m) => m.student_id),
  }));
  return {
    activities: (activities ?? []) as Activity[],
    submissions: (subs ?? []) as Submission[],
    teams: teamList,
  };
});

/** Actividades visibles para el estudiante en todos sus grupos, con sus entregas. */
export const getMyActivities = cache(async () => {
  const { supabase, userId } = await requireUser();
  const { data: rows } = await supabase.from("class_students").select("id, class_id").eq("user_id", userId).eq("status", "active");
  const classIds = (rows ?? []).map((r) => r.class_id);
  if (!classIds.length) return { activities: [] as Activity[], submissions: [] as Submission[], studentIds: new Map<string, string>() };
  const [{ data: activities }, { data: subs }] = await Promise.all([
    supabase.from("activities").select("*").in("class_id", classIds).order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("activity_submissions").select("*").in("class_id", classIds).order("submitted_at", { ascending: false }),
  ]);
  return {
    activities: (activities ?? []) as Activity[],
    submissions: (subs ?? []) as Submission[],
    studentIds: new Map((rows ?? []).map((r) => [r.class_id, r.id])),
  };
});
