import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/modules/customer-form";
import { createCustomerAction } from "@/lib/actions/customers";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="New Customer" />
      <CustomerForm action={createCustomerAction} />
    </div>
  );
}
