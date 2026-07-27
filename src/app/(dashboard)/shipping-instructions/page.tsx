import Link from "next/link";
import { Plus, Send } from "lucide-react";

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
import { listShippingInstructions } from "@/lib/queries/shipping-instructions";
import { SI_STATUS_CONFIG, type SIStatus } from "@/lib/constants/statuses";
import { redirect } from "next/navigation";

export default async function ShippingInstructionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sis = await listShippingInstructions(user.organizationId);

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

      {sis.length === 0 ? (
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
                <TableHead>Shipment</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Shipping Line</TableHead>
                <TableHead>Vessel / Voyage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sis.map((si) => (
                <ClickableTableRow key={si.id} href={`/shipping-instructions/${si.id}`}>
                  <TableCell className="font-medium">{si.shipment.shipmentNumber}</TableCell>
                  <TableCell>{si.shipment.customer.name}</TableCell>
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
