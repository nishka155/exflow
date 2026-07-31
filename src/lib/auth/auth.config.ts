import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no Prisma/bcrypt here (both are Node-only and would break
// the Edge middleware bundle). Used by src/proxy.ts just to check whether a
// valid session JWT is present. The real Credentials provider (with the
// Prisma/bcrypt-backed authorize()) lives in auth.ts, which is only ever
// imported from Node-runtime code (server actions, the API route handler).
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.organizationId = (user as { organizationId: string }).organizationId;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
