"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/modules/profile-form";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthStore } from "@/lib/store/auth-store";
import { ROLE_LABELS, type Role } from "@/lib/constants/roles";

function ProfilePageContent() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">Email</p>
          <p>{user.email}</p>
        </div>
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">Role</p>
          <p>{ROLE_LABELS[user.role as Role]}</p>
        </div>
        <ProfileForm name={user.name} phone="" />
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  );
}
