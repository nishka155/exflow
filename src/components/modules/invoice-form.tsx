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
import { api, ApiError } from "@/lib/api/client";
import { suggestHsnCode } from "@/lib/ai/field-suggestions";

interface Customer {
  id: string;
  name: string;
  country: string | null;
  address: string | null;
  city: string | null;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  buyerName: string;
  buyerAddress: string | null;
  poNumber: string | null;
  material: string;
  quantity: number;
  quantityUnit: string;
  weight: number;
  weightUnit: string;
  numberOfBlocks: number | null;
  hsnCode: string;
  unitPrice: number;
  currency: string;
  gstPercent: number;
  exportCountry: string;
}

export function InvoiceForm({
  customers,
  invoice,
  mode,
}: {
  customers: Customer[];
  invoice?: InvoiceRecord;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

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

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (mode === "create") {
        return api.post<InvoiceRecord>("/api/invoices", payload);
      }
      return api.put<InvoiceRecord>(`/api/invoices/${invoice!.id}`, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
      router.push(`/invoices/${data.id}`);
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
      invoiceNumber: formData.get("invoiceNumber"),
      invoiceDate: formData.get("invoiceDate"),
      customerId,
      buyerName,
      buyerAddress: buyerAddress || undefined,
      poNumber: formData.get("poNumber") || undefined,
      material,
      quantity: formData.get("quantity"),
      quantityUnit: formData.get("quantityUnit") || "MT",
      weight: formData.get("weight"),
      weightUnit: formData.get("weightUnit") || "KG",
      numberOfBlocks: formData.get("numberOfBlocks") || undefined,
      hsnCode,
      unitPrice: formData.get("unitPrice"),
      currency: formData.get("currency") || "USD",
      gstPercent: formData.get("gstPercent") || 0,
      exportCountry,
    });
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              defaultValue={invoice ? invoice.invoiceDate.slice(0, 10) : todayStr}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customerId">Customer</Label>
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
              defaultValue={invoice?.quantity}
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
              defaultValue={invoice?.weight}
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
              defaultValue={invoice?.unitPrice}
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
              defaultValue={invoice ? invoice.gstPercent : 0}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : invoice ? "Save Changes" : "Create Invoice"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
