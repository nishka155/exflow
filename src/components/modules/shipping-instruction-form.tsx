"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Booking,
  Customer,
  Invoice,
  FactoryStuffing,
  GateIn,
} from "@prisma/client";
import { api, ApiError } from "@/lib/api/client";

type BookingOption = Booking & {
  customer: Customer;
  invoice: Invoice | null;
  factoryStuffings: FactoryStuffing[];
  gateIns: GateIn[];
};

interface Prefill {
  consignorName: string;
  consigneeName: string;
  consigneeAddress: string;
  pol: string;
  pod: string;
  commodity: string;
  hsCode: string;
  packageCount: string;
  weight: string;
  containerNumber: string;
  sealNumber: string;
  shippingLine: string;
  vessel: string;
}

function buildPrefill(booking: BookingOption, organizationName: string): Prefill {
  const stuffing = booking.factoryStuffings[0] ?? null;
  return {
    consignorName: organizationName,
    consigneeName: booking.customer.name,
    consigneeAddress: [booking.customer.address, booking.customer.city, booking.customer.country]
      .filter(Boolean)
      .join(", "),
    pol: stuffing?.pol ?? booking.pol ?? "",
    pod: stuffing?.pod ?? booking.pod ?? "",
    commodity: booking.invoice?.material ?? booking.commodity ?? "",
    hsCode: booking.invoice?.hsnCode ?? "",
    packageCount: stuffing?.numberOfBoxes?.toString() ?? "",
    weight: booking.invoice ? String(booking.invoice.weight) : "",
    containerNumber: stuffing?.containerNumber ?? "",
    sealNumber: stuffing?.sealNumber ?? "",
    shippingLine: booking.shippingLine ?? "",
    vessel: booking.vessel ?? "",
  };
}

export function ShippingInstructionForm({
  bookings,
  organizationName,
}: {
  bookings: BookingOption[];
  organizationName: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [bookingId, setBookingId] = React.useState("");
  const [prefill, setPrefill] = React.useState<Prefill>({
    consignorName: organizationName,
    consigneeName: "",
    consigneeAddress: "",
    pol: "",
    pod: "",
    commodity: "",
    hsCode: "",
    packageCount: "",
    weight: "",
    containerNumber: "",
    sealNumber: "",
    shippingLine: "",
    vessel: "",
  });

  function handleBookingChange(id: string) {
    setBookingId(id);
    const booking = bookings.find((s) => s.id === id);
    if (booking) setPrefill(buildPrefill(booking, organizationName));
  }

  function updatePrefill<K extends keyof Prefill>(key: K, value: Prefill[K]) {
    setPrefill((prev) => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<{ id: string }>("/api/shipping-instructions", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["shipping-instructions"] });
      router.push(`/shipping-instructions/${data.id}`);
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
      bookingId,
      consignorName: prefill.consignorName,
      consignorAddress: formData.get("consignorAddress") || undefined,
      shippingLine: prefill.shippingLine || undefined,
      vessel: prefill.vessel || undefined,
      consigneeName: prefill.consigneeName,
      consigneeAddress: prefill.consigneeAddress || undefined,
      notifyPartyName: formData.get("notifyPartyName") || undefined,
      notifyPartyAddress: formData.get("notifyPartyAddress") || undefined,
      pol: prefill.pol,
      pod: prefill.pod,
      commodity: prefill.commodity,
      hsCode: prefill.hsCode || undefined,
      packageCount: prefill.packageCount || undefined,
      weight: prefill.weight || undefined,
      marks: formData.get("marks") || undefined,
      containerNumber: prefill.containerNumber || undefined,
      sealNumber: prefill.sealNumber || undefined,
      freightTerms: formData.get("freightTerms") || undefined,
      incoterms: formData.get("incoterms") || undefined,
      voyage: formData.get("voyage") || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Source Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={bookingId} onValueChange={(v) => v && handleBookingChange(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a booking (auto-fills fields below)">
                {(value: string | null) => {
                  const s = bookings.find((s) => s.id === value);
                  return s ? `${s.bookingNumber} · ${s.customer.name}` : null;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {bookings.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.bookingNumber} · {s.customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2">
            <Label htmlFor="consignorName">Consignor</Label>
            <Input
              id="consignorName"
              name="consignorName"
              required
              value={prefill.consignorName}
              onChange={(e) => updatePrefill("consignorName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consignorAddress">Consignor Address</Label>
            <Input id="consignorAddress" name="consignorAddress" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consigneeName">Consignee</Label>
            <Input
              id="consigneeName"
              name="consigneeName"
              required
              value={prefill.consigneeName}
              onChange={(e) => updatePrefill("consigneeName", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="consigneeAddress">Consignee Address</Label>
            <Input
              id="consigneeAddress"
              name="consigneeAddress"
              value={prefill.consigneeAddress}
              onChange={(e) => updatePrefill("consigneeAddress", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notifyPartyName">Notify Party</Label>
            <Input id="notifyPartyName" name="notifyPartyName" defaultValue={prefill.consigneeName} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notifyPartyAddress">Notify Party Address</Label>
            <Input id="notifyPartyAddress" name="notifyPartyAddress" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2">
            <Label htmlFor="pol">POL</Label>
            <Input
              id="pol"
              name="pol"
              required
              value={prefill.pol}
              onChange={(e) => updatePrefill("pol", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pod">POD</Label>
            <Input
              id="pod"
              name="pod"
              required
              value={prefill.pod}
              onChange={(e) => updatePrefill("pod", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="commodity">Commodity</Label>
            <Input
              id="commodity"
              name="commodity"
              required
              value={prefill.commodity}
              onChange={(e) => updatePrefill("commodity", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsCode">HS Code</Label>
            <Input
              id="hsCode"
              name="hsCode"
              value={prefill.hsCode}
              onChange={(e) => updatePrefill("hsCode", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="packageCount">Package Count</Label>
            <Input
              id="packageCount"
              name="packageCount"
              type="number"
              value={prefill.packageCount}
              onChange={(e) => updatePrefill("packageCount", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (KG)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.01"
              value={prefill.weight}
              onChange={(e) => updatePrefill("weight", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marks">Marks</Label>
            <Input id="marks" name="marks" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="containerNumber">Container Number</Label>
            <Input
              id="containerNumber"
              name="containerNumber"
              value={prefill.containerNumber}
              onChange={(e) => updatePrefill("containerNumber", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sealNumber">Seal Number</Label>
            <Input
              id="sealNumber"
              name="sealNumber"
              value={prefill.sealNumber}
              onChange={(e) => updatePrefill("sealNumber", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2">
            <Label htmlFor="freightTerms">Freight Terms</Label>
            <Input id="freightTerms" name="freightTerms" placeholder="Prepaid" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="incoterms">Incoterms</Label>
            <Input id="incoterms" name="incoterms" placeholder="FOB" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingLine">Shipping Line</Label>
            <Input
              id="shippingLine"
              name="shippingLine"
              value={prefill.shippingLine}
              onChange={(e) => updatePrefill("shippingLine", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vessel">Vessel</Label>
            <Input
              id="vessel"
              name="vessel"
              value={prefill.vessel}
              onChange={(e) => updatePrefill("vessel", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voyage">Voyage</Label>
            <Input id="voyage" name="voyage" />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Create Shipping Instruction"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
