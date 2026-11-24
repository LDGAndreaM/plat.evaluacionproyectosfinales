import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/aula/types";

/**
 * Usuario con sesión iniciada (docente o estudiante). Redirige al login si no hay sesión
 * y a /bienvenida si todavía no eligió si es docente o estudiante.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || claims.is_anonymous) redirect("/login");
  const load = () =>
    supabase.from("organizers").select("id, full_name, institution, email, role, privacy_accepted_at").eq("id", claims.sub).maybeSingle();
  let { data: profile } = await load();
  if (!profile?.role) {
    // Si lo invitaron con su correo, queda como estudiante automáticamente
    const { data: claimed } = await supabase.rpc("claim_invitations");
    if (claimed) ({ data: profile } = await load());
  }
  const role = (profile?.role ?? null) as Role | null;
  if (!role || !profile?.privacy_accepted_at) redirect("/bienvenida");
  return {
    supabase,
    userId: claims.sub as string,
    email: (claims.email as string | undefined) ?? profile?.email ?? "",
    fullName: profile?.full_name || ((claims.email as string | undefined) ?? ""),
    role,
  };
});

/** Solo docentes (eventos, herramientas y gestión de grupos). Los estudiantes van a su inicio. */
export const requireTeacher = cache(async () => {
  const user = await requireUser();
  if (user.role !== "teacher") redirect("/inicio");
  return user;
});

/** Alias histórico: las secciones de eventos y herramientas son solo para docentes. */
export const requireOrganizer = requireTeacher;
