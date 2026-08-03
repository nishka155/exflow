"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Truck, Loader2 } from "lucide-react";

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
import { DISPATCH_STATUS_CONFIG, type DispatchStatus } from "@/lib/constants/statuses";

interface DispatchListItem {
  id: string;
  truckNumber: string;
  status: string;
  dispatchDate: string;
  booking: { bookingNumber: string; customer: { name: string } };
  transporter: { name: string };
}

function DispatchesPageContent() {
  const { data: dispatches, isLoading, error } = useQuery({
    queryKey: ["dispatches"],
    queryFn: () => api.get<DispatchListItem[]>("/api/dispatches"),
  });

  return (
    <div>
      <PageHeader
        title="Truck Dispatch"
        description="Track trucks moving material from suppliers to the factory."
        actions={
          <Button nativeButton={false} render={<Link href="/dispatches/new" />}>
            <Plus />
            New Dispatch
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load dispatches. Please try again.
        </p>
      ) : !dispatches || dispatches.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No dispatches yet"
          description="Create a truck dispatch for one of your bookings."
          action={
            <Button nativeButton={false} render={<Link href="/dispatches/new" />}>
              <Plus />
              New Dispatch
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck Number</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead>Dispatch Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatches.map((d) => (
                <ClickableTableRow key={d.id} href={`/dispatches/${d.id}`}>
                  <TableCell className="font-medium">{d.truckNumber}</TableCell>
                  <TableCell>{d.booking.bookingNumber}</TableCell>
                  <TableCell>{d.booking.customer.name}</TableCell>
                  <TableCell>{d.transporter.name}</TableCell>
                  <TableCell>{new Date(d.dispatchDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <StatusBadge config={DISPATCH_STATUS_CONFIG[d.status as DispatchStatus]} />
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

export default function DispatchesPage() {
  return (
    <DispatchesPageContent />
  );
}
