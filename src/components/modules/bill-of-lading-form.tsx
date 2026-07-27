"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateBillOfLadingAction, type ActionResult } from "@/lib/actions/bills-of-lading";
import type { SerializedBL } from "@/lib/serializers/bill-of-lading";

export function BillOfLadingForm({ bl }: { bl: SerializedBL }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateBillOfLadingAction.bind(null, bl.id),
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2">
            <Label htmlFor="blNumber">BL Number</Label>
            <Input id="blNumber" name="blNumber" defaultValue={bl.blNumber ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blDate">BL Date</Label>
            <Input
              id="blDate"
              name="blDate"
              type="date"
              defaultValue={bl.blDate ? bl.blDate.slice(0, 10) : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consignorName">Consignor</Label>
            <Input id="consignorName" name="consignorName" required defaultValue={bl.consignorName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consigneeName">Consignee</Label>
            <Input id="consigneeName" name="consigneeName" required defaultValue={bl.consigneeName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consignorAddress">Consignor Address</Label>
            <Input id="consignorAddress" name="consignorAddress" defaultValue={bl.consignorAddress ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consigneeAddress">Consignee Address</Label>
            <Input id="consigneeAddress" name="consigneeAddress" defaultValue={bl.consigneeAddress ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notifyPartyName">Notify Party</Label>
            <Input id="notifyPartyName" name="notifyPartyName" defaultValue={bl.notifyPartyName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notifyPartyAddress">Notify Party Address</Label>
            <Input
              id="notifyPartyAddress"
              name="notifyPartyAddress"
              defaultValue={bl.notifyPartyAddress ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2">
            <Label htmlFor="pol">POL</Label>
            <Input id="pol" name="pol" required defaultValue={bl.pol} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pod">POD</Label>
            <Input id="pod" name="pod" required defaultValue={bl.pod} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vessel">Vessel</Label>
            <Input id="vessel" name="vessel" defaultValue={bl.vessel ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voyage">Voyage</Label>
            <Input id="voyage" name="voyage" defaultValue={bl.voyage ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="containerNumber">Container Number</Label>
            <Input id="containerNumber" name="containerNumber" defaultValue={bl.containerNumber ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sealNumber">Seal Number</Label>
            <Input id="sealNumber" name="sealNumber" defaultValue={bl.sealNumber ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="commodity">Commodity</Label>
            <Input id="commodity" name="commodity" required defaultValue={bl.commodity} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="packageCount">Package Count</Label>
            <Input id="packageCount" name="packageCount" type="number" defaultValue={bl.packageCount ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (KG)</Label>
            <Input id="weight" name="weight" type="number" step="0.01" defaultValue={bl.weight ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="freightTerms">Freight Terms</Label>
            <Input id="freightTerms" name="freightTerms" defaultValue={bl.freightTerms ?? ""} />
          </div>
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
