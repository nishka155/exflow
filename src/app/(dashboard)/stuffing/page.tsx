"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Container, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import type { Booking, Customer, Transporter } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContainerDetailsSheet } from "@/components/modules/container-details-sheet";
import { AuthGuard } from "@/components/auth/auth-guard";
import { api, ApiError } from "@/lib/api/client";
import { STUFFING_STATUS_CONFIG, type StuffingStatus } from "@/lib/constants/statuses";

interface StuffingRow {
  id: string;
  containerNumber: string;
  containerSize: string;
  sealNumber: string | null;
  numberOfBoxes: number | null;
  numberOfBlocks: number | null;
  grossWeight: string | null;
  netWeight: string | null;
  pol: string;
  pod: string;
  deliveryDate: string | null;
  lrGrNumber: string | null;
  status: string;
  gateIn: { id: string } | null;
  booking: { id: string; bookingNumber: string; customer: { name: string } };
}

type BookingOption = Booking & { customer: Customer };

const CONTAINER_SIZES = [
  { value: "FT20", label: "20 FT" },
  { value: "FT40", label: "40 FT" },
  { value: "FT40_HC", label: "40 HC" },
];

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function EditableCell({
  value,
  onSave,
  type = "text",
  placeholder,
  className,
}: {
  value: string;
  onSave: (next: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = React.useState(value);

  React.useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <Input
      type={type}
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onSave(local);
      }}
      className={className ?? "h-8 min-w-[6.5rem] text-xs"}
    />
  );
}

function StuffingPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const queryClient = useQueryClient();

  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [pickBookingOpen, setPickBookingOpen] = React.useState(false);
  const [pickedBookingId, setPickedBookingId] = React.useState("");

  const { data: stuffings, isLoading, error } = useQuery({
    queryKey: ["stuffings", { bookingId }],
    queryFn: () =>
      api.get<StuffingRow[]>(`/api/stuffing${bookingId ? `?bookingId=${bookingId}` : ""}`),
  });

  const { data: booking } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => api.get<{ bookingNumber: string; customer: { name: string } }>(`/api/bookings/${bookingId}`),
    enabled: !!bookingId,
  });

  const { data: transporters } = useQuery({
    queryKey: ["transporters"],
    queryFn: () => api.get<Transporter[]>("/api/transporters"),
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingOption[]>("/api/bookings"),
    enabled: pickBookingOpen,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["stuffings"] });
  }

  const addMutation = useMutation({
    mutationFn: (targetBookingId: string) =>
      api.post<{ id: string }>("/api/stuffing", { bookingId: targetBookingId }),
    onSuccess: (data) => {
      invalidate();
      setPickBookingOpen(false);
      setPickedBookingId("");
      setDrawerId(data.id);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not add container");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put(`/api/stuffing/${id}`, data),
    onSuccess: () => invalidate(),
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not save change");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/stuffing/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast.success("Container deleted");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not delete container");
      setDeleteId(null);
    },
  });

  function handleAddContainer() {
    if (bookingId) {
      addMutation.mutate(bookingId);
    } else {
      setPickBookingOpen(true);
    }
  }

  function saveField(id: string, field: string, value: string, numeric = false) {
    updateMutation.mutate({
      id,
      data: { [field]: value === "" ? null : numeric ? Number(value) : value },
    });
  }

  return (
    <div>
      <PageHeader
        title="Factory Stuffing"
        description={
          booking
            ? `${booking.bookingNumber} · ${booking.customer.name}`
            : "Record container stuffing at the factory — every row is a container."
        }
        actions={
          <Button onClick={handleAddContainer} disabled={addMutation.isPending}>
            <Plus />
            Add Container
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load stuffing records. Please try again.
        </p>
      ) : !stuffings || stuffings.length === 0 ? (
        <EmptyState
          icon={Container}
          title="No containers yet"
          description="Add a container to start recording factory stuffing."
          action={
            <Button onClick={handleAddContainer}>
              <Plus />
              Add Container
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container No.</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Seal No.</TableHead>
                <TableHead>Packages</TableHead>
                <TableHead>Blocks</TableHead>
                <TableHead>Gross Wt.</TableHead>
                <TableHead>Net Wt.</TableHead>
                <TableHead>POL</TableHead>
                <TableHead>POD</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>LR/GR No.</TableHead>
                {!bookingId && <TableHead>Booking</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stuffings.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <EditableCell
                      value={s.containerNumber}
                      onSave={(v) => saveField(s.id, "containerNumber", v)}
                      className="h-8 min-w-[8rem] font-medium text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={s.containerSize}
                      onValueChange={(v) => v && saveField(s.id, "containerSize", v)}
                    >
                      <SelectTrigger className="h-8 w-[5.5rem] text-xs">
                        <SelectValue>
                          {(value: string | null) =>
                            CONTAINER_SIZES.find((c) => c.value === value)?.label ?? null
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CONTAINER_SIZES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={s.sealNumber ?? ""}
                      onSave={(v) => saveField(s.id, "sealNumber", v)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      type="number"
                      value={s.numberOfBoxes?.toString() ?? ""}
                      onSave={(v) => saveField(s.id, "numberOfBoxes", v, true)}
                      className="h-8 w-20 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      type="number"
                      value={s.numberOfBlocks?.toString() ?? ""}
                      onSave={(v) => saveField(s.id, "numberOfBlocks", v, true)}
                      className="h-8 w-20 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      type="number"
                      value={s.grossWeight ?? ""}
                      onSave={(v) => saveField(s.id, "grossWeight", v, true)}
                      className="h-8 w-24 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      type="number"
                      value={s.netWeight ?? ""}
                      onSave={(v) => saveField(s.id, "netWeight", v, true)}
                      className="h-8 w-24 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell value={s.pol} onSave={(v) => saveField(s.id, "pol", v)} />
                  </TableCell>
                  <TableCell>
                    <EditableCell value={s.pod} onSave={(v) => saveField(s.id, "pod", v)} />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      type="date"
                      value={toDateInput(s.deliveryDate)}
                      onSave={(v) => saveField(s.id, "deliveryDate", v)}
                      className="h-8 w-36 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={s.lrGrNumber ?? ""}
                      onSave={(v) => saveField(s.id, "lrGrNumber", v)}
                    />
                  </TableCell>
                  {!bookingId && (
                    <TableCell className="text-xs">
                      <Link href={`/bookings/${s.booking.id}`} className="text-brand hover:underline">
                        {s.booking.bookingNumber}
                      </Link>
                      <p className="text-muted-foreground">{s.booking.customer.name}</p>
                    </TableCell>
                  )}
                  <TableCell>
                    <StatusBadge config={STUFFING_STATUS_CONFIG[s.status as StuffingStatus]} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="View"
                        onClick={() => setDrawerId(s.id)}
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit"
                        onClick={() => setDrawerId(s.id)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContainerDetailsSheet
        stuffingId={drawerId}
        transporters={transporters ?? []}
        onOpenChange={(open) => !open && setDrawerId(null)}
      />

      <Dialog open={pickBookingOpen} onOpenChange={setPickBookingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Container</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Select value={pickedBookingId} onValueChange={(v) => v && setPickedBookingId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a booking">
                  {(value: string | null) => {
                    const b = bookings?.find((b) => b.id === value);
                    return b ? `${b.bookingNumber} · ${b.customer.name}` : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bookings?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.bookingNumber} · {b.customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickBookingOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!pickedBookingId || addMutation.isPending}
              onClick={() => addMutation.mutate(pickedBookingId)}
            >
              {addMutation.isPending ? "Adding…" : "Add Container"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this container?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the container record. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function StuffingPage() {
  return (
    <AuthGuard>
      <React.Suspense fallback={null}>
        <StuffingPageContent />
      </React.Suspense>
    </AuthGuard>
  );
}
