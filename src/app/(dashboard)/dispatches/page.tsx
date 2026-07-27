import Link from "next/link";
import { Plus, Truck } from "lucide-react";

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
import { listDispatches } from "@/lib/queries/dispatches";
import { DISPATCH_STATUS_CONFIG, type DispatchStatus } from "@/lib/constants/statuses";
import { redirect } from "next/navigation";

export default async function DispatchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dispatches = await listDispatches(user.organizationId);

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

      {dispatches.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No dispatches yet"
          description="Create a truck dispatch for one of your shipments."
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
                <TableHead>Shipment</TableHead>
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
                  <TableCell>{d.shipment.shipmentNumber}</TableCell>
                  <TableCell>{d.shipment.customer.name}</TableCell>
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
