import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceForm } from "@/components/modules/invoice-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getInvoiceById } from "@/lib/queries/invoices";
import { updateInvoiceAction } from "@/lib/actions/invoices";
import { serializeInvoice } from "@/lib/serializers/invoice";
import { prisma } from "@/lib/prisma";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const invoice = await getInvoiceById(id, user.organizationId);
  if (!invoice) notFound();
  if (invoice.status === "COMPLETED") redirect(`/invoices/${id}`);

  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title={`Edit ${invoice.invoiceNumber}`} />
      <InvoiceForm
        customers={customers}
        invoice={serializeInvoice(invoice)}
        action={updateInvoiceAction.bind(null, invoice.id)}
      />
    </div>
  );
}
