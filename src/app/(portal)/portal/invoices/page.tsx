import { redirect } from "next/navigation";
import { FileText, FileDown } from "lucide-react";

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
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCustomerForPortalUser, getPortalInvoices } from "@/lib/queries/customer-portal";
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from "@/lib/constants/statuses";

const currency = (c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c });

export default async function PortalInvoicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customer = await getCustomerForPortalUser(user.id);
  if (!customer) redirect("/login");

  const invoices = await getPortalInvoices(customer.id);

  return (
    <div>
      <PageHeader title="Invoices" description="Every export invoice raised against your orders." />

      {invoices.length === 0 ? (
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
                        nativeButton={false}
                        render={<a href={`/api/invoices/${inv.id}/pdf`} target="_blank" />}
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
