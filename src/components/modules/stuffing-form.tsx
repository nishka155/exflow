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
import { createStuffingAction, type ActionResult } from "@/lib/actions/stuffing";

type ShipmentOption = Shipment & { customer: Customer; invoice: Invoice | null };

const CONTAINER_SIZES = [
  { value: "FT20", label: "20 FT" },
  { value: "FT40", label: "40 FT" },
  { value: "FT40_HC", label: "40 HC" },
];

export function StuffingForm({
  shipments,
  transporters,
}: {
  shipments: ShipmentOption[];
  transporters: Transporter[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createStuffingAction,
    {}
  );
  const [shipmentId, setShipmentId] = React.useState("");
  const [containerSize, setContainerSize] = React.useState("FT40");
  const [transporterId, setTransporterId] = React.useState("");

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shipmentId">Shipment</Label>
            <input type="hidden" name="shipmentId" value={shipmentId} />
            <Select value={shipmentId} onValueChange={(v) => v && setShipmentId(v)}>
              <SelectTrigger id="shipmentId" className="w-full">
                <SelectValue placeholder="Select a shipment">
                  {(value: string | null) => {
                    const s = shipments.find((s) => s.id === value);
                    return s ? `${s.shipmentNumber} · ${s.customer.name}` : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shipmentNumber} · {s.customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="containerNumber">Container Number</Label>
            <Input id="containerNumber" name="containerNumber" required placeholder="TCLU1234567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="containerSize">Container Size</Label>
            <input type="hidden" name="containerSize" value={containerSize} />
            <Select value={containerSize} onValueChange={(v) => v && setContainerSize(v)}>
              <SelectTrigger id="containerSize" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    CONTAINER_SIZES.find((c) => c.value === value)?.label ?? null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_SIZES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sealNumber">Seal Number</Label>
            <Input id="sealNumber" name="sealNumber" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" name="contactNumber" />
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
            <Label htmlFor="pol">POL (Port of Loading)</Label>
            <Input id="pol" name="pol" required placeholder="Mundra, India" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pod">POD (Port of Discharge)</Label>
            <Input id="pod" name="pod" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfBoxes">Number of Boxes</Label>
            <Input id="numberOfBoxes" name="numberOfBoxes" type="number" />
          </div>
          <div />
          <div className="space-y-2">
            <Label htmlFor="grossWeight">Gross Weight (KG)</Label>
            <Input id="grossWeight" name="grossWeight" type="number" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="netWeight">Net Weight (KG)</Label>
            <Input id="netWeight" name="netWeight" type="number" step="0.01" />
          </div>
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create Stuffing Record"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
