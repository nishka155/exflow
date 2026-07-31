import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// Routes already converted to the new Express-backend + JWT architecture.
// These pass straight through with no NextAuth/cookie check at all — auth for
// them is enforced client-side (AuthGuard reading the zustand store) since
// the session now lives in a Bearer token, not a cookie this middleware can
// see. Every other route keeps working exactly as before under the existing
// NextAuth cookie-session/Server-Action stack until it's migrated too.
const ALREADY_MIGRATED_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/invoices",
];

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;
  const isAlreadyMigratedPath = ALREADY_MIGRATED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isAlreadyMigratedPath) {
    return NextResponse.next();
  }

  if (!isAuthed && pathname !== "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
