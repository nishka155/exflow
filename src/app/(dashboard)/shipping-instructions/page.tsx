"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Send, Loader2 } from "lucide-react";

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
import { SI_STATUS_CONFIG, type SIStatus } from "@/lib/constants/statuses";

interface SIListItem {
  id: string;
  shippingLine: string | null;
  vessel: string | null;
  voyage: string | null;
  status: string;
  booking: { bookingNumber: string; customer: { name: string } };
}

function ShippingInstructionsPageContent() {
  const { data: sis, isLoading, error } = useQuery({
    queryKey: ["shipping-instructions"],
    queryFn: () => api.get<SIListItem[]>("/api/shipping-instructions"),
  });

  return (
    <div>
      <PageHeader
        title="Shipping Instructions"
        description="Generate and send shipping instructions to the shipping line."
        actions={
          <Button nativeButton={false} render={<Link href="/shipping-instructions/new" />}>
            <Plus />
            New Shipping Instruction
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load shipping instructions. Please try again.
        </p>
      ) : !sis || sis.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No shipping instructions yet"
          description="Create a shipping instruction once a container has gated in."
          action={
            <Button nativeButton={false} render={<Link href="/shipping-instructions/new" />}>
              <Plus />
              New Shipping Instruction
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
                <TableHead>Shipping Line</TableHead>
                <TableHead>Vessel / Voyage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sis.map((si) => (
                <ClickableTableRow key={si.id} href={`/shipping-instructions/${si.id}`}>
                  <TableCell className="font-medium">{si.booking.bookingNumber}</TableCell>
                  <TableCell>{si.booking.customer.name}</TableCell>
                  <TableCell>{si.shippingLine ?? "—"}</TableCell>
                  <TableCell>
                    {si.vessel ?? "—"} / {si.voyage ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge config={SI_STATUS_CONFIG[si.status as SIStatus]} />
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

export default function ShippingInstructionsPage() {
  return (
    <ShippingInstructionsPageContent />
  );
}
