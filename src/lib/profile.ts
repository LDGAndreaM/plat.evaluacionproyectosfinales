import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProfileDetails {
  user_id: string;
  avatar_path: string | null;
  phone: string | null;
  contact_email: string | null;
  program: string | null;
  about: string | null;
}

export interface ProfileView extends ProfileDetails {
  avatar_url: string | null;
}

/**
 * Perfiles visibles para el usuario actual (RLS: el propio, sus docentes o sus estudiantes),
 * con URL firmada de la foto (válida 1 hora).
 */
export async function getProfiles(supabase: SupabaseClient, userIds: string[]): Promise<Map<string, ProfileView>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, ProfileView>();
  if (!ids.length) return map;
  const { data } = await supabase.from("profile_details").select("user_id, avatar_path, phone, contact_email, program, about").in("user_id", ids);
  const rows = (data ?? []) as ProfileDetails[];
  const paths = rows.map((r) => r.avatar_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("avatars").createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  for (const r of rows) map.set(r.user_id, { ...r, avatar_url: r.avatar_path ? (signed.get(r.avatar_path) ?? null) : null });
  return map;
}

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<ProfileView | null> {
  return (await getProfiles(supabase, [userId])).get(userId) ?? null;
}
