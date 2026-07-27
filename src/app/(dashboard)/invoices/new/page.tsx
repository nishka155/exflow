import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceForm } from "@/components/modules/invoice-form";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="New Export Invoice" description="Step 1 of the export workflow." />
      <InvoiceForm customers={customers} action={createInvoiceAction} />
    </div>
  );
}
