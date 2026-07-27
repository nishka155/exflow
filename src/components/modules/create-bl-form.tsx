"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { ShippingInstruction, Shipment, Customer } from "@prisma/client";
import { createBillOfLadingAction, type ActionResult } from "@/lib/actions/bills-of-lading";

type SiOption = ShippingInstruction & { shipment: Shipment & { customer: Customer } };

export function CreateBLForm({ sis }: { sis: SiOption[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createBillOfLadingAction,
    {}
  );
  const [siId, setSiId] = React.useState("");

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="space-y-2 py-1">
          <Label htmlFor="shippingInstructionId">Confirmed Shipping Instruction</Label>
          <input type="hidden" name="shippingInstructionId" value={siId} />
          <Select value={siId} onValueChange={(v) => v && setSiId(v)}>
            <SelectTrigger id="shippingInstructionId" className="w-full">
              <SelectValue placeholder="Select a confirmed shipping instruction">
                {(value: string | null) => {
                  const si = sis.find((s) => s.id === value);
                  return si ? `${si.shipment.shipmentNumber} · ${si.shipment.customer.name}` : null;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sis.map((si) => (
                <SelectItem key={si.id} value={si.id}>
                  {si.shipment.shipmentNumber} · {si.shipment.customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The Bill of Lading draft is pre-filled from the shipping instruction — you can edit it
            afterwards, and any divergence from the SI will be flagged automatically.
          </p>
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending || !siId}>
          {pending ? "Creating…" : "Generate BL Draft"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
