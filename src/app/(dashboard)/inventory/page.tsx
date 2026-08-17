"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Warehouse, Loader2, AlertTriangle, Boxes, IndianRupee } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow } from "@/components/shared/clickable-table-row";
import { api } from "@/lib/api/client";

interface InventoryListItem {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  currentStock: string;
  reorderLevel: string | null;
  location: string | null;
}

interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  totalValue: number;
}

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function InventoryPageContent() {
  const [search, setSearch] = React.useState("");

  const { data: items, isLoading, error } = useQuery({
    queryKey: ["inventory", { search }],
    queryFn: () =>
      api.get<InventoryListItem[]>(
        `/api/inventory${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });

  const { data: summary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => api.get<InventorySummary>("/api/inventory/summary"),
  });

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Warehouse stock exporters draw on when booking and stuffing containers."
        actions={
          <Button nativeButton={false} render={<Link href="/inventory/new" />}>
            <Plus />
            New Item
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Items" value={summary?.totalItems ?? "—"} icon={Boxes} />
        <StatCard
          label="Low Stock"
          value={summary?.lowStockCount ?? "—"}
          icon={AlertTriangle}
          tone={summary && summary.lowStockCount > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Total Stock Value"
          value={summary ? numberFormat.format(summary.totalValue) : "—"}
          icon={IndianRupee}
        />
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by name, SKU, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load inventory. Please try again.
        </p>
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={search ? "No items match your search" : "No inventory items yet"}
          description={
            search
              ? undefined
              : "Add stock items to track what's available before you book and stuff a container."
          }
          action={
            !search && (
              <Button nativeButton={false} render={<Link href="/inventory/new" />}>
                <Plus />
                New Item
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isLow =
                  item.reorderLevel != null &&
                  Number(item.currentStock) <= Number(item.reorderLevel);
                return (
                  <ClickableTableRow key={item.id} href={`/inventory/${item.id}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku ?? "—"}</TableCell>
                    <TableCell>{item.category ?? "—"}</TableCell>
                    <TableCell>{item.location ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-2">
                        {item.currentStock} {item.unit}
                        {isLow && (
                          <Badge variant="outline" className="border-warning/40 text-warning">
                            Low
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                  </ClickableTableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return <InventoryPageContent />;
}
