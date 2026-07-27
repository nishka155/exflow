import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteUserForm } from "@/components/modules/invite-user-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, type Role } from "@/lib/constants/roles";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/settings/profile");

  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Invite a teammate</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Workspace Members</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant="outline">{ROLE_LABELS[u.role as Role]}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
