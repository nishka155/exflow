import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Truck,
  Container,
  DoorOpen,
  Send,
  Ship,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DocumentList } from "@/components/shared/document-list";
import { ShipmentComments } from "@/components/modules/shipment-comments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getShipmentMaster } from "@/lib/queries/shipment-master";
import { prisma } from "@/lib/prisma";
import {
  SHIPMENT_STAGE_CONFIG,
  INVOICE_STATUS_CONFIG,
  DISPATCH_STATUS_CONFIG,
  STUFFING_STATUS_CONFIG,
  GATE_IN_STATUS_CONFIG,
  SI_STATUS_CONFIG,
  BL_STATUS_CONFIG,
  type ShipmentStage,
  type InvoiceStatus,
  type DispatchStatus,
  type StuffingStatus,
  type GateInStatus,
  type SIStatus,
  type BLStatus,
} from "@/lib/constants/statuses";

export default async function ShipmentMasterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const shipment = await getShipmentMaster(id, user.organizationId);
  if (!shipment) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId, entityId: shipment.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const pipeline = [
    {
      key: "invoice",
      title: "Invoice",
      icon: FileText,
      href: shipment.invoice ? `/invoices/${shipment.invoice.id}` : "/invoices/new",
      status: shipment.invoice ? INVOICE_STATUS_CONFIG[shipment.invoice.status as InvoiceStatus] : null,
    },
    {
      key: "dispatch",
      title: `Truck Dispatch${shipment.truckDispatches.length > 1 ? ` (${shipment.truckDispatches.length})` : ""}`,
      icon: Truck,
      href:
        shipment.truckDispatches.length === 1
          ? `/dispatches/${shipment.truckDispatches[0].id}`
          : shipment.truckDispatches.length > 1
            ? "/dispatches"
            : `/dispatches/new?shipmentId=${shipment.id}`,
      status:
        shipment.truckDispatches.length > 0
          ? DISPATCH_STATUS_CONFIG[shipment.truckDispatches[0].status as DispatchStatus]
          : null,
    },
    {
      key: "stuffing",
      title: "Factory Stuffing",
      icon: Container,
      href: shipment.factoryStuffing ? `/stuffing/${shipment.factoryStuffing.id}` : "/stuffing/new",
      status: shipment.factoryStuffing
        ? STUFFING_STATUS_CONFIG[shipment.factoryStuffing.status as StuffingStatus]
        : null,
    },
    {
      key: "gate-in",
      title: "Gate In",
      icon: DoorOpen,
      href: shipment.gateIn ? `/gate-in/${shipment.gateIn.id}` : "/gate-in/new",
      status: shipment.gateIn ? GATE_IN_STATUS_CONFIG[shipment.gateIn.status as GateInStatus] : null,
    },
    {
      key: "si",
      title: "Shipping Instruction",
      icon: Send,
      href: shipment.shippingInstruction
        ? `/shipping-instructions/${shipment.shippingInstruction.id}`
        : "/shipping-instructions/new",
      status: shipment.shippingInstruction
        ? SI_STATUS_CONFIG[shipment.shippingInstruction.status as SIStatus]
        : null,
    },
    {
      key: "bl",
      title: "Bill of Lading",
      icon: Ship,
      href: shipment.billOfLading
        ? `/bills-of-lading/${shipment.billOfLading.id}`
        : "/bills-of-lading/new",
      status: shipment.billOfLading ? BL_STATUS_CONFIG[shipment.billOfLading.status as BLStatus] : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title={shipment.shipmentNumber}
        description={shipment.customer.name}
        actions={
          <StatusBadge config={SHIPMENT_STAGE_CONFIG[shipment.currentStage as ShipmentStage]} />
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {pipeline.map((step) => (
          <Link key={step.key} href={step.href}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-col gap-2 py-1">
                <div className="flex items-center justify-between">
                  <step.icon className="size-4 text-muted-foreground" />
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{step.title}</p>
                {step.status ? (
                  <StatusBadge config={step.status} className="w-fit" />
                ) : (
                  <span className="text-xs text-muted-foreground">Not started</span>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {shipment.timelineEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No timeline events yet.</p>
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
                      {event.actor?.name ?? "System"} · {new Date(event.occurredAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <ShipmentComments shipmentId={shipment.id} comments={shipment.comments} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={shipment.documents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No audit entries"
                description="Technical change history for this shipment will appear here."
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {auditLogs.map((log) => (
                  <li key={log.id} className="text-muted-foreground">
                    {log.action} · {log.entityType} · {new Date(log.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
