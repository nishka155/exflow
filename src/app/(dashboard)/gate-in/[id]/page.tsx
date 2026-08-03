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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { GATE_IN_STATUS_CONFIG, type GateInStatus } from "@/lib/constants/statuses";
import type { Document } from "@prisma/client";

interface GateInDetail {
  id: string;
  containerNumber: string;
  terminal: string;
  yard: string | null;
  vehicleNumber: string | null;
  gateInDate: string;
  form13Updated: boolean;
  gatePass: string | null;
  eirNumber: string | null;
  remarks: string | null;
  status: string;
  createdAt: string;
  bookingId: string;
  factoryStuffingId: string;
  booking: { bookingNumber: string; customer: { name: string } };
  documents: Document[];
}

function GateInDetailPageContent() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: gateIn, isLoading, error } = useQuery({
    queryKey: ["gate-in", params.id],
    queryFn: () => api.get<GateInDetail>(`/api/gate-in/${params.id}`),
  });

  async function uploadDocument(formData: FormData) {
    try {
      await api.post(`/api/gate-in/${params.id}/documents`, formData);
      queryClient.invalidateQueries({ queryKey: ["gate-in", params.id] });
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

  if (error || !gateIn) {
    return <p className="py-16 text-center text-sm text-destructive">Gate-in record not found.</p>;
  }

  return (
    <div>
      <PageHeader
        title={gateIn.containerNumber}
        description={`Booking ${gateIn.booking.bookingNumber} · ${gateIn.booking.customer.name}`}
        actions={<StatusBadge config={GATE_IN_STATUS_CONFIG[gateIn.status as GateInStatus]} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gate In Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Terminal" value={gateIn.terminal} />
            <Field label="Yard" value={gateIn.yard ?? "—"} />
            <Field label="Vehicle Number" value={gateIn.vehicleNumber ?? "—"} />
            <Field label="Gate In Date" value={new Date(gateIn.gateInDate).toLocaleDateString()} />
            <Field label="Form 13 Updated" value={gateIn.form13Updated ? "Yes" : "No"} />
            <Field label="Gate Pass" value={gateIn.gatePass ?? "—"} />
            <Field label="EIR Number" value={gateIn.eirNumber ?? "—"} />
            <Field label="Remarks" value={gateIn.remarks ?? "—"} />
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
                <Link href={`/bookings/${gateIn.bookingId}`} className="text-brand hover:underline">
                  {gateIn.booking.bookingNumber}
                </Link>
              }
            />
            <Field
              label="Container"
              value={
                <Link
                  href={`/stuffing?bookingId=${gateIn.bookingId}`}
                  className="text-brand hover:underline"
                >
                  View stuffing record →
                </Link>
              }
            />
            <Field label="Created" value={new Date(gateIn.createdAt).toLocaleString()} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader action={uploadDocument} />
          <DocumentList documents={gateIn.documents} />
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

export default function GateInDetailPage() {
  return (
    <GateInDetailPageContent />
  );
}
