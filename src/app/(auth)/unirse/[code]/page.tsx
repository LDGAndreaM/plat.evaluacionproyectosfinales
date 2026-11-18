import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, GraduationCap } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { ClassBadge } from "@/components/aula/stat-card";
import { JoinForm } from "@/components/aula/join-form";
import { createClient } from "@/lib/supabase/server";
import { semesterLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Invitación a grupo" };

interface PublicClass {
  id: string;
  name: string;
  subject: string | null;
  period: string | null;
  grade: string | null;
  color: string;
  teacher: string;
  join_enabled: boolean;
  archived: boolean;
}

export default async function InvitePage({ params }: PageProps<"/unirse/[code]">) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const supabase = await createClient();
  const [{ data: rows }, { data: auth }] = await Promise.all([
    supabase.rpc("get_class_by_code", { code }),
    supabase.auth.getClaims(),
  ]);
  const cls = (rows as PublicClass[] | null)?.[0];

  if (!cls) {
    return (
      <div className="text-center">
        <AlertTriangle className="mx-auto size-12 text-amber-500" />
        <h1 className="mt-3 text-2xl font-extrabold text-violet-950">No encontramos ese grupo</h1>
        <p className="mt-2 text-slate-600">Revisa el código con tu docente: tal vez lo cambió.</p>
        <LinkButton href="/unirse" className="mt-6" variant="secondary">
          Escribir otro código
        </LinkButton>
      </div>
    );
  }

  const claims = auth?.claims && !auth.claims.is_anonymous ? auth.claims : null;
  let state: "anon" | "owner" | "member" | "teacher" | "can-join" = "anon";
  if (claims) {
    const [{ data: me }, { data: membership }] = await Promise.all([
      supabase.from("organizers").select("role").eq("id", claims.sub).maybeSingle(),
      supabase.from("class_students").select("id").eq("class_id", cls.id).eq("user_id", claims.sub).maybeSingle(),
    ]);
    const { data: owned } = await supabase.from("classes").select("id").eq("id", cls.id).eq("owner_id", claims.sub).maybeSingle();
    if (owned) state = "owner";
    else if (membership) state = "member";
    else if (me?.role === "teacher") state = "teacher";
    else state = "can-join";
  }
  const closed = !cls.join_enabled || cls.archived;
  const next = `/unirse/${code}`;

  return (
    <div>
      <p className="text-center text-sm font-semibold uppercase tracking-wide text-violet-600">Te invitaron a un grupo</p>
      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-lavender/60 p-4">
        <ClassBadge color={cls.color} name={cls.name} className="size-14 bg-white" />
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight text-violet-950">{cls.name}</h1>
          <p className="text-sm text-slate-600">
            {[cls.subject, semesterLabel(cls.grade), cls.period].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
            <GraduationCap className="size-4 text-violet-600" /> {cls.teacher || "Docente"}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {state === "member" ? (
          <div className="space-y-4 text-center">
            <p className="flex items-center justify-center gap-2 font-semibold text-turquoise-700">
              <CheckCircle2 className="size-5" /> Ya eres parte de este grupo
            </p>
            <LinkButton href={`/aula/${cls.id}`} size="lg" className="w-full rounded-xl">
              Ir al grupo
            </LinkButton>
          </div>
        ) : state === "owner" ? (
          <div className="space-y-4 text-center">
            <p className="text-slate-600">Eres el docente de este grupo. Comparte este enlace con tus estudiantes.</p>
            <LinkButton href={`/aula/${cls.id}`} size="lg" className="w-full rounded-xl">
              Ir al grupo
            </LinkButton>
          </div>
        ) : closed ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-amber-900">
            Este grupo no está aceptando estudiantes por ahora. Pide a tu docente que active las inscripciones.
          </p>
        ) : state === "teacher" ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            Tu cuenta es de <strong>docente</strong>. Para unirte como estudiante, sal e inicia sesión con una cuenta de estudiante.
          </p>
        ) : state === "can-join" ? (
          <JoinForm defaultCode={code} hiddenCode />
        ) : (
          <div className="space-y-3">
            <LinkButton
              href={`/registro?rol=estudiante&next=${encodeURIComponent(next)}`}
              size="lg"
              className="w-full rounded-xl bg-turquoise-700 text-base font-semibold hover:bg-[#006b5d]"
            >
              Crear mi cuenta de estudiante
            </LinkButton>
            <LinkButton href={`/login?next=${encodeURIComponent(next)}`} size="lg" variant="secondary" className="w-full rounded-xl">
              Ya tengo cuenta
            </LinkButton>
            <p className="pt-1 text-center text-xs text-slate-500">Es gratis. Después de entrar, te unirás al grupo con un clic.</p>
          </div>
        )}
      </div>
    </div>
  );
}
