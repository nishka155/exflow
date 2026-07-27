import { FileText, Download } from "lucide-react";
import type { Document } from "@prisma/client";
import { EmptyState } from "@/components/shared/empty-state";

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents attached"
        description="Upload invoices, packing lists, photos, or certificates related to this record."
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(doc.fileSizeBytes)} · {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <a
            href={`/api/documents/${doc.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Download className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  );
}
