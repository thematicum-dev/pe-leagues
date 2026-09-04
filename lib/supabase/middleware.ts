import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import { safeNext } from "@/lib/auth/next";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/access",
  "/admin",
  "/leaderboard",
  "/season",
  "/practice",
  "/explain",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // WICHTIG: Nicht entfernen. getUser() verifiziert den Token beim Auth-Server
  // (anders als getSession(), das nur dem Cookie vertraut) und stößt bei
  // Bedarf einen Token-Refresh an, dessen neue Cookies oben mitgeschrieben werden.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // safeNext filtert den Übungsmodus heraus: der ist kein Anmeldeziel,
    // dort landet man nur bewusst vom Dashboard aus.
    const next = safeNext(path);
    if (next !== "/dashboard") {
      url.searchParams.set("next", next);
    }
    return NextResponse.redirect(url);
  }

  return response;
}
