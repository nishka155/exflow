"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";
import { BOOKING_STAGE_CONFIG, type BookingStage } from "@/lib/constants/statuses";
import type { Document } from "@prisma/client";

interface PortalBookingDetail {
  id: string;
  bookingNumber: string;
  currentStage: string;
  invoice: { id: string; material: string; pdfUrl: string | null } | null;
  shippingInstruction: { id: string; pdfUrl: string | null } | null;
  billOfLading: { id: string; pdfUrl: string | null } | null;
  documents: Document[];
  timelineEvents: { id: string; title: string; description: string | null; occurredAt: string }[];
}

export default function PortalBookingDetailPage() {
  const params = useParams<{ id: string }>();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["portal-booking", params.id],
    queryFn: () => api.get<PortalBookingDetail>(`/api/portal/bookings/${params.id}`),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return <p className="py-16 text-center text-sm text-destructive">Booking not found.</p>;
  }

  async function handleDownload(path: string) {
    try {
      const { url } = await api.get<{ url: string }>(`/api/portal/${path}/pdf`);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download PDF");
    }
  }

  return (
    <div>
      <PageHeader
        title={booking.bookingNumber}
        description={booking.invoice?.material}
        actions={
          <StatusBadge config={BOOKING_STAGE_CONFIG[booking.currentStage as BookingStage]} />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {booking.invoice?.pdfUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(`invoices/${booking.invoice!.id}`)}
          >
            <FileDown />
            Invoice
          </Button>
        )}
        {booking.shippingInstruction?.pdfUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleDownload(`shipping-instructions/${booking.shippingInstruction!.id}`)
            }
          >
            <FileDown />
            Shipping Instruction
          </Button>
        )}
        {booking.billOfLading?.pdfUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(`bills-of-lading/${booking.billOfLading!.id}`)}
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
            {booking.timelineEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No updates yet.
              </p>
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
            <DocumentList documents={booking.documents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
