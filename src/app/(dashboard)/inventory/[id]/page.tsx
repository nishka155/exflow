"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api/client";

interface Movement {
  id: string;
  type: "IN" | "OUT";
  quantity: string;
  reason: string | null;
  createdAt: string;
  recordedBy: { name: string } | null;
  booking: { id: string; bookingNumber: string } | null;
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
  notes: string | null;
  createdBy: { name: string } | null;
  movements: Movement[];
}

interface BookingOption {
  id: string;
  bookingNumber: string;
  customer: { name: string };
}

function InventoryDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [movementType, setMovementType] = React.useState<"IN" | "OUT">("IN");
  const [bookingId, setBookingId] = React.useState("none");

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
      toast.success(movementType === "IN" ? "Stock added" : "Stock deducted");
      setBookingId("none");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
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
    setError(null);
    const formData = new FormData(e.currentTarget);
    movementMutation.mutate({
      type: movementType,
      quantity: formData.get("quantity"),
      reason: formData.get("reason") || undefined,
      bookingId: bookingId !== "none" ? bookingId : undefined,
    });
    e.currentTarget.reset();
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

  return (
    <div>
      <PageHeader
        title={item.name}
        description={[item.sku, item.category].filter(Boolean).join(" · ") || undefined}
        actions={
          <div className="flex items-center gap-2">
            {isLow && <Badge variant="outline" className="border-warning/40 text-warning">Low stock</Badge>}
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              render={<Link href={`/inventory/${item.id}/edit`} />}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={item.movements.length > 0 || deleteMutation.isPending}
              title={
                item.movements.length > 0
                  ? "Can't delete an item with stock movement history"
                  : "Delete item"
              }
              onClick={() => {
                if (confirm(`Delete "${item.name}"? This can't be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-3xl font-semibold tabular-nums">
                {item.currentStock} <span className="text-base font-normal text-muted-foreground">{item.unit}</span>
              </p>
              {item.reorderLevel != null && (
                <p className="text-sm text-muted-foreground">
                  Reorder level: {item.reorderLevel} {item.unit}
                </p>
              )}
              {item.unitValue != null && (
                <p className="text-sm text-muted-foreground">
                  Value: {(Number(item.currentStock) * Number(item.unitValue)).toLocaleString()} ({item.unitValue}/{item.unit})
                </p>
              )}
              {item.hsnCode && <p className="text-sm text-muted-foreground">HSN: {item.hsnCode}</p>}
              {item.location && <p className="text-sm text-muted-foreground">Location: {item.location}</p>}
              {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Record Stock Movement</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMovementSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={movementType === "IN" ? "default" : "outline"}
                    onClick={() => setMovementType("IN")}
                  >
                    <ArrowDownCircle className="size-4" />
                    Stock In
                  </Button>
                  <Button
                    type="button"
                    variant={movementType === "OUT" ? "default" : "outline"}
                    onClick={() => setMovementType("OUT")}
                  >
                    <ArrowUpCircle className="size-4" />
                    Stock Out
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity ({item.unit})</Label>
                  <Input id="quantity" name="quantity" type="number" step="0.001" min="0.001" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bookingId">Booking (optional)</Label>
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
                  <Label htmlFor="reason">Reason / Notes</Label>
                  <Input id="reason" name="reason" placeholder="e.g. Stuffed into container" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={movementMutation.isPending} className="w-full">
                  {movementMutation.isPending ? "Recording…" : `Record Stock ${movementType === "IN" ? "In" : "Out"}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              {item.movements.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No stock movements recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              m.type === "IN"
                                ? "border-success/40 text-success"
                                : "border-warning/40 text-warning"
                            }
                          >
                            {m.type === "IN" ? "In" : "Out"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {m.type === "IN" ? "+" : "−"}
                          {m.quantity} {item.unit}
                        </TableCell>
                        <TableCell>
                          {m.booking ? (
                            <Link href={`/bookings/${m.booking.id}`} className="text-brand hover:underline">
                              {m.booking.bookingNumber}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{m.reason ?? "—"}</TableCell>
                        <TableCell>{m.recordedBy?.name ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
