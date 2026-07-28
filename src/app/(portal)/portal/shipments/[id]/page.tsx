import { notFound, redirect } from "next/navigation";
import { FileDown } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCustomerForPortalUser, getPortalShipmentDetail } from "@/lib/queries/customer-portal";
import { SHIPMENT_STAGE_CONFIG, type ShipmentStage } from "@/lib/constants/statuses";

export default async function PortalShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customer = await getCustomerForPortalUser(user.id);
  if (!customer) redirect("/login");

  const shipment = await getPortalShipmentDetail(id, customer.id);
  if (!shipment) notFound();

  return (
    <div>
      <PageHeader
        title={shipment.shipmentNumber}
        description={shipment.invoice?.material}
        actions={
          <StatusBadge config={SHIPMENT_STAGE_CONFIG[shipment.currentStage as ShipmentStage]} />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {shipment.invoice?.pdfUrl && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`/api/invoices/${shipment.invoice.id}/pdf`} target="_blank" />}
          >
            <FileDown />
            Invoice
          </Button>
        )}
        {shipment.shippingInstruction?.pdfUrl && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a href={`/api/shipping-instructions/${shipment.shippingInstruction.id}/pdf`} target="_blank" />
            }
          >
            <FileDown />
            Shipping Instruction
          </Button>
        )}
        {shipment.billOfLading?.pdfUrl && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`/api/bills-of-lading/${shipment.billOfLading.id}/pdf`} target="_blank" />}
          >
            <FileDown />
            Bill of Lading
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {shipment.timelineEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No updates yet.
              </p>
            ) : (
              <ol className="space-y-4 border-l pl-4">
                {shipment.timelineEvents.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-brand" />
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={shipment.documents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
