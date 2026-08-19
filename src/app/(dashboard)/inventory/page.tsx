"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Warehouse, Loader2, AlertTriangle, Boxes, IndianRupee,
  ChevronLeft, ChevronRight, Upload,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClickableTableRow } from "@/components/shared/clickable-table-row";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";

interface InventoryListItem {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  currentStock: string;
  reorderLevel: string | null;
  unitValue: string | null;
  location: string | null;
  supplier: string | null;
}

interface InventoryListResponse {
  items: InventoryListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  totalValue: number;
}

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const PAGE_SIZE = 50;

function InventoryPageContent() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [lowStockOnly, setLowStockOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [debouncedSearch, category, lowStockOnly]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (category !== "all") params.set("category", category);
  if (lowStockOnly) params.set("lowStock", "true");
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory", { search: debouncedSearch, category, lowStockOnly, page }],
    queryFn: () => api.get<InventoryListResponse>(`/api/inventory?${params}`),
  });

  const { data: summary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => api.get<InventorySummary>("/api/inventory/summary"),
  });

  const { data: categories } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: () => api.get<string[]>("/api/inventory/categories"),
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const hasFilters = debouncedSearch || category !== "all" || lowStockOnly;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Warehouse stock exporters draw on when booking and stuffing containers."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/inventory/import" />}>
              <Upload className="size-4" />
              Import
            </Button>
            <Button nativeButton={false} render={<Link href="/inventory/new" />}>
              <Plus />
              New Item
            </Button>
          </div>
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
          value={summary ? `₹${numberFormat.format(summary.totalValue)}` : "—"}
          icon={IndianRupee}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, SKU, category, supplier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {categories && categories.length > 0 && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Switch
            id="lowStock"
            checked={lowStockOnly}
            onCheckedChange={setLowStockOnly}
          />
          <Label htmlFor="lowStock" className="cursor-pointer text-sm">
            Low stock only
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load inventory. Please try again.
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={hasFilters ? "No items match your filters" : "No inventory items yet"}
          description={
            !hasFilters
              ? "Add stock items to track what's available before you book and stuff a container."
              : undefined
          }
          action={
            !hasFilters ? (
              <Button nativeButton={false} render={<Link href="/inventory/new" />}>
                <Plus />
                New Item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isLow =
                    item.reorderLevel != null &&
                    Number(item.currentStock) <= Number(item.reorderLevel);
                  const stockValue =
                    item.unitValue
                      ? Number(item.currentStock) * Number(item.unitValue)
                      : null;
                  return (
                    <ClickableTableRow key={item.id} href={`/inventory/${item.id}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.sku ?? "—"}</TableCell>
                      <TableCell>{item.category ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.location ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.supplier ?? "—"}</TableCell>
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
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {stockValue != null ? `₹${numberFormat.format(stockValue)}` : "—"}
                      </TableCell>
                    </ClickableTableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data!.total} items · page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return <InventoryPageContent />;
}
