"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { ShippingInstructionActions } from "@/components/modules/shipping-instruction-actions";
import { GenerateReportButton } from "@/components/modules/generate-report-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { SI_STATUS_CONFIG, type SIStatus } from "@/lib/constants/statuses";
import type { Document } from "@prisma/client";

interface SIDetail {
  id: string;
  consignorName: string;
  consigneeName: string;
  notifyPartyName: string | null;
  pol: string;
  pod: string;
  commodity: string;
  hsCode: string | null;
  packageCount: number | null;
  weight: string | null;
  containerNumber: string | null;
  sealNumber: string | null;
  freightTerms: string | null;
  incoterms: string | null;
  shippingLine: string | null;
  vessel: string | null;
  voyage: string | null;
  status: string;
  pdfUrl: string | null;
  sentAt: string | null;
  createdAt: string;
  bookingId: string;
  booking: { bookingNumber: string; customer: { name: string } };
  billOfLading: { id: string } | null;
  documents: Document[];
}

function ShippingInstructionDetailPageContent() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: si, isLoading, error } = useQuery({
    queryKey: ["shipping-instruction", params.id],
    queryFn: () => api.get<SIDetail>(`/api/shipping-instructions/${params.id}`),
  });

  async function uploadDocument(formData: FormData) {
    try {
      await api.post(`/api/shipping-instructions/${params.id}/documents`, formData);
      queryClient.invalidateQueries({ queryKey: ["shipping-instruction", params.id] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
      throw err;
    }
  }

  async function handleDownloadPdf() {
    try {
      const { url } = await api.get<{ url: string }>(`/api/shipping-instructions/${params.id}/pdf`);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download PDF");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !si) {
    return <p className="py-16 text-center text-sm text-destructive">Shipping instruction not found.</p>;
  }

  return (
    <div>
      <PageHeader
        title={`SI · ${si.booking.bookingNumber}`}
        description={si.booking.customer.name}
        actions={<StatusBadge config={SI_STATUS_CONFIG[si.status as SIStatus]} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ShippingInstructionActions siId={si.id} status={si.status as SIStatus} />
        <GenerateReportButton
          action={() => api.post(`/api/shipping-instructions/${si.id}/pdf`)}
          hasReport={!!si.pdfUrl}
          label="Generate PDF"
          regenerateLabel="Regenerate PDF"
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["shipping-instruction", si.id] })
          }
        />
        {si.pdfUrl && (
          <Button variant="outline" onClick={handleDownloadPdf}>
            <FileDown />
            Download PDF
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Shipping Instruction</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Consignor" value={si.consignorName} />
            <Field label="Consignee" value={si.consigneeName} />
            <Field label="Notify Party" value={si.notifyPartyName ?? "—"} />
            <Field label="POL / POD" value={`${si.pol} → ${si.pod}`} />
            <Field label="Commodity" value={si.commodity} />
            <Field label="HS Code" value={si.hsCode ?? "—"} />
            <Field label="Package Count" value={si.packageCount ?? "—"} />
            <Field label="Weight" value={si.weight ? Number(si.weight) : "—"} />
            <Field label="Container Number" value={si.containerNumber ?? "—"} />
            <Field label="Seal Number" value={si.sealNumber ?? "—"} />
            <Field label="Freight Terms" value={si.freightTerms ?? "—"} />
            <Field label="Incoterms" value={si.incoterms ?? "—"} />
            <Field label="Shipping Line" value={si.shippingLine ?? "—"} />
            <Field label="Vessel / Voyage" value={`${si.vessel ?? "—"} / ${si.voyage ?? "—"}`} />
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
                <Link href={`/bookings/${si.bookingId}`} className="text-brand hover:underline">
                  {si.booking.bookingNumber}
                </Link>
              }
            />
            {si.billOfLading && (
              <Field
                label="Bill of Lading"
                value={
                  <Link
                    href={`/bills-of-lading/${si.billOfLading.id}`}
                    className="text-brand hover:underline"
                  >
                    View BL →
                  </Link>
                }
              />
            )}
            <Field label="Sent At" value={si.sentAt ? new Date(si.sentAt).toLocaleString() : "—"} />
            <Field label="Created" value={new Date(si.createdAt).toLocaleString()} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader action={uploadDocument} />
          <DocumentList documents={si.documents} />
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

export default function ShippingInstructionDetailPage() {
  return (
    <ShippingInstructionDetailPageContent />
  );
}
