import { Boxes } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { listShipmentsForOrg } from "@/lib/queries/shipment-master";
import { SHIPMENT_STAGE_CONFIG, type ShipmentStage } from "@/lib/constants/statuses";
import { redirect } from "next/navigation";

export default async function ShipmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const shipments = await listShipmentsForOrg(user.organizationId);

  return (
    <div>
      <PageHeader
        title="Shipments"
        description="The single record for every export shipment, start to finish."
      />

      {shipments.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No shipments yet"
          description="Shipments are created automatically when you create an export invoice."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Export Country</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((s) => (
                <ClickableTableRow key={s.id} href={`/shipments/${s.id}`}>
                  <TableCell className="font-medium">{s.shipmentNumber}</TableCell>
                  <TableCell>{s.customer.name}</TableCell>
                  <TableCell>{s.invoice?.invoiceNumber ?? "—"}</TableCell>
                  <TableCell>{s.invoice?.exportCountry ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge config={SHIPMENT_STAGE_CONFIG[s.currentStage as ShipmentStage]} />
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
