"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { BillOfLadingForm, type BLFormValues } from "@/components/modules/bill-of-lading-form";
import { api } from "@/lib/api/client";

function EditBillOfLadingPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: bl, isLoading, error } = useQuery({
    queryKey: ["bill-of-lading", params.id],
    queryFn: () => api.get<BLFormValues & { status: string; booking: { bookingNumber: string } }>(
      `/api/bills-of-lading/${params.id}`
    ),
  });

  React.useEffect(() => {
    if (bl?.status === "FINAL") {
      router.replace(`/shipping-instructions/${bl.shippingInstructionId}`);
    }
  }, [bl, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !bl) {
    return <p className="py-16 text-center text-sm text-destructive">Bill of Lading not found.</p>;
  }

  if (bl.status === "FINAL") {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Edit BL · ${bl.booking.bookingNumber}`} />
      <BillOfLadingForm bl={bl} />
    </div>
  );
}

export default function EditBillOfLadingPage() {
  return (
    <EditBillOfLadingPageContent />
  );
}
