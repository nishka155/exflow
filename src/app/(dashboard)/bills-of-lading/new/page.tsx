import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CreateBLForm } from "@/components/modules/create-bl-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listSisAwaitingBL } from "@/lib/queries/bills-of-lading";

export default async function NewBillOfLadingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sis = await listSisAwaitingBL(user.organizationId);

  return (
    <div>
      <PageHeader title="New Bill of Lading" description="Step 6 of the export workflow." />
      <CreateBLForm sis={sis} />
    </div>
  );
}
