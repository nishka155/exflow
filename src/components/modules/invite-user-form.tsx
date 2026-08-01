"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { api, ApiError } from "@/lib/api/client";
import { ROLE_LABELS, ROLES } from "@/lib/constants/roles";

export function InviteUserForm() {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [role, setRole] = React.useState("EXPORT_MANAGER");
  const invitableRoles = ROLES.filter((r) => r !== "CUSTOMER");

  const mutation = useMutation({
    mutationFn: (payload: { name: string; email: string; role: string }) =>
      api.post("/api/profile/users/invite", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-users"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
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
        <Select value={role} onValueChange={(v) => v && setRole(v)}>
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
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      {mutation.isSuccess && (
        <p className="text-sm text-success sm:col-span-2">Invitation sent.</p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send Invite"}
        </Button>
      </div>
    </form>
  );
}
