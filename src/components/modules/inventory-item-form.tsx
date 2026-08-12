"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";

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
  notes: string | null;
}

export function InventoryItemForm({ item }: { item?: InventoryItemRecord }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => {
      if (item) return api.put<InventoryItemRecord>(`/api/inventory/${item.id}`, payload);
      return api.post<InventoryItemRecord>("/api/inventory", payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      router.push(`/inventory/${data.id}`);
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
      name: formData.get("name"),
      sku: formData.get("sku") || undefined,
      hsnCode: formData.get("hsnCode") || undefined,
      category: formData.get("category") || undefined,
      unit: formData.get("unit"),
      reorderLevel: formData.get("reorderLevel") || undefined,
      unitValue: formData.get("unitValue") || undefined,
      location: formData.get("location") || undefined,
      notes: formData.get("notes") || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-1">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Item Name</Label>
            <Input id="name" name="name" required defaultValue={item?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU / Code</Label>
            <Input id="sku" name="sku" defaultValue={item?.sku ?? ""} />
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
              placeholder="e.g. Raw Material, Finished Goods"
              defaultValue={item?.category ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              name="unit"
              required
              placeholder="e.g. KG, MT, PCS, CTN"
              defaultValue={item?.unit ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reorderLevel">Reorder Level</Label>
            <Input
              id="reorderLevel"
              name="reorderLevel"
              type="number"
              step="0.001"
              min="0"
              placeholder="Alert below this quantity"
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
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={item?.notes ?? ""} />
          </div>
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
