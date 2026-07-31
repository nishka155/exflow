"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, AlertTriangle, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { InvoiceActions } from "@/components/modules/invoice-actions";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from "@/lib/constants/statuses";
import type { Document } from "@prisma/client";

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 });

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  poNumber: string | null;
  exportCountry: string;
  material: string;
  hsnCode: string;
  quantity: string;
  quantityUnit: string;
  weight: string;
  weightUnit: string;
  numberOfBlocks: number | null;
  unitPrice: string;
  gstPercent: string;
  totalAmount: string;
  currency: string;
  status: string;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
  shipmentId: string;
  customer: { name: string };
  shipment: { shipmentNumber: string };
  createdBy: { name: string } | null;
  versions: { id: string; versionNumber: number; changeNote: string | null; createdAt: string }[];
  documents: Document[];
  duplicates: { id: string; invoiceNumber: string; invoiceDate: string; totalAmount: string }[];
}

function InvoiceDetailPageContent() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["invoice", params.id],
    queryFn: () => api.get<InvoiceDetail>(`/api/invoices/${params.id}`),
  });

  async function uploadDocument(formData: FormData) {
    try {
      await api.post(`/api/invoices/${params.id}/documents`, formData);
      queryClient.invalidateQueries({ queryKey: ["invoice", params.id] });
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

  if (error || !invoice) {
    return <p className="py-16 text-center text-sm text-destructive">Invoice not found.</p>;
  }

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Shipment ${invoice.shipment.shipmentNumber}`}
        actions={<StatusBadge config={INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus]} />}
      />

      {invoice.duplicates.length > 0 && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
              <AlertTriangle className="size-4 text-warning" />
              Possible duplicate invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Similar invoices for this customer and material were found within a week of this
              one:
            </p>
            {invoice.duplicates.map((d) => (
              <Link
                key={d.id}
                href={`/invoices/${d.id}`}
                className="block text-sm text-brand hover:underline"
              >
                {d.invoiceNumber} · {new Date(d.invoiceDate).toLocaleDateString()} ·{" "}
                {currencyFormatter(invoice.currency).format(Number(d.totalAmount))}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status as InvoiceStatus}
          hasPdf={!!invoice.pdfUrl}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Customer" value={invoice.customer.name} />
            <Field label="Buyer" value={invoice.buyerName} />
            <Field label="PO Number" value={invoice.poNumber ?? "—"} />
            <Field label="Export Country" value={invoice.exportCountry} />
            <Field label="Material" value={invoice.material} />
            <Field label="HSN Code" value={invoice.hsnCode} />
            <Field label="Quantity" value={`${Number(invoice.quantity)} ${invoice.quantityUnit}`} />
            <Field label="Weight" value={`${Number(invoice.weight)} ${invoice.weightUnit}`} />
            <Field label="Number of Blocks" value={invoice.numberOfBlocks ?? "—"} />
            <Field
              label="Unit Price"
              value={currencyFormatter(invoice.currency).format(Number(invoice.unitPrice))}
            />
            <Field label="GST" value={`${Number(invoice.gstPercent)}%`} />
            <Field
              label="Total Amount"
              value={currencyFormatter(invoice.currency).format(Number(invoice.totalAmount))}
              emphasize
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Created By" value={invoice.createdBy?.name ?? "—"} />
            <Field label="Created" value={new Date(invoice.createdAt).toLocaleString()} />
            <Field label="Last Updated" value={new Date(invoice.updatedAt).toLocaleString()} />
            <Field
              label="Shipment"
              value={
                <Link
                  href={`/shipments/${invoice.shipmentId}`}
                  className="text-brand hover:underline"
                >
                  {invoice.shipment.shipmentNumber}
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader action={uploadDocument} />
            <DocumentList documents={invoice.documents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Version History</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.versions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No edits yet — this is the original version.
              </p>
            ) : (
              <ul className="space-y-3">
                {invoice.versions.map((v) => (
                  <li key={v.id} className="flex items-start gap-3 text-sm">
                    <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Version {v.versionNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.changeNote} · {new Date(v.createdAt).toLocaleString()}
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

function Field({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasize ? "text-base font-semibold" : "text-sm"}>{value}</p>
    </div>
  );
}

export default function InvoiceDetailPage() {
  return (
    <AuthGuard>
      <InvoiceDetailPageContent />
    </AuthGuard>
  );
}
