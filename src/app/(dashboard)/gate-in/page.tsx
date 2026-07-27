import Link from "next/link";
import { Plus, DoorOpen } from "lucide-react";

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
import { listGateIns } from "@/lib/queries/gate-in";
import { GATE_IN_STATUS_CONFIG, type GateInStatus } from "@/lib/constants/statuses";
import { redirect } from "next/navigation";

export default async function GateInPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const gateIns = await listGateIns(user.organizationId);

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

      {gateIns.length === 0 ? (
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
                <TableHead>Shipment</TableHead>
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
                  <TableCell>{g.shipment.shipmentNumber}</TableCell>
                  <TableCell>{g.shipment.customer.name}</TableCell>
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
