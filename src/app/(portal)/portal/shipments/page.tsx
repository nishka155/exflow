import { redirect } from "next/navigation";
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
import { getCustomerForPortalUser, getPortalShipments } from "@/lib/queries/customer-portal";
import { SHIPMENT_STAGE_CONFIG, type ShipmentStage } from "@/lib/constants/statuses";

export default async function PortalShipmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customer = await getCustomerForPortalUser(user.id);
  if (!customer) redirect("/login");

  const shipments = await getPortalShipments(customer.id);

  return (
    <div>
      <PageHeader title="Your Shipments" description="Live status of every shipment with us." />

      {shipments.length === 0 ? (
        <EmptyState icon={Boxes} title="No shipments yet" description="Shipments will appear here once created." />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Export Country</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((s) => (
                <ClickableTableRow key={s.id} href={`/portal/shipments/${s.id}`}>
                  <TableCell className="font-medium">{s.shipmentNumber}</TableCell>
                  <TableCell>{s.invoice?.invoiceNumber ?? "—"}</TableCell>
                  <TableCell>{s.invoice?.material ?? "—"}</TableCell>
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
