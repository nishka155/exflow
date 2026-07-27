import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/modules/profile-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLE_LABELS } from "@/lib/constants/roles";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
          <p>{ROLE_LABELS[user.role]}</p>
        </div>
        <ProfileForm name={user.name} phone="" />
      </CardContent>
    </Card>
  );
}
