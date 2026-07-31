import { NextResponse } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/auth";

// During the hybrid migration period, the frontend's login/signup/accept-invite
// flows authenticate against the new Express backend (JWT) but some modules
// still rely on the old NextAuth cookie session (see src/proxy.ts's
// ALREADY_MIGRATED_PATHS). This route re-runs the existing Credentials
// provider so both sessions exist side by side for the same user.
export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    throw error;
  }
}
