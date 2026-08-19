"use client";

import * as React from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload, Download, CheckCircle2, AlertTriangle, ArrowLeft, FileSpreadsheet,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api/client";

interface ParsedRow {
  rowNumber: number;
  name: string;
  sku: string;
  hsnCode: string;
  category: string;
  unit: string;
  openingStock: number | null;
  reorderLevel: number | null;
  unitValue: number | null;
  location: string;
  supplier: string;
  supplierContact: string;
  notes: string;
  errors: string[];
}

interface ImportResult {
  created: number;
  errors: { row: number; name: string; error: string }[];
}

const HEADERS = [
  "Item Name", "SKU", "HSN Code", "Category", "Unit",
  "Opening Stock", "Reorder Level", "Unit Value",
  "Location", "Supplier", "Supplier Contact", "Notes",
];

const norm = (s: unknown) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  itemname: "name", name: "name", item: "name",
  sku: "sku", code: "sku", skucode: "sku",
  hsncode: "hsnCode", hsn: "hsnCode",
  category: "category", cat: "category",
  unit: "unit", uom: "unit",
  openingstock: "openingStock", opening: "openingStock", initialstock: "openingStock",
  reorderlevel: "reorderLevel", reorder: "reorderLevel", reorderpoint: "reorderLevel",
  unitvalue: "unitValue", valuepunit: "unitValue", priceperunit: "unitValue",
  location: "location", warehouse: "location",
  supplier: "supplier", vendorname: "supplier", vendor: "supplier",
  suppliercontact: "supplierContact", vendorcontact: "supplierContact", contact: "supplierContact",
  notes: "notes", remarks: "notes",
};

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function InventoryImportPage() {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const queryClient = useQueryClient();

  function downloadTemplate() {
    const example = [
      "Corrugated Box 5-Ply", "BOX-5P-L", "4819100", "Packaging", "PCS",
      500, 100, 12.50, "Shed A", "Mehta Packaging", "+91 98765 43210", "Large size",
    ];
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, example]);
    ws["!cols"] = HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "inventory-import-template.xlsx");
  }

  function handleFile(file: File) {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) throw new Error("No sheet found");

        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        if (rawRows.length === 0) throw new Error("No data rows found");

        // Build column map from first row headers
        const firstRow = rawRows[0];
        const colMap: Record<string, keyof ParsedRow> = {};
        for (const key of Object.keys(firstRow)) {
          const mapped = HEADER_MAP[norm(key)];
          if (mapped) colMap[key] = mapped;
        }

        const parsed: ParsedRow[] = rawRows.map((raw, idx) => {
          const get = (field: keyof ParsedRow): string => {
            const col = Object.keys(colMap).find((k) => colMap[k] === field);
            return col ? String(raw[col] ?? "").trim() : "";
          };
          const getNum = (field: keyof ParsedRow): number | null => {
            const col = Object.keys(colMap).find((k) => colMap[k] === field);
            return col ? toNum(raw[col]) : null;
          };

          const errors: string[] = [];
          const name = get("name");
          const unit = get("unit");
          if (!name) errors.push("Item Name is required");
          if (!unit) errors.push("Unit is required");

          return {
            rowNumber: idx + 1,
            name,
            sku: get("sku"),
            hsnCode: get("hsnCode"),
            category: get("category"),
            unit,
            openingStock: getNum("openingStock"),
            reorderLevel: getNum("reorderLevel"),
            unitValue: getNum("unitValue"),
            location: get("location"),
            supplier: get("supplier"),
            supplierContact: get("supplierContact"),
            notes: get("notes"),
            errors,
          };
        });

        setRows(parsed);
        setFileName(file.name);
        const ok = parsed.filter((r) => r.errors.length === 0).length;
        toast.success(`Read ${parsed.length} row(s) — ${ok} ready.`);
      } catch (err) {
        toast.error(`Could not read file: ${(err as Error).message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const importMutation = useMutation({
    mutationFn: (items: object[]) =>
      api.post<ImportResult>("/api/inventory/bulk-import", { items }),
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      if (res.errors.length === 0) toast.success(`Imported ${res.created} items.`);
      else toast.warning(`${res.created} created, ${res.errors.length} failed.`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Import failed");
    },
  });

  function runImport() {
    const valid = rows.filter((r) => r.errors.length === 0);
    if (valid.length === 0) { toast.error("No valid rows to import."); return; }
    importMutation.mutate(
      valid.map((r) => ({
        name: r.name,
        sku: r.sku || undefined,
        hsnCode: r.hsnCode || undefined,
        category: r.category || undefined,
        unit: r.unit,
        openingStock: r.openingStock ?? undefined,
        reorderLevel: r.reorderLevel ?? undefined,
        unitValue: r.unitValue ?? undefined,
        location: r.location || undefined,
        supplier: r.supplier || undefined,
        supplierContact: r.supplierContact || undefined,
        notes: r.notes || undefined,
      }))
    );
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.length - validCount;

  return (
    <>
      <PageHeader
        title="Import Inventory from Excel"
        description="Upload an .xlsx or .csv file to create items and set opening stock in bulk."
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/inventory" />}>
            <ArrowLeft className="size-4" />
            Back to inventory
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              Choose file
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="size-4" />
              Download template
            </Button>
            {fileName && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileSpreadsheet className="size-4" />
                {fileName}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Required columns: <strong>Item Name</strong>, <strong>Unit</strong>. All other
            columns are optional. If <strong>Opening Stock</strong> is provided and greater
            than 0, a stock-in movement is recorded automatically.
          </p>
        </CardContent>
      </Card>

      {rows.length > 0 && !result && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="border-success/40 text-success">
                  {validCount} ready
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    {errorCount} with errors
                  </Badge>
                )}
                <span className="text-muted-foreground">· {rows.length} total</span>
              </div>
              <Button onClick={runImport} disabled={importMutation.isPending || validCount === 0}>
                {importMutation.isPending ? "Importing…" : `Import ${validCount} item(s)`}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Item Name</th>
                    <th className="py-2 pr-3">SKU</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Unit</th>
                    <th className="py-2 pr-3 text-right">Opening Stock</th>
                    <th className="py-2 pr-3">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.rowNumber}
                      className={`border-b align-top ${r.errors.length > 0 ? "bg-destructive/5" : ""}`}
                    >
                      <td className="py-2 pr-3 text-muted-foreground">{r.rowNumber}</td>
                      <td className="py-2 pr-3 font-medium">{r.name || "—"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.sku || "—"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.category || "—"}</td>
                      <td className="py-2 pr-3">{r.unit || "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {r.openingStock != null ? r.openingStock : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.errors.length === 0 ? (
                          <span className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="size-4" /> Ready
                          </span>
                        ) : (
                          <span className="flex items-start gap-1 text-destructive">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <span className="text-xs">{r.errors.join("; ")}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-semibold">Import complete</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-success/40 text-success">
                {result.created} created
              </Badge>
              {result.errors.length > 0 && (
                <Badge variant="outline" className="border-destructive/40 text-destructive">
                  {result.errors.length} failed
                </Badge>
              )}
            </div>
            {result.errors.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Row</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e) => (
                    <tr key={e.row} className="border-b">
                      <td className="py-2 pr-3 text-muted-foreground">{e.row}</td>
                      <td className="py-2 pr-3">{e.name}</td>
                      <td className="py-2 pr-3 text-xs text-destructive">{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex gap-2">
              <Button nativeButton={false} render={<Link href="/inventory" />}>
                View inventory
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); setRows([]); setFileName(null); }}>
                Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
