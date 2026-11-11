import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Devuelve el organizador con sesión iniciada o redirige al login. */
export const requireOrganizer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || claims.is_anonymous) redirect("/login");
  const { data: profile } = await supabase
    .from("organizers")
    .select("id, full_name, institution, email")
    .eq("id", claims.sub)
    .maybeSingle();
  return {
    supabase,
    userId: claims.sub as string,
    email: (claims.email as string | undefined) ?? profile?.email ?? "",
    fullName: profile?.full_name || ((claims.email as string | undefined) ?? ""),
  };
});
