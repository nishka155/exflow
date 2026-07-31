"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Loader2 } from "lucide-react";

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
import { ClickableTableRow } from "@/components/shared/clickable-table-row";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api } from "@/lib/api/client";
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from "@/lib/constants/statuses";

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 });

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  material: string;
  exportCountry: string;
  currency: string;
  totalAmount: string;
  status: string;
  customer: { name: string };
}

function InvoicesPageContent() {
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get<InvoiceListItem[]>("/api/invoices"),
  });

  return (
    <div>
      <PageHeader
        title="Export Invoices"
        description="Create and manage export invoices for your shipments."
        actions={
          <Button nativeButton={false} render={<Link href="/invoices/new" />}>
            <Plus />
            New Invoice
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load invoices. Please try again.
        </p>
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create your first export invoice to start a shipment."
          action={
            <Button nativeButton={false} render={<Link href="/invoices/new" />}>
              <Plus />
              New Invoice
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Export Country</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <ClickableTableRow key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customer.name}</TableCell>
                  <TableCell className="max-w-52 truncate">{invoice.material}</TableCell>
                  <TableCell>{invoice.exportCountry}</TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter(invoice.currency).format(Number(invoice.totalAmount))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge config={INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus]} />
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <AuthGuard>
      <InvoicesPageContent />
    </AuthGuard>
  );
}
