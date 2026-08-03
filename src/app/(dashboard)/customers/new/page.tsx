"use client";

import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/modules/customer-form";

function NewCustomerPageContent() {
  return (
    <div>
      <PageHeader title="New Customer" />
      <CustomerForm />
    </div>
  );
}

export default function NewCustomerPage() {
  return (
    <NewCustomerPageContent />
  );
}
