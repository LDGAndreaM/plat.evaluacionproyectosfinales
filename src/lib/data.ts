import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireOrganizer } from "@/lib/auth";
import type { EventRow } from "@/lib/types";

export type EventRole = "owner" | "editor" | "viewer";

/** Carga un evento del organizador actual (o en el que colabora) y su rol. */
export const getEvent = cache(async (id: string) => {
  const ctx = await requireOrganizer();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: event } = await ctx.supabase.from("events").select("*").eq("id", id).maybeSingle<EventRow>();
  if (!event) notFound();
  let role: EventRole = "owner";
  if (event.owner_id !== ctx.userId) {
    const { data: collab } = await ctx.supabase
      .from("event_collaborators")
      .select("role")
      .eq("event_id", id)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    role = (collab?.role as EventRole) ?? "viewer";
  }
  return { ...ctx, event, role, canEdit: role !== "viewer" };
});
