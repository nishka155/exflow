"use client";

import { PageHeader } from "@/components/shared/page-header";
import { InventoryItemForm } from "@/components/modules/inventory-item-form";

function NewInventoryItemPageContent() {
  return (
    <div>
      <PageHeader title="New Inventory Item" description="Add stock exporters need to track before it's booked." />
      <InventoryItemForm />
    </div>
  );
}

export default function NewInventoryItemPage() {
  return <NewInventoryItemPageContent />;
}
