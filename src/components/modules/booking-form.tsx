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
import { Card, CardContent } from "@/components/ui/card";
import type { Customer } from "@prisma/client";
import { api, ApiError } from "@/lib/api/client";
import type { BookingImportValues } from "@/lib/booking-import";

export function BookingForm({
  customers,
  initialValues,
  initialCustomerId,
}: {
  customers: Customer[];
  initialValues?: BookingImportValues;
  initialCustomerId?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState(initialCustomerId ?? "");

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<{ id: string }>("/api/bookings", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      router.push(`/bookings/${data.id}`);
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
      customerId,
      exporterName: formData.get("exporterName") || undefined,
      buyerName: formData.get("buyerName") || undefined,
      pol: formData.get("pol") || undefined,
      pod: formData.get("pod") || undefined,
      shippingLine: formData.get("shippingLine") || undefined,
      vessel: formData.get("vessel") || undefined,
      etd: formData.get("etd") || undefined,
      eta: formData.get("eta") || undefined,
      freightTerms: formData.get("freightTerms") || undefined,
      commodity: formData.get("commodity") || undefined,
      deliveryDate: formData.get("deliveryDate") || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {initialValues && (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
          Fields below were auto-filled from your imported file — review and correct anything before creating the booking.
        </p>
      )}
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customerId">Customer</Label>
            <Select value={customerId} onValueChange={(v) => v && setCustomerId(v)}>
              <SelectTrigger id="customerId" className="w-full">
                <SelectValue placeholder="Select a customer">
                  {(value: string | null) => customers.find((c) => c.id === value)?.name ?? null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exporterName">Exporter Name</Label>
            <Input id="exporterName" name="exporterName" defaultValue={initialValues?.exporterName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyerName">Buyer Name</Label>
            <Input id="buyerName" name="buyerName" defaultValue={initialValues?.buyerName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pol">POL (Port of Loading)</Label>
            <Input id="pol" name="pol" placeholder="Mundra, India" defaultValue={initialValues?.pol} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pod">POD (Port of Discharge)</Label>
            <Input id="pod" name="pod" defaultValue={initialValues?.pod} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingLine">Shipping Line</Label>
            <Input id="shippingLine" name="shippingLine" defaultValue={initialValues?.shippingLine} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vessel">Vessel</Label>
            <Input id="vessel" name="vessel" defaultValue={initialValues?.vessel} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etd">ETD</Label>
            <Input id="etd" name="etd" type="date" defaultValue={initialValues?.etd} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eta">ETA</Label>
            <Input id="eta" name="eta" type="date" defaultValue={initialValues?.eta} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="freightTerms">Freight Terms</Label>
            <Input id="freightTerms" name="freightTerms" placeholder="Prepaid" defaultValue={initialValues?.freightTerms} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commodity">Commodity</Label>
            <Input id="commodity" name="commodity" defaultValue={initialValues?.commodity} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input id="deliveryDate" name="deliveryDate" type="date" defaultValue={initialValues?.deliveryDate} />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending || !customerId}>
          {mutation.isPending ? "Creating…" : "Create Booking"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
