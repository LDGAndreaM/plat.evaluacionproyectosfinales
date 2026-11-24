import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleForm } from "./role-form";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function BienvenidaPage({ searchParams }: PageProps<"/bienvenida">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims || data.claims.is_anonymous) redirect("/login");
  await supabase.rpc("claim_invitations");
  const { data: me } = await supabase.from("organizers").select("full_name, role, privacy_accepted_at").eq("id", data.claims.sub).maybeSingle();
  if (me?.role && me.privacy_accepted_at) redirect(next ?? "/inicio");
  const first = (me?.full_name ?? "").split(" ")[0];
  return (
    <>
      <h1 className="text-center text-3xl font-extrabold text-violet-950">¡Hola{first ? `, ${first}` : ""}! 👋</h1>
      <p className="mb-6 mt-2 text-center text-slate-600">
        {me?.role ? "Actualizamos nuestro Aviso de privacidad. Revísalo y acéptalo para continuar." : "Cuéntanos cómo usarás EvalúaQR. Solo te lo preguntamos una vez."}
      </p>
      <RoleForm next={next} needsRole={!me?.role} />
    </>
  );
}
