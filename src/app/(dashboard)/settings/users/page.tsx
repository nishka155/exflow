"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteUserForm } from "@/components/modules/invite-user-form";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api } from "@/lib/api/client";
import { ROLE_LABELS, type Role } from "@/lib/constants/roles";

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

function UsersPageContent() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["workspace-users"],
    queryFn: () => api.get<WorkspaceUser[]>("/api/profile/users"),
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
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">Could not load members.</p>
          ) : (
            users?.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline">{ROLE_LABELS[u.role as Role]}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsersPage() {
  return (
    <AuthGuard>
      <UsersPageContent />
    </AuthGuard>
  );
}
