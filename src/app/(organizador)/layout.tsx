import { AppShell } from "@/components/brand/app-shell";
import type { Reminder } from "@/lib/aula/notifications";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { getMyActivities } from "@/lib/aula/activities-data";
import { dueLabel } from "@/lib/aula/attendance";
import { trackStatus } from "@/lib/aula/activities";
import { signOut } from "@/app/(auth)/actions";

/** Recordatorios: actividades del estudiante que vencen en menos de 24 h y siguen pendientes. */
async function dueSoon(): Promise<Reminder[]> {
  const { activities, submissions } = await getMyActivities();
  const now = new Date().getTime();
  return activities
    .filter((a) => a.status === "published" && a.due_at && Date.parse(a.due_at) > now && Date.parse(a.due_at) - now < 24 * 3600 * 1000)
    .filter((a) => {
      const latest = submissions.filter((s) => s.activity_id === a.id).sort((x, y) => Date.parse(y.submitted_at) - Date.parse(x.submitted_at))[0];
      const st = trackStatus(latest, a, now);
      return st === "pending" || st === "returned";
    })
    .map((a) => ({ id: a.id, title: `Vence pronto: ${a.title}`, subtitle: `Entrega ${dueLabel(a.due_at!)}`, href: `/actividades/${a.id}` }));
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, userId, fullName, email, role } = await requireUser();
  const [profile, reminders] = await Promise.all([getProfile(supabase, userId), role === "student" ? dueSoon() : Promise.resolve([])]);
  return (
    <AppShell role={role} fullName={fullName} email={email} avatarUrl={profile?.avatar_url} reminders={reminders} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
