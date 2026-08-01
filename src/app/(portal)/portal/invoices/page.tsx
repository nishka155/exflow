"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, FileDown, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api/client";
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from "@/lib/constants/statuses";

const currency = (c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c });

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  material: string;
  currency: string;
  totalAmount: string;
  status: string;
  pdfUrl: string | null;
}

export default function PortalInvoicesPage() {
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: () => api.get<PortalInvoice[]>("/api/portal/invoices"),
  });

  async function handleDownload(id: string) {
    try {
      const { url } = await api.get<{ url: string }>(`/api/portal/invoices/${id}/pdf`);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download PDF");
    }
  }

  return (
    <div>
      <PageHeader title="Invoices" description="Every export invoice raised against your orders." />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load invoices. Please try again.
        </p>
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices yet" description="Invoices will appear here once raised." />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.material}</TableCell>
                  <TableCell className="text-right">
                    {currency(inv.currency).format(Number(inv.totalAmount))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge config={INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus]} />
                  </TableCell>
                  <TableCell>
                    {inv.pdfUrl && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDownload(inv.id)}
                      >
                        <FileDown />
                      </Button>
                    )}
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
