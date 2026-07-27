import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Anonymous-only: bounce a signed-in user away from these (e.g. back to /dashboard).
const ANONYMOUS_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];
// Always allowed regardless of auth state — reset-password relies on the
// short-lived recovery session created by /auth/callback, not a normal login.
const ALWAYS_ALLOWED_PATHS = ["/reset-password", "/auth/callback"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAnonymousOnlyPath = ANONYMOUS_ONLY_PATHS.some((p) => pathname.startsWith(p));
  const isAlwaysAllowedPath = ALWAYS_ALLOWED_PATHS.some((p) => pathname.startsWith(p));

  if (isAlwaysAllowedPath) {
    return response;
  }

  if (!user && !isAnonymousOnlyPath && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAnonymousOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
