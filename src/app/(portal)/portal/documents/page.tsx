import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentList } from "@/components/shared/document-list";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCustomerForPortalUser, getPortalDocuments } from "@/lib/queries/customer-portal";

export default async function PortalDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const customer = await getCustomerForPortalUser(user.id);
  if (!customer) redirect("/login");

  const documents = await getPortalDocuments(customer.id);

  return (
    <div>
      <PageHeader title="Documents" description="All documents shared with you across your shipments." />
      <DocumentList documents={documents} />
    </div>
  );
}
