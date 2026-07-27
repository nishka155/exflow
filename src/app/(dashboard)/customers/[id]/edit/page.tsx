import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/modules/customer-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { updateCustomerAction } from "@/lib/actions/customers";
import { prisma } from "@/lib/prisma";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!customer) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${customer.name}`} />
      <CustomerForm customer={customer} action={updateCustomerAction.bind(null, customer.id)} />
    </div>
  );
}
