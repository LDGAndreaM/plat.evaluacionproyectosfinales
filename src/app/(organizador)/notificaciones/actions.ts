"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export async function markAllRead() {
  const { supabase } = await requireUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  revalidatePath("/notificaciones");
}

export async function clearRead() {
  const { supabase } = await requireUser();
  await supabase.from("notifications").delete().not("read_at", "is", null);
  revalidatePath("/notificaciones");
}
