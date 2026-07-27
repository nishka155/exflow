import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getGateInById } from "@/lib/queries/gate-in";
import { uploadGateInDocumentAction } from "@/lib/actions/gate-in";
import { GATE_IN_STATUS_CONFIG, type GateInStatus } from "@/lib/constants/statuses";

export default async function GateInDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const gateIn = await getGateInById(id, user.organizationId);
  if (!gateIn) notFound();

  const uploadAction = uploadGateInDocumentAction.bind(null, gateIn.id);

  return (
    <div>
      <PageHeader
        title={gateIn.containerNumber}
        description={`Shipment ${gateIn.shipment.shipmentNumber} · ${gateIn.shipment.customer.name}`}
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
              label="Shipment"
              value={
                <Link href={`/shipments/${gateIn.shipmentId}`} className="text-brand hover:underline">
                  {gateIn.shipment.shipmentNumber}
                </Link>
              }
            />
            <Field
              label="Container"
              value={
                <Link
                  href={`/stuffing/${gateIn.factoryStuffingId}`}
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
          <DocumentUploader action={uploadAction} />
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
