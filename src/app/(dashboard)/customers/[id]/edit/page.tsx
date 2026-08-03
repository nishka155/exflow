"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/modules/customer-form";
import { PortalAccessCard } from "@/components/modules/portal-access-card";
import { api } from "@/lib/api/client";

interface CustomerDetail {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  country: string;
  gstNumber: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  portalUser: { email: string } | null;
}

function EditCustomerPageContent() {
  const params = useParams<{ id: string }>();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ["customer", params.id],
    queryFn: () => api.get<CustomerDetail>(`/api/customers/${params.id}`),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !customer) {
    return <p className="py-16 text-center text-sm text-destructive">Customer not found.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${customer.name}`} />
      <CustomerForm customer={customer} />
      <PortalAccessCard customerId={customer.id} portalUserEmail={customer.portalUser?.email ?? null} />
    </div>
  );
}

export default function EditCustomerPage() {
  return (
    <EditCustomerPageContent />
  );
}
