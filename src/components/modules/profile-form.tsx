"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api/client";

export function ProfileForm({
  name,
  phone,
}: {
  name: string;
  phone: string;
}) {
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { name: string; phone?: string }) => api.put("/api/profile/me", payload),
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
      phone: String(formData.get("phone") ?? "") || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={phone} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {mutation.isSuccess && <p className="text-sm text-success">Profile updated.</p>}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
