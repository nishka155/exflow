import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import type { Role } from "@/lib/constants/roles";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const profile = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!profile || !profile.isActive) return null;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as Role,
    organizationId: profile.organizationId,
  };
}
