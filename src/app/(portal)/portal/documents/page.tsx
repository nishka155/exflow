"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DocumentList } from "@/components/shared/document-list";
import { api } from "@/lib/api/client";
import type { Document } from "@prisma/client";

export default function PortalDocumentsPage() {
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ["portal-documents"],
    queryFn: () => api.get<Document[]>("/api/portal/documents"),
  });

  return (
    <div>
      <PageHeader title="Documents" description="All documents shared with you across your bookings." />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load documents. Please try again.
        </p>
      ) : (
        <DocumentList documents={documents ?? []} />
      )}
    </div>
  );
}
