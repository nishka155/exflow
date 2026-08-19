"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";

const COMMON_UNITS = ["KG", "MT", "PCS", "CTN", "BOX", "BAG", "LTR", "MTR", "SET", "ROLL"];

interface InventoryItemRecord {
  id: string;
  name: string;
  sku: string | null;
  hsnCode: string | null;
  category: string | null;
  unit: string;
  reorderLevel: string | null;
  unitValue: string | null;
  location: string | null;
  supplier: string | null;
  supplierContact: string | null;
  notes: string | null;
}

export function InventoryItemForm({ item }: { item?: InventoryItemRecord }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [unit, setUnit] = React.useState(item?.unit ?? "");
  const [category, setCategory] = React.useState(item?.category ?? "");

  const { data: categories } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: () => api.get<string[]>("/api/inventory/categories"),
  });

  function generateBarcode() {
    // Simple auto-generate: timestamp + random suffix
    return `INV-${Date.now().toString(36).toUpperCase()}`;
  }

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (item) return api.put<InventoryItemRecord>(`/api/inventory/${item.id}`, payload);
      return api.post<InventoryItemRecord>("/api/inventory", payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      router.push(`/inventory/${data.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      name: fd.get("name"),
      sku: fd.get("sku") || undefined,
      barcode: fd.get("barcode") || undefined,
      hsnCode: fd.get("hsnCode") || undefined,
      category: category || undefined,
      unit,
      reorderLevel: fd.get("reorderLevel") || undefined,
      unitValue: fd.get("unitValue") || undefined,
      location: fd.get("location") || undefined,
      supplier: fd.get("supplier") || undefined,
      supplierContact: fd.get("supplierContact") || undefined,
      notes: fd.get("notes") || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Item Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input id="name" name="name" required defaultValue={item?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU / Code</Label>
            <Input id="sku" name="sku" defaultValue={item?.sku ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                name="barcode"
                placeholder="Scan or type barcode"
                defaultValue={item?.barcode ?? ""}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  const input = (e.currentTarget.closest("div")!).querySelector("input") as HTMLInputElement;
                  input.value = generateBarcode();
                }}
              >
                Generate
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsnCode">HSN Code</Label>
            <Input id="hsnCode" name="hsnCode" defaultValue={item?.hsnCode ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              list="category-list"
              placeholder="e.g. Raw Material, Finished Goods"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="category-list">
              {categories?.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit *</Label>
            <Input
              id="unit"
              name="unit"
              list="unit-list"
              required
              placeholder="KG, MT, PCS…"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
            <datalist id="unit-list">
              {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reorderLevel">Reorder Level</Label>
            <Input
              id="reorderLevel"
              name="reorderLevel"
              type="number"
              step="0.001"
              min="0"
              placeholder={`Alert below this quantity (${unit || "unit"})`}
              defaultValue={item?.reorderLevel ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitValue">Value per Unit</Label>
            <Input
              id="unitValue"
              name="unitValue"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item?.unitValue ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="location">Warehouse / Location</Label>
            <Input id="location" name="location" defaultValue={item?.location ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Supplier</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier Name</Label>
            <Input id="supplier" name="supplier" defaultValue={item?.supplier ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplierContact">Supplier Contact</Label>
            <Input
              id="supplierContact"
              name="supplierContact"
              placeholder="Phone, email, or contact name"
              defaultValue={item?.supplierContact ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea id="notes" name="notes" defaultValue={item?.notes ?? ""} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : item ? "Save Changes" : "Add Item"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
