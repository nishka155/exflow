import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, FileDown, Pencil, History } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { FinalizeBLButton } from "@/components/modules/bill-of-lading-actions";
import { GenerateReportButton } from "@/components/modules/generate-report-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getBillOfLadingById } from "@/lib/queries/bills-of-lading";
import { uploadBlDocumentAction, generateBlPdfAction } from "@/lib/actions/bills-of-lading";
import { BL_STATUS_CONFIG, type BLStatus } from "@/lib/constants/statuses";

interface Mismatch {
  field: string;
  label: string;
  blValue: string;
  siValue: string;
}

export default async function BillOfLadingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const bl = await getBillOfLadingById(id, user.organizationId);
  if (!bl) notFound();

  const uploadAction = uploadBlDocumentAction.bind(null, bl.id);
  const mismatches = (bl.mismatchNotes as unknown as Mismatch[] | null) ?? [];

  return (
    <div>
      <PageHeader
        title={bl.blNumber ? `BL ${bl.blNumber}` : `BL Draft · ${bl.shipment.shipmentNumber}`}
        description={bl.shipment.customer.name}
        actions={<StatusBadge config={BL_STATUS_CONFIG[bl.status as BLStatus]} />}
      />

      {mismatches.length > 0 && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="size-4" />
              Mismatch with Shipping Instruction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mismatches.map((m) => (
              <div key={m.field} className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">{m.label}</span>
                <span>
                  BL: <span className="font-medium">{m.blValue}</span>
                </span>
                <span>
                  SI: <span className="font-medium">{m.siValue}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FinalizeBLButton blId={bl.id} status={bl.status as BLStatus} />
        {bl.status !== "FINAL" && (
          <Button variant="outline" nativeButton={false} render={<Link href={`/bills-of-lading/${bl.id}/edit`} />}>
            <Pencil />
            Edit
          </Button>
        )}
        <GenerateReportButton
          action={generateBlPdfAction.bind(null, bl.id)}
          hasReport={!!bl.pdfUrl}
          label="Generate PDF"
          regenerateLabel="Regenerate PDF"
        />
        {bl.pdfUrl && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`/api/bills-of-lading/${bl.id}/pdf`} target="_blank" />}
          >
            <FileDown />
            Download PDF
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bill of Lading</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Consignor" value={bl.consignorName} />
            <Field label="Consignee" value={bl.consigneeName} />
            <Field label="Notify Party" value={bl.notifyPartyName ?? "—"} />
            <Field label="POL / POD" value={`${bl.pol} → ${bl.pod}`} />
            <Field label="Vessel / Voyage" value={`${bl.vessel ?? "—"} / ${bl.voyage ?? "—"}`} />
            <Field label="Container Number" value={bl.containerNumber ?? "—"} />
            <Field label="Seal Number" value={bl.sealNumber ?? "—"} />
            <Field label="Commodity" value={bl.commodity} />
            <Field label="Package Count" value={bl.packageCount ?? "—"} />
            <Field label="Weight" value={bl.weight ? Number(bl.weight) : "—"} />
            <Field label="Freight Terms" value={bl.freightTerms ?? "—"} />
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
                <Link href={`/shipments/${bl.shipmentId}`} className="text-brand hover:underline">
                  {bl.shipment.shipmentNumber}
                </Link>
              }
            />
            <Field
              label="Shipping Instruction"
              value={
                <Link
                  href={`/shipping-instructions/${bl.shippingInstructionId}`}
                  className="text-brand hover:underline"
                >
                  View SI →
                </Link>
              }
            />
            <Field label="Created" value={new Date(bl.createdAt).toLocaleString()} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader action={uploadAction} />
            <DocumentList documents={bl.documents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revision History</CardTitle>
          </CardHeader>
          <CardContent>
            {bl.revisions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No revisions yet — this is the original draft.
              </p>
            ) : (
              <ul className="space-y-3">
                {bl.revisions.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 text-sm">
                    <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Revision {r.revisionNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.changeNote} · {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
