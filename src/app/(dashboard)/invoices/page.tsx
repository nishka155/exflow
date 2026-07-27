import Link from "next/link";
import { Plus, FileText } from "lucide-react";

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
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listInvoices } from "@/lib/queries/invoices";
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from "@/lib/constants/statuses";
import { redirect } from "next/navigation";

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 });

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const invoices = await listInvoices(user.organizationId);

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

      {invoices.length === 0 ? (
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
