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
import type { Customer } from "@prisma/client";
import type { ActionResult } from "@/lib/actions/invoices";
import type { SerializedInvoice } from "@/lib/serializers/invoice";
import { suggestHsnCode } from "@/lib/ai/field-suggestions";

type InvoiceFormAction = (
  prev: ActionResult,
  formData: FormData
) => Promise<ActionResult>;

export function InvoiceForm({
  customers,
  invoice,
  action,
}: {
  customers: Customer[];
  invoice?: SerializedInvoice;
  action: InvoiceFormAction;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, {});
  const [customerId, setCustomerId] = React.useState(invoice?.customerId ?? "");
  const [buyerName, setBuyerName] = React.useState(invoice?.buyerName ?? "");
  const [buyerAddress, setBuyerAddress] = React.useState(invoice?.buyerAddress ?? "");
  const [exportCountry, setExportCountry] = React.useState(invoice?.exportCountry ?? "");
  const [material, setMaterial] = React.useState(invoice?.material ?? "");
  const [hsnCode, setHsnCode] = React.useState(invoice?.hsnCode ?? "");

  const hsnSuggestion = React.useMemo(() => suggestHsnCode(material), [material]);

  function handleCustomerChange(id: string | null) {
    if (!id) return;
    setCustomerId(id);
    const customer = customers.find((c) => c.id === id);
    if (customer && !invoice) {
      setBuyerName(customer.name);
      setBuyerAddress([customer.address, customer.city].filter(Boolean).join(", "));
      setExportCountry(customer.country ?? "");
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              name="invoiceNumber"
              required
              defaultValue={invoice?.invoiceNumber}
              placeholder="INV-2026-0007"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Date</Label>
            <Input
              id="invoiceDate"
              name="invoiceDate"
              type="date"
              required
              defaultValue={
                invoice ? new Date(invoice.invoiceDate).toISOString().slice(0, 10) : todayStr
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customerId">Customer</Label>
            <input type="hidden" name="customerId" value={customerId} />
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger id="customerId" className="w-full">
                <SelectValue placeholder="Select a customer">
                  {(value: string | null) => {
                    const selected = customers.find((c) => c.id === value);
                    return selected ? `${selected.name} · ${selected.country}` : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyerName">Buyer Name</Label>
            <Input
              id="buyerName"
              name="buyerName"
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poNumber">PO Number</Label>
            <Input id="poNumber" name="poNumber" defaultValue={invoice?.poNumber ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="buyerAddress">Buyer Address</Label>
            <Input
              id="buyerAddress"
              name="buyerAddress"
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exportCountry">Export Country</Label>
            <Input
              id="exportCountry"
              name="exportCountry"
              required
              value={exportCountry}
              onChange={(e) => setExportCountry(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3 py-1">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="material">Material</Label>
            <Input
              id="material"
              name="material"
              required
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Granite Slabs - Alaska White"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsnCode">HSN Code</Label>
            <Input
              id="hsnCode"
              name="hsnCode"
              required
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
            />
            {hsnSuggestion && hsnCode !== hsnSuggestion.code && (
              <button
                type="button"
                onClick={() => setHsnCode(hsnSuggestion.code)}
                className="text-left text-xs text-muted-foreground hover:text-brand"
              >
                Suggested: <span className="font-medium">{hsnSuggestion.code}</span> (
                {hsnSuggestion.label}) — click to use
              </button>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfBlocks">Number of Blocks</Label>
            <Input
              id="numberOfBlocks"
              name="numberOfBlocks"
              type="number"
              defaultValue={invoice?.numberOfBlocks ?? undefined}
            />
          </div>
          <div />
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="0.01"
              required
              defaultValue={invoice ? Number(invoice.quantity) : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantityUnit">Quantity Unit</Label>
            <Input id="quantityUnit" name="quantityUnit" defaultValue={invoice?.quantityUnit ?? "MT"} />
          </div>
          <div />
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (KG)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.01"
              required
              defaultValue={invoice ? Number(invoice.weight) : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightUnit">Weight Unit</Label>
            <Input id="weightUnit" name="weightUnit" defaultValue={invoice?.weightUnit ?? "KG"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-3 py-1">
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Unit Price</Label>
            <Input
              id="unitPrice"
              name="unitPrice"
              type="number"
              step="0.01"
              required
              defaultValue={invoice ? Number(invoice.unitPrice) : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue={invoice?.currency ?? "USD"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstPercent">GST %</Label>
            <Input
              id="gstPercent"
              name="gstPercent"
              type="number"
              step="0.01"
              defaultValue={invoice ? Number(invoice.gstPercent) : 0}
            />
          </div>
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : invoice ? "Save Changes" : "Create Invoice"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
