import { AppShell } from "@/components/brand/app-shell";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { signOut } from "@/app/(auth)/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, userId, fullName, email, role } = await requireUser();
  const profile = await getProfile(supabase, userId);
  return (
    <AppShell role={role} fullName={fullName} email={email} avatarUrl={profile?.avatar_url} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
