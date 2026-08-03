"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { DispatchActions } from "@/components/modules/dispatch-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { DISPATCH_STATUS_CONFIG, type DispatchStatus } from "@/lib/constants/statuses";
import type { Document } from "@prisma/client";

interface DispatchDetail {
  id: string;
  truckNumber: string;
  driverName: string;
  driverMobile: string;
  referenceNumber: string | null;
  material: string;
  numberOfBlocks: number | null;
  numberOfWeights: string | null;
  dispatchDate: string;
  expectedFactoryArrival: string;
  actualFactoryArrival: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  bookingId: string;
  booking: { bookingNumber: string; customer: { name: string } };
  transporter: { name: string };
  documents: Document[];
}

function DispatchDetailPageContent() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: dispatch, isLoading, error } = useQuery({
    queryKey: ["dispatch", params.id],
    queryFn: () => api.get<DispatchDetail>(`/api/dispatches/${params.id}`),
  });

  async function uploadDocument(formData: FormData) {
    try {
      await api.post(`/api/dispatches/${params.id}/documents`, formData);
      queryClient.invalidateQueries({ queryKey: ["dispatch", params.id] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
      throw err;
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !dispatch) {
    return <p className="py-16 text-center text-sm text-destructive">Dispatch not found.</p>;
  }

  return (
    <div>
      <PageHeader
        title={dispatch.truckNumber}
        description={`Booking ${dispatch.booking.bookingNumber} · ${dispatch.booking.customer.name}`}
        actions={<StatusBadge config={DISPATCH_STATUS_CONFIG[dispatch.status as DispatchStatus]} />}
      />

      <div className="mb-6">
        <DispatchActions dispatchId={dispatch.id} status={dispatch.status as DispatchStatus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Dispatch Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Driver Name" value={dispatch.driverName} />
            <Field label="Driver Mobile" value={dispatch.driverMobile} />
            <Field label="Transporter" value={dispatch.transporter.name} />
            <Field label="Reference Number" value={dispatch.referenceNumber ?? "—"} />
            <Field label="Material" value={dispatch.material} />
            <Field label="Number of Blocks" value={dispatch.numberOfBlocks ?? "—"} />
            <Field
              label="Weight"
              value={dispatch.numberOfWeights ? Number(dispatch.numberOfWeights) : "—"}
            />
            <Field label="Dispatch Date" value={new Date(dispatch.dispatchDate).toLocaleDateString()} />
            <Field
              label="Expected Factory Arrival"
              value={new Date(dispatch.expectedFactoryArrival).toLocaleDateString()}
            />
            <Field
              label="Actual Factory Arrival"
              value={
                dispatch.actualFactoryArrival
                  ? new Date(dispatch.actualFactoryArrival).toLocaleDateString()
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              label="Booking"
              value={
                <Link href={`/bookings/${dispatch.bookingId}`} className="text-brand hover:underline">
                  {dispatch.booking.bookingNumber}
                </Link>
              }
            />
            <Field label="Created" value={new Date(dispatch.createdAt).toLocaleString()} />
            <Field label="Last Updated" value={new Date(dispatch.updatedAt).toLocaleString()} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader action={uploadDocument} />
          <DocumentList documents={dispatch.documents} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default function DispatchDetailPage() {
  return (
    <DispatchDetailPageContent />
  );
}
