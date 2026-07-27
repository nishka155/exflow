"use client";

import * as React from "react";
import { useActionState } from "react";
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
import type { FactoryStuffing, Shipment, Customer } from "@prisma/client";
import { createGateInAction, type ActionResult } from "@/lib/actions/gate-in";

type StuffingOption = FactoryStuffing & { shipment: Shipment & { customer: Customer } };

export function GateInForm({ stuffings }: { stuffings: StuffingOption[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createGateInAction,
    {}
  );
  const [factoryStuffingId, setFactoryStuffingId] = React.useState("");
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="factoryStuffingId">Container</Label>
            <input type="hidden" name="factoryStuffingId" value={factoryStuffingId} />
            <Select
              value={factoryStuffingId}
              onValueChange={(v) => v && setFactoryStuffingId(v)}
            >
              <SelectTrigger id="factoryStuffingId" className="w-full">
                <SelectValue placeholder="Select a stuffed container">
                  {(value: string | null) => {
                    const s = stuffings.find((s) => s.id === value);
                    return s
                      ? `${s.containerNumber} · ${s.shipment.shipmentNumber} · ${s.shipment.customer.name}`
                      : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stuffings.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.containerNumber} · {s.shipment.shipmentNumber} · {s.shipment.customer.name}
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
            <Checkbox id="form13Updated" name="form13Updated" />
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

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create Gate In Record"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
