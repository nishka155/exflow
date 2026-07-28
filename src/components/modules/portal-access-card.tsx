"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { invitePortalUserAction, type ActionResult } from "@/lib/actions/customer-portal-admin";

export function PortalAccessCard({
  customerId,
  portalUserEmail,
}: {
  customerId: string;
  portalUserEmail: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    invitePortalUserAction.bind(null, customerId),
    {}
  );

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
          <form action={formAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="portalName">Contact Name</Label>
              <Input id="portalName" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portalEmail">Contact Email</Label>
              <Input id="portalEmail" name="email" type="email" required />
            </div>
            {state.error && (
              <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>
            )}
            {state.success && (
              <p className="text-sm text-success sm:col-span-2">Invitation sent.</p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Sending…" : "Invite to Customer Portal"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
