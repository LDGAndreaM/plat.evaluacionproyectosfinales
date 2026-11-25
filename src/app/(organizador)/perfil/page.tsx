import type { Metadata } from "next";
import { KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { AvatarUpload } from "./avatar-upload";
import { ProfileForm } from "./profile-form";
import { PrivacyCard } from "./delete-account";
import { EmailDigestCard } from "./email-digest";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const { supabase, userId, email, fullName, role } = await requireUser();
  const [profile, { data: org }, { data: auth }] = await Promise.all([
    getProfile(supabase, userId),
    supabase.from("organizers").select("institution, privacy_accepted_at, email_digest, email").eq("id", userId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const providers = (auth.user?.app_metadata?.providers as string[] | undefined) ?? [];
  const hasPassword = providers.includes("email");
  const teacher = role === "teacher";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-violet-950">Mi perfil</h1>
        <p className="mt-1 text-slate-600">Tu foto y tus datos de contacto.</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-turquoise-50 p-4 text-sm text-slate-700 ring-1 ring-turquoise-100">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-turquoise-700" />
        <p>
          <strong className="text-slate-900">¿Quién ve esta información?</strong>{" "}
          {teacher
            ? "Solo tú y los estudiantes de tus grupos. Otros docentes y los evaluadores de tus eventos no la ven."
            : "Solo tú y tus docentes. Tus compañeros de grupo no pueden verla."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="rounded-2xl p-6">
            <AvatarUpload userId={userId} url={profile?.avatar_url ?? null} name={fullName} />
            <div className="mt-4 text-center">
              <div className="font-bold text-slate-900">{fullName}</div>
              <span className={teacher ? "text-sm font-semibold text-violet-700" : "text-sm font-semibold text-turquoise-700"}>
                {teacher ? "Docente" : "Estudiante"}
              </span>
            </div>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader title="Cuenta" />
            <div className="space-y-4 p-5 text-sm">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Mail className="size-3.5" /> Correo de acceso
                </div>
                <div className="mt-0.5 break-all font-medium text-slate-900">{email}</div>
                <p className="text-xs text-slate-500">Con este correo inicias sesión y te vinculan a tus grupos.</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Lock className="size-3.5" /> Acceso
                </div>
                <div className="mt-0.5 text-slate-700">
                  {[hasPassword && "Correo y contraseña", providers.includes("google") && "Google"].filter(Boolean).join(" · ") || "Correo"}
                </div>
              </div>
              <LinkButton href="/actualizar-contrasena" variant="secondary" size="sm">
                <KeyRound className="size-4" /> {hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
              </LinkButton>
            </div>
          </Card>
          <EmailDigestCard enabled={org?.email_digest ?? true} email={org?.email ?? null} role={role} />
          <PrivacyCard role={role} acceptedAt={org?.privacy_accepted_at ?? null} />
        </div>

        <Card className="rounded-2xl">
          <CardHeader title="Datos personales y de contacto" />
          <div className="p-5">
            <ProfileForm
              role={role}
              fullName={fullName}
              institution={org?.institution ?? ""}
              phone={profile?.phone ?? ""}
              contactEmail={profile?.contact_email ?? ""}
              program={profile?.program ?? ""}
              about={profile?.about ?? ""}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
