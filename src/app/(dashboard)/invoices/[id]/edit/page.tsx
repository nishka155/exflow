"use client";

import { useParams, useRouter } from "next/navigation";
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

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  buyerName: string;
  buyerAddress: string | null;
  poNumber: string | null;
  material: string;
  quantity: string;
  quantityUnit: string;
  weight: string;
  weightUnit: string;
  numberOfBlocks: number | null;
  hsnCode: string;
  unitPrice: string;
  currency: string;
  gstPercent: string;
  exportCountry: string;
  status: string;
}

function EditInvoicePageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["invoice", params.id],
    queryFn: () => api.get<InvoiceDetail>(`/api/invoices/${params.id}`),
  });
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/api/customers"),
  });

  if (invoiceLoading || customersLoading || !customers) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return <p className="py-16 text-center text-sm text-destructive">Invoice not found.</p>;
  }

  if (invoice.status === "COMPLETED") {
    router.replace(`/invoices/${invoice.id}`);
    return null;
  }

  return (
    <div>
      <PageHeader title={`Edit ${invoice.invoiceNumber}`} />
      <InvoiceForm
        customers={customers}
        mode="edit"
        invoice={{
          ...invoice,
          quantity: Number(invoice.quantity),
          weight: Number(invoice.weight),
          unitPrice: Number(invoice.unitPrice),
          gstPercent: Number(invoice.gstPercent),
        }}
      />
    </div>
  );
}

export default function EditInvoicePage() {
  return (
    <AuthGuard>
      <EditInvoicePageContent />
    </AuthGuard>
  );
}
