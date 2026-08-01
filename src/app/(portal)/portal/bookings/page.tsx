"use client";

import { useQuery } from "@tanstack/react-query";
import { Boxes, Loader2 } from "lucide-react";

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
import { BOOKING_STAGE_CONFIG, type BookingStage } from "@/lib/constants/statuses";

interface PortalBookingListItem {
  id: string;
  bookingNumber: string;
  currentStage: string;
  invoice: { invoiceNumber: string; material: string; exportCountry: string } | null;
}

export default function PortalBookingsPage() {
  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ["portal-bookings"],
    queryFn: () => api.get<PortalBookingListItem[]>("/api/portal/bookings"),
  });

  return (
    <div>
      <PageHeader title="Your Bookings" description="Live status of every booking with us." />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load bookings. Please try again.
        </p>
      ) : !bookings || bookings.length === 0 ? (
        <EmptyState icon={Boxes} title="No bookings yet" description="Bookings will appear here once created." />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Export Country</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((s) => (
                <ClickableTableRow key={s.id} href={`/portal/bookings/${s.id}`}>
                  <TableCell className="font-medium">{s.bookingNumber}</TableCell>
                  <TableCell>{s.invoice?.invoiceNumber ?? "—"}</TableCell>
                  <TableCell>{s.invoice?.material ?? "—"}</TableCell>
                  <TableCell>{s.invoice?.exportCountry ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge config={BOOKING_STAGE_CONFIG[s.currentStage as BookingStage]} />
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
