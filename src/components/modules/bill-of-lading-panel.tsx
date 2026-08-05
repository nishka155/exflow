"use client";

import type * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, FileDown, Pencil, History, Loader2 } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/shared/document-list";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { FinalizeBLButton } from "@/components/modules/bill-of-lading-actions";
import { GenerateReportButton } from "@/components/modules/generate-report-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { BL_STATUS_CONFIG, type BLStatus } from "@/lib/constants/statuses";
import type { Document } from "@prisma/client";

interface Mismatch {
  field: string;
  label: string;
  blValue: string;
  siValue: string;
}

interface BLDetail {
  id: string;
  blNumber: string | null;
  consignorName: string;
  consigneeName: string;
  notifyPartyName: string | null;
  pol: string;
  pod: string;
  vessel: string | null;
  voyage: string | null;
  containerNumber: string | null;
  sealNumber: string | null;
  commodity: string;
  packageCount: number | null;
  weight: string | null;
  freightTerms: string | null;
  status: string;
  pdfUrl: string | null;
  mismatchNotes: unknown;
  createdAt: string;
  revisions: { id: string; revisionNumber: number; changeNote: string | null; createdAt: string }[];
  documents: Document[];
}

/** The full Bill of Lading view — fields, mismatch warning, finalize/edit/PDF
 *  actions, documents, revision history. Embedded directly inside the owning
 *  Shipping Instruction's detail page rather than living on its own route,
 *  since a BL never exists independent of the SI it was generated from. */
export function BillOfLadingPanel({ blId }: { blId: string }) {
  const queryClient = useQueryClient();

  const { data: bl, isLoading, error } = useQuery({
    queryKey: ["bill-of-lading", blId],
    queryFn: () => api.get<BLDetail>(`/api/bills-of-lading/${blId}`),
  });

  async function uploadDocument(formData: FormData) {
    try {
      await api.post(`/api/bills-of-lading/${blId}/documents`, formData);
      queryClient.invalidateQueries({ queryKey: ["bill-of-lading", blId] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
      throw err;
    }
  }

  async function handleDownloadPdf() {
    try {
      const { url } = await api.get<{ url: string }>(`/api/bills-of-lading/${blId}/pdf`);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download PDF");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !bl) {
    return <p className="py-10 text-center text-sm text-destructive">Bill of Lading not found.</p>;
  }

  const mismatches = (bl.mismatchNotes as Mismatch[] | null) ?? [];

  return (
    <div className="space-y-4">
      {mismatches.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
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

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge config={BL_STATUS_CONFIG[bl.status as BLStatus]} />
        <FinalizeBLButton blId={bl.id} status={bl.status as BLStatus} />
        {bl.status !== "FINAL" && (
          <Button variant="outline" nativeButton={false} render={<Link href={`/bills-of-lading/${bl.id}/edit`} />}>
            <Pencil />
            Edit
          </Button>
        )}
        <GenerateReportButton
          action={() => api.post(`/api/bills-of-lading/${bl.id}/pdf`)}
          hasReport={!!bl.pdfUrl}
          label="Generate PDF"
          regenerateLabel="Regenerate PDF"
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["bill-of-lading", bl.id] })}
        />
        {bl.pdfUrl && (
          <Button variant="outline" onClick={handleDownloadPdf}>
            <FileDown />
            Download PDF
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {bl.blNumber ? `BL ${bl.blNumber}` : "BL Draft"}
          </CardTitle>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUploader action={uploadDocument} />
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
