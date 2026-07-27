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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Shipment,
  Customer,
  Invoice,
  FactoryStuffing,
  GateIn,
} from "@prisma/client";
import {
  createShippingInstructionAction,
  type ActionResult,
} from "@/lib/actions/shipping-instructions";

type ShipmentOption = Shipment & {
  customer: Customer;
  invoice: Invoice | null;
  factoryStuffing: FactoryStuffing | null;
  gateIn: GateIn | null;
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
}

function buildPrefill(shipment: ShipmentOption, organizationName: string): Prefill {
  return {
    consignorName: organizationName,
    consigneeName: shipment.customer.name,
    consigneeAddress: [shipment.customer.address, shipment.customer.city, shipment.customer.country]
      .filter(Boolean)
      .join(", "),
    pol: shipment.factoryStuffing?.pol ?? "",
    pod: shipment.factoryStuffing?.pod ?? "",
    commodity: shipment.invoice?.material ?? "",
    hsCode: shipment.invoice?.hsnCode ?? "",
    packageCount: shipment.factoryStuffing?.numberOfBoxes?.toString() ?? "",
    weight: shipment.invoice ? String(shipment.invoice.weight) : "",
    containerNumber: shipment.factoryStuffing?.containerNumber ?? "",
    sealNumber: shipment.factoryStuffing?.sealNumber ?? "",
  };
}

export function ShippingInstructionForm({
  shipments,
  organizationName,
}: {
  shipments: ShipmentOption[];
  organizationName: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createShippingInstructionAction,
    {}
  );
  const [shipmentId, setShipmentId] = React.useState("");
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
  });

  function handleShipmentChange(id: string) {
    setShipmentId(id);
    const shipment = shipments.find((s) => s.id === id);
    if (shipment) setPrefill(buildPrefill(shipment, organizationName));
  }

  function updatePrefill<K extends keyof Prefill>(key: K, value: Prefill[K]) {
    setPrefill((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Source Shipment</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="hidden" name="shipmentId" value={shipmentId} />
          <Select value={shipmentId} onValueChange={(v) => v && handleShipmentChange(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a shipment (auto-fills fields below)">
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
            <Input id="shippingLine" name="shippingLine" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vessel">Vessel</Label>
            <Input id="vessel" name="vessel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voyage">Voyage</Label>
            <Input id="voyage" name="voyage" />
          </div>
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create Shipping Instruction"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
