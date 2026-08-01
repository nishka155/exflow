"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FolderOpen, Loader2 } from "lucide-react";

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
import { AuthGuard } from "@/components/auth/auth-guard";
import { api, ApiError } from "@/lib/api/client";
import type { DocumentCategory } from "@prisma/client";

interface DocumentListItem {
  id: string;
  fileName: string;
  category: string;
  bookingId: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
  booking: { bookingNumber: string } | null;
  uploadedBy: { name: string } | null;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPageContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ["documents", { q, category }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      return api.get<DocumentListItem[]>(`/api/documents?${params.toString()}`);
    },
  });

  async function handleDownload(id: string) {
    try {
      const { url } = await api.get<{ url: string }>(`/api/documents/${id}/download`);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download file");
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Every file uploaded across invoices, dispatches, stuffing, and shipping documents."
      />

      <DocumentSearchForm defaultSearch={q} defaultCategory={category} />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load documents. Please try again.
        </p>
      ) : !documents || documents.length === 0 ? (
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
                <TableHead>Booking</TableHead>
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
                    {doc.booking ? (
                      <Link
                        href={`/bookings/${doc.bookingId}`}
                        className="text-brand hover:underline"
                      >
                        {doc.booking.bookingNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{doc.uploadedBy?.name ?? "—"}</TableCell>
                  <TableCell>{formatBytes(doc.fileSizeBytes)}</TableCell>
                  <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Download className="size-4" />
                    </button>
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

export default function DocumentsPage() {
  return (
    <AuthGuard>
      <DocumentsPageContent />
    </AuthGuard>
  );
}
