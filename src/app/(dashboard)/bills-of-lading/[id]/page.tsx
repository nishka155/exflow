"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { api } from "@/lib/api/client";

/** The Bill of Lading now lives inline on its Shipping Instruction's page —
 *  this route stays alive only so old links/bookmarks still land somewhere
 *  useful instead of 404ing. */
function RedirectToShippingInstruction() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: bl } = useQuery({
    queryKey: ["bill-of-lading", params.id],
    queryFn: () => api.get<{ shippingInstructionId: string }>(`/api/bills-of-lading/${params.id}`),
  });

  useEffect(() => {
    if (bl?.shippingInstructionId) {
      router.replace(`/shipping-instructions/${bl.shippingInstructionId}`);
    }
  }, [bl, router]);

  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function BillOfLadingDetailPage() {
  return <RedirectToShippingInstruction />;
}
