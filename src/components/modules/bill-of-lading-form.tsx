"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";

export interface BLFormValues {
  id: string;
  shippingInstructionId: string;
  blNumber: string | null;
  blDate: string | null;
  consignorName: string;
  consignorAddress: string | null;
  consigneeName: string;
  consigneeAddress: string | null;
  notifyPartyName: string | null;
  notifyPartyAddress: string | null;
  pol: string;
  pod: string;
  vessel: string | null;
  voyage: string | null;
  containerNumber: string | null;
  sealNumber: string | null;
  commodity: string;
  packageCount: number | null;
  weight: string | null;
  freightTerms: string | null;
}

export function BillOfLadingForm({ bl }: { bl: BLFormValues }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.put<{ id: string; shippingInstructionId: string }>(`/api/bills-of-lading/${bl.id}`, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bill-of-lading", data.id] });
      queryClient.invalidateQueries({ queryKey: ["shipping-instruction", data.shippingInstructionId] });
      router.push(`/shipping-instructions/${data.shippingInstructionId}`);
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
      blNumber: formData.get("blNumber") || undefined,
      blDate: formData.get("blDate") || undefined,
      consignorName: formData.get("consignorName"),
      consignorAddress: formData.get("consignorAddress") || undefined,
      consigneeName: formData.get("consigneeName"),
      consigneeAddress: formData.get("consigneeAddress") || undefined,
      notifyPartyName: formData.get("notifyPartyName") || undefined,
      notifyPartyAddress: formData.get("notifyPartyAddress") || undefined,
      pol: formData.get("pol"),
      pod: formData.get("pod"),
      vessel: formData.get("vessel") || undefined,
      voyage: formData.get("voyage") || undefined,
      containerNumber: formData.get("containerNumber") || undefined,
      sealNumber: formData.get("sealNumber") || undefined,
      commodity: formData.get("commodity"),
      packageCount: formData.get("packageCount") || undefined,
      weight: formData.get("weight") || undefined,
      freightTerms: formData.get("freightTerms") || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
