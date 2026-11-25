import { createClient } from "@supabase/supabase-js";
import { buildDigest, type DigestDue, type DigestNotice } from "@/lib/email/digest";
import { mailConfigured, sendMail } from "@/lib/email/mailer";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tarea diaria (Vercel Cron):
 * 1. Hace una consulta mínima para que el plan gratuito de Supabase no pause el proyecto.
 * 2. Si el correo está configurado, envía el resumen diario a quien lo tenga activado.
 */
export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error: pingError } = await anon.rpc("ping");

  const secret = process.env.CRON_SECRET;
  const authorized = !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = { ping: !pingError, emails: 0, failed: 0, skipped: "" };

  if (!authorized) result.skipped = "sin autorización";
  else if (!serviceKey) result.skipped = "falta SUPABASE_SERVICE_ROLE_KEY";
  else if (!mailConfigured()) result.skipped = "correo no configurado";
  else {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc("email_digest_batch", { max_users: 300 });
    if (error) result.skipped = "error al leer el resumen";
    const site = siteUrl();
    for (const u of (data ?? []) as { email: string; full_name: string; notices: DigestNotice[] | null; due: DigestDue[] | null }[]) {
      try {
        await sendMail(u.email, buildDigest({ name: u.full_name, notices: u.notices ?? [], due: u.due ?? [], site }));
        result.emails++;
      } catch {
        result.failed++;
      }
    }
  }
  return Response.json(result, { status: pingError ? 500 : 200 });
}
