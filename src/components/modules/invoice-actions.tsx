"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  setInvoiceStatusAction,
  generateInvoicePdfAction,
  deleteInvoiceAction,
} from "@/lib/actions/invoices";
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
  const [pending, startTransition] = React.useTransition();

  function runAction(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button
          disabled={pending}
          onClick={() =>
            runAction(() => setInvoiceStatusAction(invoiceId, "APPROVED"), "Invoice approved")
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
            runAction(() => setInvoiceStatusAction(invoiceId, "COMPLETED"), "Invoice completed")
          }
        >
          <CheckCircle2 />
          Mark Completed
        </Button>
      )}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => runAction(() => generateInvoicePdfAction(invoiceId), "PDF generated")}
      >
        <FileDown />
        {hasPdf ? "Regenerate PDF" : "Generate PDF"}
      </Button>
      {hasPdf && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" />}
        >
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
                onClick={() => runAction(() => deleteInvoiceAction(invoiceId), "Invoice deleted")}
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
