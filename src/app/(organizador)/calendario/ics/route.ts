import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarItems } from "@/lib/aula/calendar-data";
import { localDate } from "@/lib/aula/attendance";
import { toIcs } from "@/lib/aula/calendar";

/** Descarga .ics con entregas, pases de lista y eventos de los próximos 6 meses. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims || data.claims.is_anonymous) return NextResponse.redirect(new URL("/login", request.url));
  const from = localDate(new Date(Date.now() - 7 * 86400000));
  const to = localDate(new Date(Date.now() + 183 * 86400000));
  const items = (await getCalendarItems(from, to)).filter((i) => i.kind === "due" || i.kind === "event" || i.kind === "publish");
  const ics = toIcs(items, "EvalúaQR", request.nextUrl.origin);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="evaluaqr.ics"',
      "Cache-Control": "no-store",
    },
  });
}
