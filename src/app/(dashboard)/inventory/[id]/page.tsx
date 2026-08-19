"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Pencil, Trash2, TrendingDown, TrendingUp,
  Clock, Package,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api/client";

type MovementType = "IN" | "OUT" | "RETURN" | "DAMAGED" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

interface Movement {
  id: string;
  type: MovementType;
  quantity: string;
  runningBalance: string;
  referenceNumber: string | null;
  reason: string | null;
  createdAt: string;
  recordedBy: { name: string } | null;
  booking: { id: string; bookingNumber: string } | null;
}

interface Analytics {
  consumed90d: number;
  avgMonthlyConsumption: number;
  daysRemaining: number | null;
}

interface ItemDetail {
  id: string;
  name: string;
  sku: string | null;
  hsnCode: string | null;
  category: string | null;
  unit: string;
  currentStock: string;
  reorderLevel: string | null;
  unitValue: string | null;
  location: string | null;
  supplier: string | null;
  supplierContact: string | null;
  notes: string | null;
  createdBy: { name: string } | null;
  movements: Movement[];
  analytics: Analytics;
}

interface BookingOption {
  id: string;
  bookingNumber: string;
  customer: { name: string };
}

const MOVEMENT_CONFIG: Record<MovementType, { label: string; adds: boolean; color: string }> = {
  IN:            { label: "Stock In",       adds: true,  color: "border-success/40 text-success" },
  RETURN:        { label: "Return",         adds: true,  color: "border-success/40 text-success" },
  ADJUSTMENT_IN: { label: "Adj. +",         adds: true,  color: "border-blue-400/40 text-blue-500" },
  OUT:           { label: "Stock Out",      adds: false, color: "border-warning/40 text-warning" },
  DAMAGED:       { label: "Damaged",        adds: false, color: "border-destructive/40 text-destructive" },
  ADJUSTMENT_OUT:{ label: "Adj. −",         adds: false, color: "border-blue-400/40 text-blue-500" },
};

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function InventoryDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [movementType, setMovementType] = React.useState<MovementType>("IN");
  const [bookingId, setBookingId] = React.useState("none");
  const formRef = React.useRef<HTMLFormElement>(null);

  const { data: item, isLoading } = useQuery({
    queryKey: ["inventory", params.id],
    queryFn: () => api.get<ItemDetail>(`/api/inventory/${params.id}`),
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingOption[]>("/api/bookings"),
  });

  const movementMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post(`/api/inventory/${params.id}/movements`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", params.id] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      toast.success("Movement recorded");
      setBookingId("none");
      formRef.current?.reset();
    },
    onError: (err) => {
      setApiError(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/inventory/${params.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item deleted");
      router.push("/inventory");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    },
  });

  function handleMovementSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiError(null);
    const fd = new FormData(e.currentTarget);
    movementMutation.mutate({
      type: movementType,
      quantity: fd.get("quantity"),
      referenceNumber: fd.get("referenceNumber") || undefined,
      reason: fd.get("reason") || undefined,
      bookingId: bookingId !== "none" ? bookingId : undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!item) {
    return <p className="py-16 text-center text-sm text-destructive">Inventory item not found.</p>;
  }

  const isLow = item.reorderLevel != null && Number(item.currentStock) <= Number(item.reorderLevel);
  const stockValue =
    item.unitValue ? Number(item.currentStock) * Number(item.unitValue) : null;
  const cfg = MOVEMENT_CONFIG[movementType];

  return (
    <div>
      <PageHeader
        title={item.name}
        description={[item.sku && `SKU: ${item.sku}`, item.category].filter(Boolean).join(" · ") || undefined}
        actions={
          <div className="flex items-center gap-2">
            {isLow && (
              <Badge variant="outline" className="border-warning/40 text-warning">
                Low stock
              </Badge>
            )}
            <Button variant="outline" size="icon" nativeButton={false} render={<Link href={`/inventory/${item.id}/edit`} />}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={item.movements.length > 0 || deleteMutation.isPending}
              title={item.movements.length > 0 ? "Can't delete an item with movement history" : "Delete item"}
              onClick={() => {
                if (confirm(`Delete "${item.name}"? This can't be undone.`)) deleteMutation.mutate();
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Stock card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-semibold tabular-nums">
                {item.currentStock}{" "}
                <span className="text-base font-normal text-muted-foreground">{item.unit}</span>
              </p>
              {stockValue != null && (
                <p className="text-sm font-medium text-muted-foreground">
                  Value: ₹{numberFormat.format(stockValue)}
                  <span className="ml-1 font-normal">
                    (₹{item.unitValue}/{item.unit})
                  </span>
                </p>
              )}
              {item.reorderLevel != null && (
                <p className={`text-sm ${isLow ? "font-semibold text-warning" : "text-muted-foreground"}`}>
                  Reorder at: {item.reorderLevel} {item.unit}
                </p>
              )}
              <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                {item.hsnCode && <p>HSN: {item.hsnCode}</p>}
                {item.location && <p>Location: {item.location}</p>}
                {item.supplier && <p>Supplier: {item.supplier}</p>}
                {item.supplierContact && <p>Contact: {item.supplierContact}</p>}
                {item.notes && <p className="italic">{item.notes}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Analytics card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Analytics (90 days)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Consumed (90d)</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {numberFormat.format(item.analytics.consumed90d)} {item.unit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg. monthly consumption</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {numberFormat.format(item.analytics.avgMonthlyConsumption)} {item.unit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated days remaining</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {item.analytics.daysRemaining != null
                      ? `~${item.analytics.daysRemaining} days`
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movement form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Record Movement</CardTitle>
            </CardHeader>
            <CardContent>
              <form ref={formRef} onSubmit={handleMovementSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Movement Type</Label>
                  <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Stock In — purchase / receipt</SelectItem>
                      <SelectItem value="RETURN">Return — goods returned to warehouse</SelectItem>
                      <SelectItem value="ADJUSTMENT_IN">Adjustment + — stock take increase</SelectItem>
                      <SelectItem value="OUT">Stock Out — dispatched / used</SelectItem>
                      <SelectItem value="DAMAGED">Damaged — write off</SelectItem>
                      <SelectItem value="ADJUSTMENT_OUT">Adjustment − — stock take decrease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantity ({item.unit})
                  </Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    placeholder={cfg.adds ? "Amount to add" : "Amount to deduct"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Reference No. (optional)</Label>
                  <Input
                    id="referenceNumber"
                    name="referenceNumber"
                    placeholder="PO no., GRN no., invoice no."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookingId">Link to Booking (optional)</Label>
                  <Select value={bookingId} onValueChange={(v) => v && setBookingId(v)}>
                    <SelectTrigger id="bookingId" className="w-full">
                      <SelectValue placeholder="No booking">
                        {(value: string | null) => {
                          if (!value || value === "none") return "No booking";
                          const b = bookings?.find((b) => b.id === value);
                          return b ? `${b.bookingNumber} · ${b.customer.name}` : null;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No booking</SelectItem>
                      {bookings?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.bookingNumber} · {b.customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Notes</Label>
                  <Textarea id="reason" name="reason" rows={2} placeholder="Optional notes" />
                </div>

                {apiError && <p className="text-sm text-destructive">{apiError}</p>}

                <Button type="submit" disabled={movementMutation.isPending} className="w-full">
                  {movementMutation.isPending
                    ? "Recording…"
                    : `Record ${MOVEMENT_CONFIG[movementType].label}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column — movement history */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Package className="size-4" />
                Movement History
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  Last {item.movements.length} movements
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {item.movements.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No stock movements recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Ref.</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.movements.map((m) => {
                        const mcfg = MOVEMENT_CONFIG[m.type];
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {new Date(m.createdAt).toLocaleString("en-IN", {
                                day: "numeric", month: "short", year: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={mcfg.color}>
                                {mcfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              <span className={mcfg.adds ? "text-success" : "text-destructive"}>
                                {mcfg.adds ? "+" : "−"}{m.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {m.runningBalance} {item.unit}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {m.referenceNumber ?? "—"}
                            </TableCell>
                            <TableCell>
                              {m.booking ? (
                                <Link href={`/bookings/${m.booking.id}`} className="text-xs text-brand hover:underline">
                                  {m.booking.bookingNumber}
                                </Link>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                              {m.reason ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {m.recordedBy?.name ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function InventoryDetailPage() {
  return <InventoryDetailPageContent />;
}
