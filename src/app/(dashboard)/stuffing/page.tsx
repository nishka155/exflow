import Link from "next/link";
import { Plus, Container } from "lucide-react";

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
import { listStuffings } from "@/lib/queries/stuffing";
import { STUFFING_STATUS_CONFIG, type StuffingStatus } from "@/lib/constants/statuses";
import { redirect } from "next/navigation";

export default async function StuffingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stuffings = await listStuffings(user.organizationId);

  return (
    <div>
      <PageHeader
        title="Factory Stuffing"
        description="Record container stuffing at the factory."
        actions={
          <Button nativeButton={false} render={<Link href="/stuffing/new" />}>
            <Plus />
            New Stuffing Record
          </Button>
        }
      />

      {stuffings.length === 0 ? (
        <EmptyState
          icon={Container}
          title="No stuffing records yet"
          description="Create a factory stuffing record for a shipment."
          action={
            <Button nativeButton={false} render={<Link href="/stuffing/new" />}>
              <Plus />
              New Stuffing Record
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container Number</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>POD</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stuffings.map((s) => (
                <ClickableTableRow key={s.id} href={`/stuffing/${s.id}`}>
                  <TableCell className="font-medium">{s.containerNumber}</TableCell>
                  <TableCell>{s.containerSize.replace("_", " ")}</TableCell>
                  <TableCell>{s.shipment.shipmentNumber}</TableCell>
                  <TableCell>{s.shipment.customer.name}</TableCell>
                  <TableCell>{s.pod}</TableCell>
                  <TableCell>
                    <StatusBadge config={STUFFING_STATUS_CONFIG[s.status as StuffingStatus]} />
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
