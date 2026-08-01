"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";

export function PortalAccessCard({
  customerId,
  portalUserEmail,
}: {
  customerId: string;
  portalUserEmail: string | null;
}) {
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { name: string; email: string }) =>
      api.post(`/api/customers/${customerId}/invite-portal-user`, payload),
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
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Customer Portal Access</CardTitle>
      </CardHeader>
      <CardContent>
        {portalUserEmail ? (
          <p className="text-sm text-muted-foreground">
            Portal access granted to <span className="font-medium text-foreground">{portalUserEmail}</span>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="portalName">Contact Name</Label>
              <Input id="portalName" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portalEmail">Contact Email</Label>
              <Input id="portalEmail" name="email" type="email" required />
            </div>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            {mutation.isSuccess && (
              <p className="text-sm text-success sm:col-span-2">Invitation sent.</p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                {mutation.isPending ? "Sending…" : "Invite to Customer Portal"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
