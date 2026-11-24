import { getTeacherClass } from "@/lib/aula/data";
import { requireUser } from "@/lib/auth";
import { sortAnnouncements, type Announcement } from "@/lib/aula/announcements";
import { AnnouncementBoard } from "./board";

export default async function AnnouncementsPage({ params }: PageProps<"/aula/[id]/avisos">) {
  const { id } = await params;
  await getTeacherClass(id);
  const { supabase } = await requireUser();
  const { data } = await supabase.from("class_announcements").select("*").eq("class_id", id).order("created_at", { ascending: false });
  return <AnnouncementBoard classId={id} items={sortAnnouncements((data ?? []) as Announcement[])} />;
}
