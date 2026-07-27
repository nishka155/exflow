import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ShippingInstructionForm } from "@/components/modules/shipping-instruction-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listShipmentsAwaitingSI } from "@/lib/queries/shipping-instructions";
import { prisma } from "@/lib/prisma";

export default async function NewShippingInstructionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [shipments, organization] = await Promise.all([
    listShipmentsAwaitingSI(user.organizationId),
    prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } }),
  ]);

  return (
    <div>
      <PageHeader
        title="New Shipping Instruction"
        description="Step 5 of the export workflow — auto-filled from invoice and stuffing data."
      />
      <ShippingInstructionForm shipments={shipments} organizationName={organization.name} />
    </div>
  );
}
