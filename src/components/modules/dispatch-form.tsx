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
import type { Transporter, Booking, Customer, Invoice } from "@prisma/client";
import { api, ApiError } from "@/lib/api/client";

type BookingOption = Booking & { customer: Customer; invoice: Invoice | null };

export function DispatchForm({
  bookings,
  transporters,
  defaultBookingId,
}: {
  bookings: BookingOption[];
  transporters: Transporter[];
  defaultBookingId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [bookingId, setBookingId] = React.useState(defaultBookingId ?? "");
  const [transporterId, setTransporterId] = React.useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<{ id: string }>("/api/dispatches", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      router.push(`/dispatches/${data.id}`);
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
      truckNumber: formData.get("truckNumber"),
      driverName: formData.get("driverName"),
      driverMobile: formData.get("driverMobile"),
      transporterId,
      material: formData.get("material"),
      referenceNumber: formData.get("referenceNumber") || undefined,
      lrNumber: formData.get("lrNumber") || undefined,
      numberOfWeights: formData.get("numberOfWeights") || undefined,
      numberOfBlocks: formData.get("numberOfBlocks") || undefined,
      dispatchDate: formData.get("dispatchDate"),
      expectedFactoryArrival: formData.get("expectedFactoryArrival"),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bookingId">Booking / Invoice</Label>
            <Select value={bookingId} onValueChange={(v) => v && setBookingId(v)}>
              <SelectTrigger id="bookingId" className="w-full">
                <SelectValue placeholder="Select a booking">
                  {(value: string | null) => {
                    const s = bookings.find((s) => s.id === value);
                    return s
                      ? `${s.bookingNumber} · ${s.customer.name}${s.invoice ? ` · ${s.invoice.invoiceNumber}` : ""}`
                      : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bookings.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.bookingNumber} · {s.customer.name}
                    {s.invoice ? ` · ${s.invoice.invoiceNumber}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="truckNumber">Truck Number</Label>
            <Input id="truckNumber" name="truckNumber" required placeholder="GJ-01-AB-1234" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input id="referenceNumber" name="referenceNumber" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lrNumber">LR Number</Label>
            <Input id="lrNumber" name="lrNumber" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverName">Driver Name</Label>
            <Input id="driverName" name="driverName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverMobile">Driver Mobile</Label>
            <Input id="driverMobile" name="driverMobile" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="transporterId">Transporter</Label>
            <Select value={transporterId} onValueChange={(v) => v && setTransporterId(v)}>
              <SelectTrigger id="transporterId" className="w-full">
                <SelectValue placeholder="Select a transporter">
                  {(value: string | null) =>
                    transporters.find((t) => t.id === value)?.name ?? null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {transporters.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Input id="material" name="material" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfBlocks">Number of Blocks</Label>
            <Input id="numberOfBlocks" name="numberOfBlocks" type="number" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfWeights">Weight</Label>
            <Input id="numberOfWeights" name="numberOfWeights" type="number" step="0.01" />
          </div>
          <div />
          <div className="space-y-2">
            <Label htmlFor="dispatchDate">Dispatch Date</Label>
            <Input
              id="dispatchDate"
              name="dispatchDate"
              type="date"
              required
              defaultValue={todayStr}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedFactoryArrival">Expected Factory Arrival</Label>
            <Input id="expectedFactoryArrival" name="expectedFactoryArrival" type="date" required />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Create Dispatch"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
