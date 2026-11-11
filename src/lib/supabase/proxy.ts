import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/eventos", "/perfil"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Importante: no ejecutar código entre createServerClient y getClaims().
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isOrganizer = !!claims && claims.is_anonymous !== true;

  const path = request.nextUrl.pathname;
  if (PROTECTED_PREFIXES.some((p) => path.startsWith(p)) && !isOrganizer) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if ((path === "/login" || path === "/registro") && isOrganizer) {
    const url = request.nextUrl.clone();
    url.pathname = "/eventos";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
