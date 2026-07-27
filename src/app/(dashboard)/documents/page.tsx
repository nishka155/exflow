import Link from "next/link";
import { Download, FolderOpen } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { DocumentSearchForm } from "@/components/modules/document-search-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listDocuments } from "@/lib/queries/documents";
import { redirect } from "next/navigation";
import type { DocumentCategory } from "@prisma/client";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const documents = await listDocuments(user.organizationId, {
    search: q,
    category: category as DocumentCategory | undefined,
  });

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Every file uploaded across invoices, dispatches, stuffing, and shipping documents."
      />

      <DocumentSearchForm defaultSearch={q ?? ""} defaultCategory={category ?? ""} />

      {documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents found"
          description="Documents you upload anywhere in ExFlow will show up here."
        />
      ) : (
        <div className="mt-4 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="max-w-64 truncate font-medium">{doc.fileName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.category.replaceAll("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    {doc.shipment ? (
                      <Link
                        href={`/shipments/${doc.shipmentId}`}
                        className="text-brand hover:underline"
                      >
                        {doc.shipment.shipmentNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{doc.uploadedBy?.name ?? "—"}</TableCell>
                  <TableCell>{formatBytes(doc.fileSizeBytes)}</TableCell>
                  <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Download className="size-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
