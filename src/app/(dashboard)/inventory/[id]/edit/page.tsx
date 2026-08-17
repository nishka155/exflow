"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { InventoryItemForm } from "@/components/modules/inventory-item-form";
import { api } from "@/lib/api/client";

interface ItemDetail {
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

function EditInventoryItemPageContent() {
  const params = useParams<{ id: string }>();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["inventory", params.id],
    queryFn: () => api.get<ItemDetail>(`/api/inventory/${params.id}`),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !item) {
    return <p className="py-16 text-center text-sm text-destructive">Inventory item not found.</p>;
  }

  return (
    <div>
      <PageHeader title={`Edit ${item.name}`} />
      <InventoryItemForm item={item} />
    </div>
  );
}

export default function EditInventoryItemPage() {
  return <EditInventoryItemPageContent />;
}
