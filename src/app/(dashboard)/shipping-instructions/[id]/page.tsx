import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FileDown } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { ShippingInstructionActions } from "@/components/modules/shipping-instruction-actions";
import { GenerateReportButton } from "@/components/modules/generate-report-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getShippingInstructionById } from "@/lib/queries/shipping-instructions";
import {
  uploadSiDocumentAction,
  generateSiPdfAction,
} from "@/lib/actions/shipping-instructions";
import { SI_STATUS_CONFIG, type SIStatus } from "@/lib/constants/statuses";

export default async function ShippingInstructionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const si = await getShippingInstructionById(id, user.organizationId);
  if (!si) notFound();

  const uploadAction = uploadSiDocumentAction.bind(null, si.id);

  return (
    <div>
      <PageHeader
        title={`SI · ${si.shipment.shipmentNumber}`}
        description={si.shipment.customer.name}
        actions={<StatusBadge config={SI_STATUS_CONFIG[si.status as SIStatus]} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ShippingInstructionActions siId={si.id} status={si.status as SIStatus} />
        <GenerateReportButton
          action={generateSiPdfAction.bind(null, si.id)}
          hasReport={!!si.pdfUrl}
          label="Generate PDF"
          regenerateLabel="Regenerate PDF"
        />
        {si.pdfUrl && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`/api/shipping-instructions/${si.id}/pdf`} target="_blank" />}
          >
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
              label="Shipment"
              value={
                <Link href={`/shipments/${si.shipmentId}`} className="text-brand hover:underline">
                  {si.shipment.shipmentNumber}
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
          <DocumentUploader action={uploadAction} />
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
