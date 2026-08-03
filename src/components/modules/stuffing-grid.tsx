"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Copy,
  Trash2,
  Search,
  Upload,
  Download,
} from "lucide-react";
import type { Transporter } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api/client";
import { parseCsv, toCsv, downloadCsv } from "@/lib/csv";

export interface StuffingRow {
  id: string;
  containerNumber: string;
  containerSize: string;
  commodity: string | null;
  sealNumber: string | null;
  numberOfBoxes: number | null;
  numberOfBlocks: number | null;
  grossWeight: string | null;
  netWeight: string | null;
  pol: string;
  pod: string;
  deliveryDate: string | null;
  transporterId: string | null;
  contactNumber: string | null;
  stuffingStartTime: string | null;
  status: string;
}

const CONTAINER_SIZES = [
  { value: "FT20", label: "20 FT" },
  { value: "FT40", label: "40 FT" },
  { value: "FT40_HC", label: "40 HC" },
];

const STATUSES = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

const CSV_HEADERS = [
  "Container No.",
  "Size",
  "Commodity",
  "Seal No.",
  "Packages",
  "Blocks",
  "Gross Weight",
  "Net Weight",
  "POL",
  "POD",
  "Delivery Date",
  "Contact No.",
  "Stuffing Date",
  "Status",
];

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// Column order for the text/number/date inputs that participate in
// left/right arrow-key navigation (select-based cells — size, transporter,
// status — are reached by Tab instead, since they aren't text inputs).
const NAV_COLUMNS = [
  "containerNumber",
  "commodity",
  "sealNumber",
  "numberOfBoxes",
  "numberOfBlocks",
  "grossWeight",
  "netWeight",
  "pol",
  "pod",
  "deliveryDate",
  "contactNumber",
  "stuffingStartTime",
];

function focusCell(container: HTMLElement | null, row: number, col: string) {
  const el = container?.querySelector<HTMLInputElement>(
    `input[data-row="${row}"][data-col="${col}"]`
  );
  el?.focus();
  el?.select();
}

function focusAdjacentColumn(container: HTMLElement | null, row: number, col: string, dir: 1 | -1) {
  const idx = NAV_COLUMNS.indexOf(col);
  const nextCol = NAV_COLUMNS[idx + dir];
  if (nextCol) focusCell(container, row, nextCol);
}

function GridInput({
  value,
  onSave,
  type = "text",
  rowIndex,
  colKey,
  containerRef,
  className,
}: {
  value: string;
  onSave: (next: string) => void;
  type?: string;
  rowIndex: number;
  colKey: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const [local, setLocal] = React.useState(value);

  React.useEffect(() => {
    setLocal(value);
  }, [value]);

  function commit() {
    if (local !== value) onSave(local);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      focusCell(containerRef.current, rowIndex + 1, colKey);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(containerRef.current, rowIndex - 1, colKey);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(containerRef.current, rowIndex + 1, colKey);
    } else if (e.key === "ArrowLeft") {
      const input = e.currentTarget;
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault();
        focusAdjacentColumn(containerRef.current, rowIndex, colKey, -1);
      }
    } else if (e.key === "ArrowRight") {
      const input = e.currentTarget;
      if (
        input.selectionStart === input.value.length &&
        input.selectionEnd === input.value.length
      ) {
        e.preventDefault();
        focusAdjacentColumn(containerRef.current, rowIndex, colKey, 1);
      }
    }
  }

  return (
    <Input
      type={type}
      value={local}
      data-row={rowIndex}
      data-col={colKey}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={className ?? "h-8 min-w-[6rem] text-xs"}
    />
  );
}

export function StuffingGrid({
  rows,
  transporters,
  bookingId,
  onAdded,
}: {
  rows: StuffingRow[];
  transporters: Transporter[];
  bookingId: string;
  onAdded?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [sizeFilter, setSizeFilter] = React.useState("ALL");
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  const queryKey = React.useMemo(() => ["stuffings", { bookingId }] as const, [bookingId]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["stuffings"] });
  }

  // Patch the already-loaded row list directly from each mutation's response
  // instead of invalidating + refetching the whole booking's containers —
  // editing one cell in a 30-row grid shouldn't cost a full round-trip and
  // full re-render just to reflect that one change.
  function patchRow(updated: StuffingRow) {
    queryClient.setQueryData<StuffingRow[]>(queryKey, (old) =>
      old?.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<StuffingRow>(`/api/stuffing/${id}`, data),
    onSuccess: patchRow,
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not save change");
      invalidate();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post<StuffingRow>(`/api/stuffing/${id}/status`, { status }),
    onSuccess: patchRow,
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Invalid status transition");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/stuffing/${id}`),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<StuffingRow[]>(queryKey, (old) => old?.filter((r) => r.id !== id));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<StuffingRow>("/api/stuffing", data),
    onSuccess: (created) => {
      queryClient.setQueryData<StuffingRow[]>(queryKey, (old) =>
        old ? [created, ...old] : [created]
      );
      onAdded?.(created.id);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Could not duplicate container");
    },
  });

  function saveField(id: string, field: string, value: string, numeric = false) {
    updateMutation.mutate({
      id,
      data: { [field]: value === "" ? null : numeric ? Number(value) : value },
    });
  }

  function handleDuplicate(row: StuffingRow) {
    duplicateMutation.mutate({
      bookingId,
      containerNumber: row.containerNumber ? `${row.containerNumber} (Copy)` : undefined,
      containerSize: row.containerSize,
      commodity: row.commodity || undefined,
      sealNumber: row.sealNumber || undefined,
      contactNumber: row.contactNumber || undefined,
      transporterId: row.transporterId || undefined,
      pol: row.pol || undefined,
      pod: row.pod || undefined,
      numberOfBoxes: row.numberOfBoxes ?? undefined,
      numberOfBlocks: row.numberOfBlocks ?? undefined,
      grossWeight: row.grossWeight ?? undefined,
      netWeight: row.netWeight ?? undefined,
    });
  }

  async function handleBulkDelete(ids: string[]) {
    const results = await Promise.allSettled(ids.map((id) => deleteMutation.mutateAsync(id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) invalidate();
    setRowSelection({});
    if (failed === 0) {
      toast.success(`Deleted ${ids.length} container${ids.length === 1 ? "" : "s"}`);
    } else {
      toast.error(
        `Deleted ${ids.length - failed} of ${ids.length} — ${failed} could not be deleted (likely already gated in)`
      );
    }
  }

  function handleExport() {
    const visibleRows = table.getRowModel().rows.map((r) => r.original);
    const csvRows = visibleRows.map((r) => [
      r.containerNumber,
      r.containerSize,
      r.commodity ?? "",
      r.sealNumber ?? "",
      r.numberOfBoxes?.toString() ?? "",
      r.numberOfBlocks?.toString() ?? "",
      r.grossWeight ?? "",
      r.netWeight ?? "",
      r.pol,
      r.pod,
      toDateInput(r.deliveryDate),
      r.contactNumber ?? "",
      toDateInput(r.stuffingStartTime),
      r.status,
    ]);
    downloadCsv("factory-stuffing.csv", toCsv(CSV_HEADERS, csvRows));
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const records = parseCsv(text);
    if (records.length === 0) {
      toast.error("No rows found in file");
      return;
    }
    let created = 0;
    for (const rec of records) {
      try {
        await api.post("/api/stuffing", {
          bookingId,
          containerNumber: rec["Container No."] || undefined,
          containerSize: rec["Size"]?.replace(" ", "_").toUpperCase() || undefined,
          commodity: rec["Commodity"] || undefined,
          sealNumber: rec["Seal No."] || undefined,
          numberOfBoxes: rec["Packages"] || undefined,
          numberOfBlocks: rec["Blocks"] || undefined,
          grossWeight: rec["Gross Weight"] || undefined,
          netWeight: rec["Net Weight"] || undefined,
          pol: rec["POL"] || undefined,
          pod: rec["POD"] || undefined,
          deliveryDate: rec["Delivery Date"] || undefined,
          contactNumber: rec["Contact No."] || undefined,
        });
        created++;
      } catch {
        // continue importing remaining rows
      }
    }
    invalidate();
    toast.success(`Imported ${created} of ${records.length} rows`);
  }

  const columns = React.useMemo<ColumnDef<StuffingRow>[]>(
    () => [
      {
        id: "select",
        size: 32,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
          />
        ),
      },
      {
        accessorKey: "containerNumber",
        header: "Container No.",
        cell: ({ row }) => (
          <GridInput
            value={row.original.containerNumber}
            rowIndex={row.index}
            colKey="containerNumber"
            containerRef={containerRef}
            className="h-8 min-w-[8rem] font-medium text-xs"
            onSave={(v) => saveField(row.original.id, "containerNumber", v)}
          />
        ),
      },
      {
        accessorKey: "containerSize",
        header: "Size",
        cell: ({ row }) => (
          <Select
            value={row.original.containerSize}
            onValueChange={(v) => v && saveField(row.original.id, "containerSize", v)}
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
        ),
      },
      {
        accessorKey: "commodity",
        header: "Commodity",
        cell: ({ row }) => (
          <GridInput
            value={row.original.commodity ?? ""}
            rowIndex={row.index}
            colKey="commodity"
            containerRef={containerRef}
            onSave={(v) => saveField(row.original.id, "commodity", v)}
          />
        ),
      },
      {
        accessorKey: "sealNumber",
        header: "Seal No.",
        cell: ({ row }) => (
          <GridInput
            value={row.original.sealNumber ?? ""}
            rowIndex={row.index}
            colKey="sealNumber"
            containerRef={containerRef}
            onSave={(v) => saveField(row.original.id, "sealNumber", v)}
          />
        ),
      },
      {
        accessorKey: "numberOfBoxes",
        header: "Packages",
        cell: ({ row }) => (
          <GridInput
            type="number"
            value={row.original.numberOfBoxes?.toString() ?? ""}
            rowIndex={row.index}
            colKey="numberOfBoxes"
            containerRef={containerRef}
            className="h-8 w-20 text-xs"
            onSave={(v) => saveField(row.original.id, "numberOfBoxes", v, true)}
          />
        ),
      },
      {
        accessorKey: "numberOfBlocks",
        header: "Blocks",
        cell: ({ row }) => (
          <GridInput
            type="number"
            value={row.original.numberOfBlocks?.toString() ?? ""}
            rowIndex={row.index}
            colKey="numberOfBlocks"
            containerRef={containerRef}
            className="h-8 w-20 text-xs"
            onSave={(v) => saveField(row.original.id, "numberOfBlocks", v, true)}
          />
        ),
      },
      {
        accessorKey: "grossWeight",
        header: "Gross Weight",
        cell: ({ row }) => (
          <GridInput
            type="number"
            value={row.original.grossWeight ?? ""}
            rowIndex={row.index}
            colKey="grossWeight"
            containerRef={containerRef}
            className="h-8 w-24 text-xs"
            onSave={(v) => saveField(row.original.id, "grossWeight", v, true)}
          />
        ),
      },
      {
        accessorKey: "netWeight",
        header: "Net Weight",
        cell: ({ row }) => (
          <GridInput
            type="number"
            value={row.original.netWeight ?? ""}
            rowIndex={row.index}
            colKey="netWeight"
            containerRef={containerRef}
            className="h-8 w-24 text-xs"
            onSave={(v) => saveField(row.original.id, "netWeight", v, true)}
          />
        ),
      },
      {
        accessorKey: "pol",
        header: "POL",
        cell: ({ row }) => (
          <GridInput
            value={row.original.pol}
            rowIndex={row.index}
            colKey="pol"
            containerRef={containerRef}
            onSave={(v) => saveField(row.original.id, "pol", v)}
          />
        ),
      },
      {
        accessorKey: "pod",
        header: "POD",
        cell: ({ row }) => (
          <GridInput
            value={row.original.pod}
            rowIndex={row.index}
            colKey="pod"
            containerRef={containerRef}
            onSave={(v) => saveField(row.original.id, "pod", v)}
          />
        ),
      },
      {
        accessorKey: "deliveryDate",
        header: "Delivery Date",
        cell: ({ row }) => (
          <GridInput
            type="date"
            value={toDateInput(row.original.deliveryDate)}
            rowIndex={row.index}
            colKey="deliveryDate"
            containerRef={containerRef}
            className="h-8 w-36 text-xs"
            onSave={(v) => saveField(row.original.id, "deliveryDate", v)}
          />
        ),
      },
      {
        accessorKey: "transporterId",
        header: "Transporter",
        cell: ({ row }) => (
          <Select
            value={row.original.transporterId ?? ""}
            onValueChange={(v) => saveField(row.original.id, "transporterId", v ?? "")}
          >
            <SelectTrigger className="h-8 w-[9rem] text-xs">
              <SelectValue placeholder="—">
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
        ),
      },
      {
        accessorKey: "contactNumber",
        header: "Contact No.",
        cell: ({ row }) => (
          <GridInput
            value={row.original.contactNumber ?? ""}
            rowIndex={row.index}
            colKey="contactNumber"
            containerRef={containerRef}
            onSave={(v) => saveField(row.original.id, "contactNumber", v)}
          />
        ),
      },
      {
        accessorKey: "stuffingStartTime",
        header: "Stuffing Date",
        cell: ({ row }) => (
          <GridInput
            type="date"
            value={toDateInput(row.original.stuffingStartTime)}
            rowIndex={row.index}
            colKey="stuffingStartTime"
            containerRef={containerRef}
            className="h-8 w-36 text-xs"
            onSave={(v) => saveField(row.original.id, "stuffingStartTime", v)}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Select
            value={row.original.status}
            onValueChange={(v) => v && statusMutation.mutate({ id: row.original.id, status: v })}
          >
            <SelectTrigger className="h-8 w-[8rem] text-xs">
              <SelectValue>
                {(value: string | null) => STATUSES.find((s) => s.value === value)?.label ?? null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Duplicate"
              onClick={() => handleDuplicate(row.original)}
            >
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete"
              onClick={() => handleBulkDelete([row.original.id])}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transporters]
  );

  const filteredRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (sizeFilter !== "ALL" && r.containerSize !== sizeFilter) return false;
      return true;
    });
  }, [rows, statusFilter, sizeFilter]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase();
      const r = row.original;
      return [
        r.containerNumber,
        r.commodity,
        r.sealNumber,
        r.pol,
        r.pod,
        r.contactNumber,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    },
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search containers…"
            className="h-8 w-56 pl-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="h-8 w-[9rem] text-xs">
            <SelectValue>
              {(value: string | null) =>
                value === "ALL" ? "All statuses" : STATUSES.find((s) => s.value === value)?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sizeFilter} onValueChange={(v) => v && setSizeFilter(v)}>
          <SelectTrigger className="h-8 w-[8rem] text-xs">
            <SelectValue>
              {(value: string | null) =>
                value === "ALL" ? "All sizes" : CONTAINER_SIZES.find((s) => s.value === value)?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sizes</SelectItem>
            {CONTAINER_SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => handleBulkDelete(selectedIds)}>
              <Trash2 />
              Delete {selectedIds.length}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download />
            Export
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="max-h-[70vh] overflow-auto rounded-lg border">
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-background [&_tr]:border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-9 whitespace-nowrap bg-background px-2 text-left align-middle text-xs font-medium text-foreground"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ArrowUp className="size-3" />,
                          desc: <ArrowDown className="size-3" />,
                        }[header.column.getIsSorted() as string] ?? (
                          <ChevronsUpDown className="size-3 text-muted-foreground/50" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                  No containers match your filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-1 align-middle whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
