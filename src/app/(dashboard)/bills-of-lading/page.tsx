"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Ship, Loader2 } from "lucide-react";

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
import { BL_STATUS_CONFIG, type BLStatus } from "@/lib/constants/statuses";

interface BLListItem {
  id: string;
  blNumber: string | null;
  vessel: string | null;
  voyage: string | null;
  status: string;
  booking: { bookingNumber: string; customer: { name: string } };
}

function BillsOfLadingPageContent() {
  const { data: bls, isLoading, error } = useQuery({
    queryKey: ["bills-of-lading"],
    queryFn: () => api.get<BLListItem[]>("/api/bills-of-lading"),
  });

  return (
    <div>
      <PageHeader
        title="Bill of Lading"
        description="Draft, compare against SI, and finalize bills of lading."
        actions={
          <Button nativeButton={false} render={<Link href="/bills-of-lading/new" />}>
            <Plus />
            New Bill of Lading
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load bills of lading. Please try again.
        </p>
      ) : !bls || bls.length === 0 ? (
        <EmptyState
          icon={Ship}
          title="No bills of lading yet"
          description="Generate a BL draft from a confirmed shipping instruction."
          action={
            <Button nativeButton={false} render={<Link href="/bills-of-lading/new" />}>
              <Plus />
              New Bill of Lading
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BL Number</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vessel / Voyage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bls.map((bl) => (
                <ClickableTableRow key={bl.id} href={`/bills-of-lading/${bl.id}`}>
                  <TableCell className="font-medium">{bl.blNumber ?? "—"}</TableCell>
                  <TableCell>{bl.booking.bookingNumber}</TableCell>
                  <TableCell>{bl.booking.customer.name}</TableCell>
                  <TableCell>
                    {bl.vessel ?? "—"} / {bl.voyage ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge config={BL_STATUS_CONFIG[bl.status as BLStatus]} />
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

export default function BillsOfLadingPage() {
  return (
    <BillsOfLadingPageContent />
  );
}
