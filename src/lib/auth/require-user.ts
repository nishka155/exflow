import { getCurrentUser } from "@/lib/auth/get-current-user";
import { roleCanAccess } from "@/lib/constants/roles";

export async function requireUser(moduleKey?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (moduleKey && !roleCanAccess(user.role, moduleKey)) {
    throw new Error("Not authorized for this module");
  }
  return user;
}
