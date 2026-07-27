import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DispatchForm } from "@/components/modules/dispatch-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listShipmentOptions } from "@/lib/queries/dispatches";
import { prisma } from "@/lib/prisma";

export default async function NewDispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ shipmentId?: string }>;
}) {
  const { shipmentId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [shipments, transporters] = await Promise.all([
    listShipmentOptions(user.organizationId),
    prisma.transporter.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="New Truck Dispatch" description="Step 2 of the export workflow." />
      <DispatchForm shipments={shipments} transporters={transporters} defaultShipmentId={shipmentId} />
    </div>
  );
}
