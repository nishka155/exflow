import Link from "next/link";
import { Plus, Ship } from "lucide-react";

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
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listBillsOfLading } from "@/lib/queries/bills-of-lading";
import { BL_STATUS_CONFIG, type BLStatus } from "@/lib/constants/statuses";
import { redirect } from "next/navigation";

export default async function BillsOfLadingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const bls = await listBillsOfLading(user.organizationId);

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

      {bls.length === 0 ? (
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
                <TableHead>Shipment</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vessel / Voyage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bls.map((bl) => (
                <ClickableTableRow key={bl.id} href={`/bills-of-lading/${bl.id}`}>
                  <TableCell className="font-medium">{bl.blNumber ?? "—"}</TableCell>
                  <TableCell>{bl.shipment.shipmentNumber}</TableCell>
                  <TableCell>{bl.shipment.customer.name}</TableCell>
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
