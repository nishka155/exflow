"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { InvoiceForm } from "@/components/modules/invoice-form";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api } from "@/lib/api/client";

interface Customer {
  id: string;
  name: string;
  country: string | null;
  address: string | null;
  city: string | null;
}

function NewInvoicePageContent() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/api/customers"),
  });

  return (
    <div>
      <PageHeader title="New Export Invoice" description="Step 1 of the export workflow." />
      {isLoading || !customers ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <InvoiceForm customers={customers} mode="create" />
      )}
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <AuthGuard>
      <NewInvoicePageContent />
    </AuthGuard>
  );
}
