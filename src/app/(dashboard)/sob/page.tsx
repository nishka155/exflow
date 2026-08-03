"use client";

import { useQuery } from "@tanstack/react-query";
import { Anchor, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { SOB_STATUS_CONFIG, type SobStatus } from "@/lib/constants/statuses";

interface SobListItem {
  id: string;
  vessel: string | null;
  shippingLine: string | null;
  status: string;
  booking: { bookingNumber: string; customer: { name: string } };
}

function SobPageContent() {
  const { data: sobs, isLoading, error } = useQuery({
    queryKey: ["sob"],
    queryFn: () => api.get<SobListItem[]>("/api/sob"),
  });

  return (
    <div>
      <PageHeader
        title="Shipped on Board"
        description="Confirm vessel departure once the Bill of Lading is final."
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load SOB records. Please try again.
        </p>
      ) : !sobs || sobs.length === 0 ? (
        <EmptyState
          icon={Anchor}
          title="No SOB records yet"
          description="SOB records are created automatically when a Bill of Lading is finalized."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vessel</TableHead>
                <TableHead>Shipping Line</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sobs.map((s) => (
                <ClickableTableRow key={s.id} href={`/sob/${s.id}`}>
                  <TableCell className="font-medium">{s.booking.bookingNumber}</TableCell>
                  <TableCell>{s.booking.customer.name}</TableCell>
                  <TableCell>{s.vessel ?? "—"}</TableCell>
                  <TableCell>{s.shippingLine ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge config={SOB_STATUS_CONFIG[s.status as SobStatus]} />
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function SobPage() {
  return (
    <SobPageContent />
  );
}
