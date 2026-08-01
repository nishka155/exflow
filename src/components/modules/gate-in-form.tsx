"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { FactoryStuffing, Booking, Customer } from "@prisma/client";
import { api, ApiError } from "@/lib/api/client";

type StuffingOption = FactoryStuffing & { booking: Booking & { customer: Customer } };

export function GateInForm({ stuffings }: { stuffings: StuffingOption[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [factoryStuffingId, setFactoryStuffingId] = React.useState("");
  const [form13Updated, setForm13Updated] = React.useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<{ id: string }>("/api/gate-in", payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["gate-ins"] });
      router.push(`/gate-in/${data.id}`);
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
      factoryStuffingId,
      gateInDate: formData.get("gateInDate"),
      terminal: formData.get("terminal"),
      yard: formData.get("yard") || undefined,
      vehicleNumber: formData.get("vehicleNumber") || undefined,
      form13Updated,
      gatePass: formData.get("gatePass") || undefined,
      eirNumber: formData.get("eirNumber") || undefined,
      remarks: formData.get("remarks") || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="factoryStuffingId">Container</Label>
            <Select
              value={factoryStuffingId}
              onValueChange={(v) => v && setFactoryStuffingId(v)}
            >
              <SelectTrigger id="factoryStuffingId" className="w-full">
                <SelectValue placeholder="Select a stuffed container">
                  {(value: string | null) => {
                    const s = stuffings.find((s) => s.id === value);
                    return s
                      ? `${s.containerNumber} · ${s.booking.bookingNumber} · ${s.booking.customer.name}`
                      : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stuffings.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.containerNumber} · {s.booking.bookingNumber} · {s.booking.customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gateInDate">Gate In Date</Label>
            <Input id="gateInDate" name="gateInDate" type="date" required defaultValue={todayStr} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terminal">Terminal</Label>
            <Input id="terminal" name="terminal" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yard">Yard</Label>
            <Input id="yard" name="yard" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <Input id="vehicleNumber" name="vehicleNumber" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gatePass">Gate Pass</Label>
            <Input id="gatePass" name="gatePass" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eirNumber">EIR Number</Label>
            <Input id="eirNumber" name="eirNumber" />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="form13Updated"
              checked={form13Updated}
              onCheckedChange={(v) => setForm13Updated(v === true)}
            />
            <Label htmlFor="form13Updated" className="font-normal">
              Form 13 Updated
            </Label>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input id="remarks" name="remarks" />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Create Gate In Record"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
