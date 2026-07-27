import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { GateInForm } from "@/components/modules/gate-in-form";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listStuffingsAwaitingGateIn } from "@/lib/queries/gate-in";

export default async function NewGateInPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const stuffings = await listStuffingsAwaitingGateIn(user.organizationId);

  return (
    <div>
      <PageHeader title="New Gate In" description="Step 4 of the export workflow." />
      <GateInForm stuffings={stuffings} />
    </div>
  );
}
