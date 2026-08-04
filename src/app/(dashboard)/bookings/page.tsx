"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Loader2, Plus, Upload } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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

interface BookingListItem {
  id: string;
  bookingNumber: string;
  currentStage: string;
  customer: { name: string };
  invoice: { invoiceNumber: string; exportCountry: string } | null;
}

function BookingsPageContent() {
  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingListItem[]>("/api/bookings"),
  });

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="The single record for every export booking, start to finish."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/bookings/import" />}>
              <Upload />
              Import
            </Button>
            <Button nativeButton={false} render={<Link href="/bookings/new" />}>
              <Plus />
              New Booking
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load bookings. Please try again.
        </p>
      ) : !bookings || bookings.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No bookings yet"
          description="Create a booking, or start with an export invoice — either way creates the booking record."
          action={
            <Button nativeButton={false} render={<Link href="/bookings/new" />}>
              <Plus />
              New Booking
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Export Country</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <ClickableTableRow key={b.id} href={`/bookings/${b.id}`}>
                  <TableCell className="font-medium">{b.bookingNumber}</TableCell>
                  <TableCell>{b.customer.name}</TableCell>
                  <TableCell>{b.invoice?.invoiceNumber ?? "—"}</TableCell>
                  <TableCell>{b.invoice?.exportCountry ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge config={BOOKING_STAGE_CONFIG[b.currentStage as BookingStage]} />
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

export default function BookingsPage() {
  return (
    <BookingsPageContent />
  );
}
