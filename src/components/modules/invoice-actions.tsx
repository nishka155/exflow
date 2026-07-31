"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, Pencil, Trash2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, ApiError } from "@/lib/api/client";
import type { InvoiceStatus } from "@/lib/constants/statuses";

export function InvoiceActions({
  invoiceId,
  status,
  hasPdf,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  hasPdf: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = React.useTransition();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  }

  function runAction(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        invalidate();
        toast.success(successMessage);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      }
    });
  }

  async function handleDownloadPdf() {
    try {
      const { url } = await api.get<{ url: string }>(`/api/invoices/${invoiceId}/pdf`);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not download PDF");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button
          disabled={pending}
          onClick={() =>
            runAction(
              () => api.post(`/api/invoices/${invoiceId}/status`, { status: "APPROVED" }),
              "Invoice approved"
            )
          }
        >
          <CheckCircle2 />
          Approve
        </Button>
      )}
      {status === "APPROVED" && (
        <Button
          disabled={pending}
          onClick={() =>
            runAction(
              () => api.post(`/api/invoices/${invoiceId}/status`, { status: "COMPLETED" }),
              "Invoice completed"
            )
          }
        >
          <CheckCircle2 />
          Mark Completed
        </Button>
      )}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          runAction(() => api.post(`/api/invoices/${invoiceId}/pdf`), "PDF generated")
        }
      >
        <FileDown />
        {hasPdf ? "Regenerate PDF" : "Generate PDF"}
      </Button>
      {hasPdf && (
        <Button variant="outline" onClick={handleDownloadPdf}>
          <FileDown />
          Download PDF
        </Button>
      )}
      {status !== "COMPLETED" && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/invoices/${invoiceId}/edit`} />}
        >
          <Pencil />
          Edit
        </Button>
      )}
      {status === "DRAFT" && (
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" />}>
            <Trash2 />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the invoice and its associated shipment record.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await api.delete(`/api/invoices/${invoiceId}`);
                      queryClient.invalidateQueries({ queryKey: ["invoices"] });
                      toast.success("Invoice deleted");
                      router.push("/invoices");
                    } catch (err) {
                      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
                    }
                  })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
