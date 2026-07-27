"use client";

import * as React from "react";
import { useActionState } from "react";
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
import type { Transporter, Shipment, Customer, Invoice } from "@prisma/client";
import { createDispatchAction, type ActionResult } from "@/lib/actions/dispatches";

type ShipmentOption = Shipment & { customer: Customer; invoice: Invoice | null };

export function DispatchForm({
  shipments,
  transporters,
  defaultShipmentId,
}: {
  shipments: ShipmentOption[];
  transporters: Transporter[];
  defaultShipmentId?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createDispatchAction,
    {}
  );
  const [shipmentId, setShipmentId] = React.useState(defaultShipmentId ?? "");
  const [transporterId, setTransporterId] = React.useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shipmentId">Shipment / Invoice</Label>
            <input type="hidden" name="shipmentId" value={shipmentId} />
            <Select value={shipmentId} onValueChange={(v) => v && setShipmentId(v)}>
              <SelectTrigger id="shipmentId" className="w-full">
                <SelectValue placeholder="Select a shipment">
                  {(value: string | null) => {
                    const s = shipments.find((s) => s.id === value);
                    return s
                      ? `${s.shipmentNumber} · ${s.customer.name}${s.invoice ? ` · ${s.invoice.invoiceNumber}` : ""}`
                      : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shipmentNumber} · {s.customer.name}
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
            <Label htmlFor="driverName">Driver Name</Label>
            <Input id="driverName" name="driverName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverMobile">Driver Mobile</Label>
            <Input id="driverMobile" name="driverMobile" required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="transporterId">Transporter</Label>
            <input type="hidden" name="transporterId" value={transporterId} />
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

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create Dispatch"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
