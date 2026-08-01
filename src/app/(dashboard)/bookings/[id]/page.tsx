"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Truck,
  Container,
  DoorOpen,
  Send,
  Ship,
  Anchor,
  ClipboardList,
  ArrowRight,
  Loader2,
} from "lucide-react";
import type {
  Customer,
  Invoice,
  TruckDispatch,
  Transporter,
  FactoryStuffing,
  GateIn,
  ShippingInstruction,
  BillOfLading,
  ShippedOnBoard,
  Document,
  AuditLog,
} from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DocumentList } from "@/components/shared/document-list";
import { BookingComments } from "@/components/modules/booking-comments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api } from "@/lib/api/client";
import {
  BOOKING_STAGE_CONFIG,
  INVOICE_STATUS_CONFIG,
  DISPATCH_STATUS_CONFIG,
  STUFFING_STATUS_CONFIG,
  GATE_IN_STATUS_CONFIG,
  SI_STATUS_CONFIG,
  BL_STATUS_CONFIG,
  SOB_STATUS_CONFIG,
  type BookingStage,
  type InvoiceStatus,
  type DispatchStatus,
  type StuffingStatus,
  type GateInStatus,
  type SIStatus,
  type BLStatus,
  type SobStatus,
} from "@/lib/constants/statuses";

interface BookingMaster {
  id: string;
  bookingNumber: string;
  currentStage: string;
  customer: Customer;
  invoice: Invoice | null;
  truckDispatches: (TruckDispatch & { transporter: Transporter })[];
  factoryStuffings: FactoryStuffing[];
  gateIns: GateIn[];
  shippingInstruction: ShippingInstruction | null;
  billOfLading: (BillOfLading & { sob: ShippedOnBoard | null }) | null;
  documents: Document[];
  comments: { id: string; body: string; createdAt: string; author: { name: string } }[];
  timelineEvents: {
    id: string;
    title: string;
    description: string | null;
    occurredAt: string;
    actor: { name: string } | null;
  }[];
  auditLogs: AuditLog[];
}

function BookingMasterPageContent({ id }: { id: string }) {
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get<BookingMaster>(`/api/bookings/${id}`),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <p className="py-16 text-center text-sm text-destructive">
        Could not load this booking. Please try again.
      </p>
    );
  }

  const pipeline = [
    {
      key: "invoice",
      title: "Invoice",
      icon: FileText,
      href: booking.invoice ? `/invoices/${booking.invoice.id}` : "/invoices/new",
      status: booking.invoice ? INVOICE_STATUS_CONFIG[booking.invoice.status as InvoiceStatus] : null,
    },
    {
      key: "dispatch",
      title: `Truck Dispatch${booking.truckDispatches.length > 1 ? ` (${booking.truckDispatches.length})` : ""}`,
      icon: Truck,
      href:
        booking.truckDispatches.length === 1
          ? `/dispatches/${booking.truckDispatches[0].id}`
          : booking.truckDispatches.length > 1
            ? "/dispatches"
            : `/dispatches/new?bookingId=${booking.id}`,
      status:
        booking.truckDispatches.length > 0
          ? DISPATCH_STATUS_CONFIG[booking.truckDispatches[0].status as DispatchStatus]
          : null,
    },
    {
      key: "stuffing",
      title: `Factory Stuffing${booking.factoryStuffings.length > 1 ? ` (${booking.factoryStuffings.length})` : ""}`,
      icon: Container,
      href:
        booking.factoryStuffings.length === 1
          ? `/stuffing?bookingId=${booking.id}`
          : booking.factoryStuffings.length > 1
            ? `/stuffing?bookingId=${booking.id}`
            : `/stuffing?bookingId=${booking.id}`,
      status:
        booking.factoryStuffings.length > 0
          ? STUFFING_STATUS_CONFIG[booking.factoryStuffings[0].status as StuffingStatus]
          : null,
    },
    {
      key: "gate-in",
      title: `Gate In${booking.gateIns.length > 1 ? ` (${booking.gateIns.length})` : ""}`,
      icon: DoorOpen,
      href:
        booking.gateIns.length === 1
          ? `/gate-in/${booking.gateIns[0].id}`
          : booking.gateIns.length > 1
            ? "/gate-in"
            : "/gate-in/new",
      status:
        booking.gateIns.length > 0
          ? GATE_IN_STATUS_CONFIG[booking.gateIns[0].status as GateInStatus]
          : null,
    },
    {
      key: "si",
      title: "Shipping Instruction",
      icon: Send,
      href: booking.shippingInstruction
        ? `/shipping-instructions/${booking.shippingInstruction.id}`
        : "/shipping-instructions/new",
      status: booking.shippingInstruction
        ? SI_STATUS_CONFIG[booking.shippingInstruction.status as SIStatus]
        : null,
    },
    {
      key: "bl",
      title: "Bill of Lading",
      icon: Ship,
      href: booking.billOfLading
        ? `/bills-of-lading/${booking.billOfLading.id}`
        : "/bills-of-lading/new",
      status: booking.billOfLading ? BL_STATUS_CONFIG[booking.billOfLading.status as BLStatus] : null,
    },
    {
      key: "sob",
      title: "Shipped on Board",
      icon: Anchor,
      href: "/sob",
      status: booking.billOfLading?.sob
        ? SOB_STATUS_CONFIG[booking.billOfLading.sob.status as SobStatus]
        : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title={booking.bookingNumber}
        description={booking.customer.name}
        actions={
          <StatusBadge config={BOOKING_STAGE_CONFIG[booking.currentStage as BookingStage]} />
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
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
            {booking.timelineEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No timeline events yet.</p>
            ) : (
              <ol className="space-y-4 border-l pl-4">
                {booking.timelineEvents.map((event) => (
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
            <BookingComments bookingId={booking.id} comments={booking.comments} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={booking.documents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {booking.auditLogs.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No audit entries"
                description="Technical change history for this booking will appear here."
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {booking.auditLogs.map((log) => (
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

export default function BookingMasterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <AuthGuard>
      <BookingMasterPageContent id={id} />
    </AuthGuard>
  );
}
