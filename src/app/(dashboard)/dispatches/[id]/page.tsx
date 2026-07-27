import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { DispatchActions } from "@/components/modules/dispatch-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getDispatchById } from "@/lib/queries/dispatches";
import { uploadDispatchDocumentAction } from "@/lib/actions/dispatches";
import { DISPATCH_STATUS_CONFIG, type DispatchStatus } from "@/lib/constants/statuses";

export default async function DispatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dispatch = await getDispatchById(id, user.organizationId);
  if (!dispatch) notFound();

  const uploadAction = uploadDispatchDocumentAction.bind(null, dispatch.id);

  return (
    <div>
      <PageHeader
        title={dispatch.truckNumber}
        description={`Shipment ${dispatch.shipment.shipmentNumber} · ${dispatch.shipment.customer.name}`}
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
              label="Shipment"
              value={
                <Link href={`/shipments/${dispatch.shipmentId}`} className="text-brand hover:underline">
                  {dispatch.shipment.shipmentNumber}
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
          <DocumentUploader action={uploadAction} />
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
