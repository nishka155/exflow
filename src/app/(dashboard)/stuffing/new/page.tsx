import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StuffingForm } from "@/components/modules/stuffing-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listShipmentsWithoutStuffing } from "@/lib/queries/stuffing";
import { prisma } from "@/lib/prisma";

export default async function NewStuffingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [shipments, transporters] = await Promise.all([
    listShipmentsWithoutStuffing(user.organizationId),
    prisma.transporter.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="New Factory Stuffing" description="Step 3 of the export workflow." />
      <StuffingForm shipments={shipments} transporters={transporters} />
    </div>
  );
}
