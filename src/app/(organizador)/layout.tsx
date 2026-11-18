import { AppShell } from "@/components/brand/app-shell";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { fullName, email, role } = await requireUser();
  return (
    <AppShell role={role} fullName={fullName} email={email} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
