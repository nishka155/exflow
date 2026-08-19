"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Scan, ArrowLeft, CheckCircle2, AlertTriangle,
  ArrowDownCircle, ArrowUpCircle, Loader2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api/client";

type MovementType = "IN" | "OUT" | "RETURN" | "DAMAGED" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

interface ScannedItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  unit: string;
  currentStock: string;
  reorderLevel: string | null;
  location: string | null;
}

const MOVEMENT_OPTIONS: { value: MovementType; label: string; adds: boolean }[] = [
  { value: "IN",            label: "Stock In",    adds: true  },
  { value: "OUT",           label: "Stock Out",   adds: false },
  { value: "RETURN",        label: "Return",      adds: true  },
  { value: "DAMAGED",       label: "Damaged",     adds: false },
  { value: "ADJUSTMENT_IN", label: "Adj. +",      adds: true  },
  { value: "ADJUSTMENT_OUT",label: "Adj. −",      adds: false },
];

export default function InventoryScanPage() {
  const scanInputRef = React.useRef<HTMLInputElement>(null);
  const qtyInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [scanValue, setScanValue] = React.useState("");
  const [scannedItem, setScannedItem] = React.useState<ScannedItem | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [movementType, setMovementType] = React.useState<MovementType>("OUT");
  const [quantity, setQuantity] = React.useState("1");
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lastRecorded, setLastRecorded] = React.useState<{ name: string; type: MovementType; qty: string } | null>(null);

  // Keep scan input focused always
  React.useEffect(() => {
    scanInputRef.current?.focus();
  }, [scannedItem]);

  async function lookupBarcode(code: string) {
    if (!code.trim()) return;
    setLookupLoading(true);
    setNotFound(false);
    setScannedItem(null);
    setLastRecorded(null);
    try {
      const item = await api.get<ScannedItem>(`/api/inventory/barcode/${encodeURIComponent(code.trim())}`);
      setScannedItem(item);
      setQuantity("1");
      setTimeout(() => qtyInputRef.current?.focus(), 50);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        toast.error("Lookup failed — check your connection");
      }
    } finally {
      setLookupLoading(false);
      setScanValue("");
    }
  }

  function handleScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void lookupBarcode(scanValue);
    }
  }

  const movementMutation = useMutation({
    mutationFn: (payload: object) =>
      api.post(`/api/inventory/${scannedItem!.id}/movements`, payload),
    onSuccess: () => {
      const recorded = {
        name: scannedItem!.name,
        type: movementType,
        qty: quantity,
      };
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      setLastRecorded(recorded);
      setScannedItem(null);
      setScanValue("");
      // Re-focus scan input for next scan
      setTimeout(() => scanInputRef.current?.focus(), 50);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to record movement");
    },
  });

  function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!scannedItem || !quantity || Number(quantity) <= 0) return;
    movementMutation.mutate({ type: movementType, quantity: Number(quantity) });
  }

  const isLow =
    scannedItem?.reorderLevel != null &&
    Number(scannedItem.currentStock) <= Number(scannedItem.reorderLevel);

  const selectedOpt = MOVEMENT_OPTIONS.find((o) => o.value === movementType)!;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Barcode Scanner"
        description="Scan an item barcode to record a stock movement instantly."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/inventory" />}>
            <ArrowLeft className="size-4" />
            Inventory
          </Button>
        }
      />

      {/* Scan input */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Scan className="size-4" />
            Scan Barcode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input
              ref={scanInputRef}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={handleScanKeyDown}
              placeholder="Point scanner here or type barcode…"
              className="pr-10 font-mono text-base"
              autoComplete="off"
              autoFocus
            />
            {lookupLoading && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            USB scanners send Enter automatically. Manual entry: type barcode then press Enter.
          </p>
        </CardContent>
      </Card>

      {/* Last recorded */}
      {lastRecorded && !scannedItem && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            Recorded <strong>{MOVEMENT_OPTIONS.find(o => o.value === lastRecorded.type)?.label}</strong>{" "}
            of <strong>{lastRecorded.qty}</strong> for <strong>{lastRecorded.name}</strong>
          </span>
        </div>
      )}

      {/* Not found */}
      {notFound && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            No item found for that barcode.{" "}
            <Link href="/inventory/new" className="underline">
              Add a new item
            </Link>
          </span>
        </div>
      )}

      {/* Item card + movement form */}
      {scannedItem && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold">{scannedItem.name}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {[scannedItem.sku && `SKU: ${scannedItem.sku}`, scannedItem.category, scannedItem.location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">
                  {scannedItem.currentStock}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">{scannedItem.unit}</span>
                </p>
                {isLow && (
                  <Badge variant="outline" className="border-warning/40 text-warning">
                    Low stock
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecord} className="space-y-4">
              {/* Quick type buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={movementType === "OUT" ? "default" : "outline"}
                  onClick={() => setMovementType("OUT")}
                  className="gap-1.5"
                >
                  <ArrowUpCircle className="size-4" />
                  Stock Out
                </Button>
                <Button
                  type="button"
                  variant={movementType === "IN" ? "default" : "outline"}
                  onClick={() => setMovementType("IN")}
                  className="gap-1.5"
                >
                  <ArrowDownCircle className="size-4" />
                  Stock In
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Movement Type</Label>
                <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty">Quantity ({scannedItem.unit})</Label>
                <Input
                  ref={qtyInputRef}
                  id="qty"
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-lg font-semibold tabular-nums"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={movementMutation.isPending}
                  className="flex-1"
                >
                  {movementMutation.isPending
                    ? "Recording…"
                    : `Record ${selectedOpt.label} · ${quantity} ${scannedItem.unit}`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setScannedItem(null); setScanValue(""); setNotFound(false); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
