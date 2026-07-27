import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import {
  StuffingStatusActions,
  StuffingChecklist,
} from "@/components/modules/stuffing-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getStuffingById } from "@/lib/queries/stuffing";
import {
  uploadStuffingDocumentAction,
  generateStuffingReportAction,
} from "@/lib/actions/stuffing";
import { STUFFING_STATUS_CONFIG, type StuffingStatus } from "@/lib/constants/statuses";
import { GenerateReportButton } from "@/components/modules/generate-report-button";

export default async function StuffingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stuffing = await getStuffingById(id, user.organizationId);
  if (!stuffing) notFound();

  const uploadAction = uploadStuffingDocumentAction.bind(null, stuffing.id);

  return (
    <div>
      <PageHeader
        title={stuffing.containerNumber}
        description={`Shipment ${stuffing.shipment.shipmentNumber} · ${stuffing.shipment.customer.name}`}
        actions={<StatusBadge config={STUFFING_STATUS_CONFIG[stuffing.status as StuffingStatus]} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StuffingStatusActions stuffingId={stuffing.id} status={stuffing.status as StuffingStatus} />
        <GenerateReportButton
          action={generateStuffingReportAction.bind(null, stuffing.id)}
          hasReport={!!stuffing.reportUrl}
        />
        {stuffing.reportUrl && (
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`/api/stuffing/${stuffing.id}/report`} target="_blank" />}
          >
            <FileDown />
            Download Report
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Container Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Container Size" value={stuffing.containerSize.replace("_", " ")} />
            <Field label="Seal Number" value={stuffing.sealNumber ?? "—"} />
            <Field label="Transporter" value={stuffing.transporter?.name ?? "—"} />
            <Field label="Contact Number" value={stuffing.contactNumber ?? "—"} />
            <Field label="POL" value={stuffing.pol} />
            <Field label="POD" value={stuffing.pod} />
            <Field label="Number of Boxes" value={stuffing.numberOfBoxes ?? "—"} />
            <Field
              label="Gross / Net Weight"
              value={`${stuffing.grossWeight ?? "—"} / ${stuffing.netWeight ?? "—"} KG`}
            />
            <Field
              label="Stuffing Start"
              value={
                stuffing.stuffingStartTime
                  ? new Date(stuffing.stuffingStartTime).toLocaleString()
                  : "—"
              }
            />
            <Field
              label="Stuffing End"
              value={
                stuffing.stuffingEndTime ? new Date(stuffing.stuffingEndTime).toLocaleString() : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <StuffingChecklist
              stuffingId={stuffing.id}
              values={{
                checklistContainerClean: stuffing.checklistContainerClean,
                checklistContainerDamage: stuffing.checklistContainerDamage,
                checklistSealApplied: stuffing.checklistSealApplied,
                checklistDocumentsUploaded: stuffing.checklistDocumentsUploaded,
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Photos &amp; Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader action={uploadAction} />
          <DocumentList documents={stuffing.documents} />
        </CardContent>
      </Card>

      {stuffing.shipment.truckDispatches.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Linked Trucks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stuffing.shipment.truckDispatches.map((d) => (
              <Link
                key={d.id}
                href={`/dispatches/${d.id}`}
                className="block text-sm text-brand hover:underline"
              >
                {d.truckNumber}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {stuffing.gateIn && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gate In</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/gate-in/${stuffing.gateIn.id}`} className="text-sm text-brand hover:underline">
              View gate-in record →
            </Link>
          </CardContent>
        </Card>
      )}
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
