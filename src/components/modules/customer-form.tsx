"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { Customer } from "@prisma/client";
import type { ActionResult } from "@/lib/actions/customers";

type CustomerFormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function CustomerForm({
  customer,
  action,
}: {
  customer?: Customer;
  action: CustomerFormAction;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Company Name</Label>
            <Input id="name" name="name" required defaultValue={customer?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Customer Code</Label>
            <Input id="code" name="code" defaultValue={customer?.code ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" required defaultValue={customer?.country ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={customer?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstNumber">GST / Tax Number</Label>
            <Input id="gstNumber" name="gstNumber" defaultValue={customer?.gstNumber ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={customer?.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" name="contactPerson" defaultValue={customer?.contactPerson ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={customer?.contactPhone ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={customer?.contactEmail ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : customer ? "Save Changes" : "Create Customer"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
