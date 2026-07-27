import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { BillOfLadingForm } from "@/components/modules/bill-of-lading-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getBillOfLadingById } from "@/lib/queries/bills-of-lading";
import { serializeBL } from "@/lib/serializers/bill-of-lading";

export default async function EditBillOfLadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const bl = await getBillOfLadingById(id, user.organizationId);
  if (!bl) notFound();
  if (bl.status === "FINAL") redirect(`/bills-of-lading/${id}`);

  return (
    <div>
      <PageHeader title={`Edit BL · ${bl.shipment.shipmentNumber}`} />
      <BillOfLadingForm bl={serializeBL(bl)} />
    </div>
  );
}
