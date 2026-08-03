"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, DoorOpen, Loader2 } from "lucide-react";

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
import { GATE_IN_STATUS_CONFIG, type GateInStatus } from "@/lib/constants/statuses";

interface GateInListItem {
  id: string;
  containerNumber: string;
  terminal: string;
  gateInDate: string;
  status: string;
  booking: { bookingNumber: string; customer: { name: string } };
}

function GateInPageContent() {
  const { data: gateIns, isLoading, error } = useQuery({
    queryKey: ["gate-ins"],
    queryFn: () => api.get<GateInListItem[]>("/api/gate-in"),
  });

  return (
    <div>
      <PageHeader
        title="Gate In"
        description="Record container gate-in at the terminal."
        actions={
          <Button nativeButton={false} render={<Link href="/gate-in/new" />}>
            <Plus />
            New Gate In
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load gate-in records. Please try again.
        </p>
      ) : !gateIns || gateIns.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No gate-in records yet"
          description="Record a container gate-in once factory stuffing is complete."
          action={
            <Button nativeButton={false} render={<Link href="/gate-in/new" />}>
              <Plus />
              New Gate In
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container Number</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Terminal</TableHead>
                <TableHead>Gate In Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateIns.map((g) => (
                <ClickableTableRow key={g.id} href={`/gate-in/${g.id}`}>
                  <TableCell className="font-medium">{g.containerNumber}</TableCell>
                  <TableCell>{g.booking.bookingNumber}</TableCell>
                  <TableCell>{g.booking.customer.name}</TableCell>
                  <TableCell>{g.terminal}</TableCell>
                  <TableCell>{new Date(g.gateInDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <StatusBadge config={GATE_IN_STATUS_CONFIG[g.status as GateInStatus]} />
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

export default function GateInPage() {
  return (
    <GateInPageContent />
  );
}
