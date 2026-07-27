"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUserAction, type ActionResult } from "@/lib/actions/profile";
import { ROLE_LABELS, ROLES } from "@/lib/constants/roles";

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    inviteUserAction,
    {}
  );
  const invitableRoles = ROLES.filter((r) => r !== "CUSTOMER");

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="role">Role</Label>
        <Select name="role" defaultValue="EXPORT_MANAGER">
          <SelectTrigger id="role" className="w-full">
            <SelectValue>
              {(value: string | null) =>
                value ? ROLE_LABELS[value as keyof typeof ROLE_LABELS] : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {invitableRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-success sm:col-span-2">Invitation sent.</p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send Invite"}
        </Button>
      </div>
    </form>
  );
}
