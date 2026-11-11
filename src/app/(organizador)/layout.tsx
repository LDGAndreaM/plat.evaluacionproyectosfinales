import { LogOut } from "lucide-react";
import { AppLogo } from "@/components/brand/logo";
import { requireOrganizer } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export default async function OrganizerLayout({ children }: LayoutProps<"/">) {
  const { fullName, email } = await requireOrganizer();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <AppLogo href="/eventos" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <div className="font-medium leading-tight text-slate-900">{fullName}</div>
              <div className="text-xs leading-tight text-slate-500">{email}</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</div>
    </div>
  );
}
