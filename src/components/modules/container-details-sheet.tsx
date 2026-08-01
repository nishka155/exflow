"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PackageCheck } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentUploader } from "@/components/shared/document-uploader";
import { DocumentList } from "@/components/shared/document-list";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  StuffingStatusActions,
  StuffingChecklist,
} from "@/components/modules/stuffing-actions";
import { api, ApiError } from "@/lib/api/client";
import { STUFFING_STATUS_CONFIG, type StuffingStatus } from "@/lib/constants/statuses";
import type { Document, Transporter } from "@prisma/client";

interface StuffingDetail {
  id: string;
  containerNumber: string;
  status: string;
  sealNumber: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  transporterId: string | null;
  stuffingStartTime: string | null;
  stuffingEndTime: string | null;
  remarks: string | null;
  actualArrival: string | null;
  checklistContainerClean: boolean;
  checklistContainerDamage: boolean;
  checklistSealApplied: boolean;
  checklistDocumentsUploaded: boolean;
  booking: { bookingNumber: string; customer: { name: string } };
  gateIn: { id: string } | null;
  documents: Document[];
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ContainerDetailsSheet({
  stuffingId,
  transporters,
  onOpenChange,
}: {
  stuffingId: string | null;
  transporters: Transporter[];
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = React.useTransition();
  const [deliverPending, startDeliverTransition] = React.useTransition();

  const { data: stuffing, isLoading } = useQuery({
    queryKey: ["stuffing", stuffingId],
    queryFn: () => api.get<StuffingDetail>(`/api/stuffing/${stuffingId}`),
    enabled: !!stuffingId,
  });

  const [form, setForm] = React.useState({
    stuffingStartTime: "",
    stuffingEndTime: "",
    transporterId: "",
    contactPerson: "",
    contactNumber: "",
    remarks: "",
  });

  React.useEffect(() => {
    if (stuffing) {
      setForm({
        stuffingStartTime: stuffing.stuffingStartTime ? toLocalInput(stuffing.stuffingStartTime) : "",
        stuffingEndTime: stuffing.stuffingEndTime ? toLocalInput(stuffing.stuffingEndTime) : "",
        transporterId: stuffing.transporterId ?? "",
        contactPerson: stuffing.contactPerson ?? "",
        contactNumber: stuffing.contactNumber ?? "",
        remarks: stuffing.remarks ?? "",
      });
    }
  }, [stuffing]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["stuffing", stuffingId] });
    queryClient.invalidateQueries({ queryKey: ["stuffings"] });
  }

  function handleSave() {
    if (!stuffingId) return;
    startTransition(async () => {
      try {
        await api.put(`/api/stuffing/${stuffingId}`, {
          stuffingStartTime: form.stuffingStartTime
            ? new Date(form.stuffingStartTime).toISOString()
            : null,
          stuffingEndTime: form.stuffingEndTime
            ? new Date(form.stuffingEndTime).toISOString()
            : null,
          transporterId: form.transporterId || null,
          contactPerson: form.contactPerson || null,
          contactNumber: form.contactNumber || null,
          remarks: form.remarks || null,
        });
        invalidate();
        toast.success("Container details saved");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      }
    });
  }

  async function uploadDocument(formData: FormData) {
    try {
      await api.post(`/api/stuffing/${stuffingId}/documents`, formData);
      invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
      throw err;
    }
  }

  function handleMarkDelivered() {
    if (!stuffingId) return;
    startDeliverTransition(async () => {
      try {
        await api.post(`/api/stuffing/${stuffingId}/deliver`);
        invalidate();
        toast.success("Container marked delivered");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      }
    });
  }

  const containerPhotos = stuffing?.documents.filter((d) => d.category === "CONTAINER_PHOTO") ?? [];
  const loadingPhotos = stuffing?.documents.filter((d) => d.category === "LOADING_PHOTO") ?? [];
  const sealPhotos = stuffing?.documents.filter((d) => d.category === "SEAL_PHOTO") ?? [];

  return (
    <Sheet open={!!stuffingId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {isLoading || !stuffing ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between gap-2 pr-8">
                <SheetTitle>{stuffing.containerNumber}</SheetTitle>
                <StatusBadge config={STUFFING_STATUS_CONFIG[stuffing.status as StuffingStatus]} />
              </div>
              <SheetDescription>
                <Link href={`/bookings`} className="hover:underline">
                  {stuffing.booking.bookingNumber}
                </Link>{" "}
                · {stuffing.booking.customer.name}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <StuffingStatusActions stuffingId={stuffing.id} status={stuffing.status as StuffingStatus} />
                {stuffing.gateIn && !stuffing.actualArrival && (
                  <Button size="sm" variant="outline" disabled={deliverPending} onClick={handleMarkDelivered}>
                    <PackageCheck />
                    Mark Delivered
                  </Button>
                )}
                {stuffing.actualArrival && (
                  <span className="text-xs text-muted-foreground">
                    Delivered {new Date(stuffing.actualArrival).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Details</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="stuffingStartTime">Stuffing Start Time</Label>
                    <Input
                      id="stuffingStartTime"
                      type="datetime-local"
                      value={form.stuffingStartTime}
                      onChange={(e) => setForm((f) => ({ ...f, stuffingStartTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stuffingEndTime">Stuffing End Time</Label>
                    <Input
                      id="stuffingEndTime"
                      type="datetime-local"
                      value={form.stuffingEndTime}
                      onChange={(e) => setForm((f) => ({ ...f, stuffingEndTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="transporterId">Transporter</Label>
                    <Select
                      value={form.transporterId}
                      onValueChange={(v) => setForm((f) => ({ ...f, transporterId: v ?? "" }))}
                    >
                      <SelectTrigger id="transporterId" className="w-full">
                        <SelectValue placeholder="Select a transporter">
                          {(value: string | null) => transporters.find((t) => t.id === value)?.name ?? null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {transporters.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={form.contactPerson}
                      onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input
                      id="contactNumber"
                      value={form.contactNumber}
                      onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Textarea
                      id="remarks"
                      value={form.remarks}
                      onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    />
                  </div>
                </div>
                <Button size="sm" disabled={pending} onClick={handleSave}>
                  {pending ? "Saving…" : "Save Details"}
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Checklist</h4>
                <StuffingChecklist
                  stuffingId={stuffing.id}
                  values={{
                    checklistContainerClean: stuffing.checklistContainerClean,
                    checklistContainerDamage: stuffing.checklistContainerDamage,
                    checklistSealApplied: stuffing.checklistSealApplied,
                    checklistDocumentsUploaded: stuffing.checklistDocumentsUploaded,
                  }}
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Container Photos</h4>
                <DocumentUploader
                  category="CONTAINER_PHOTO"
                  label="Upload container photo"
                  action={uploadDocument}
                />
                <DocumentList documents={containerPhotos} />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Loading Photos</h4>
                <DocumentUploader
                  category="LOADING_PHOTO"
                  label="Upload loading photo"
                  action={uploadDocument}
                />
                <DocumentList documents={loadingPhotos} />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Seal Photos</h4>
                <DocumentUploader category="SEAL_PHOTO" label="Upload seal photo" action={uploadDocument} />
                <DocumentList documents={sealPhotos} />
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
