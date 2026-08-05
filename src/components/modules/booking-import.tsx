"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookingForm } from "@/components/modules/booking-form";
import { api } from "@/lib/api/client";
import { downloadCsv, toCsv } from "@/lib/csv";
import {
  BOOKING_FIELD_LABELS,
  extractBookingFieldsFromText,
  extractPdfText,
  mapRowToBooking,
  parseSpreadsheetFile,
  type BookingImportValues,
} from "@/lib/booking-import";
import type { Customer } from "@prisma/client";

interface PreviewRow {
  values: BookingImportValues;
  customerId: string | null;
  customerNameRaw: string;
}

const SAMPLE_HEADERS = ["Consignee", "Agent Name", "POL", "POD", "Shipping Line", "Vessel", "ETD", "ETA", "Freight Terms", "Commodity", "Delivery Date"];

export function BookingImport({ customers }: { customers: Customer[] }) {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [mode, setMode] = React.useState<"picker" | "spreadsheet" | "pdf">("picker");
  const [fileName, setFileName] = React.useState("");
  const [isParsing, setIsParsing] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);
  const [results, setResults] = React.useState<{ success: number; failed: number } | null>(null);

  const [pdfValues, setPdfValues] = React.useState<BookingImportValues | null>(null);
  const [pdfCustomerId, setPdfCustomerId] = React.useState<string | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setResults(null);
    setFileName(file.name);
    setIsParsing(true);
    try {
      if (/\.pdf$/i.test(file.name)) {
        const text = await extractPdfText(file);
        const { values, customerId } = extractBookingFieldsFromText(text, customers);
        if (Object.keys(values).length === 0 && !customerId) {
          setParseError(
            "Couldn't find any recognizable booking details in this PDF — the fields below are blank, fill them in manually."
          );
        }
        setPdfValues(values);
        setPdfCustomerId(customerId);
        setMode("pdf");
      } else {
        const parsed = await parseSpreadsheetFile(file);
        if (parsed.length === 0) {
          setParseError("No rows found in that file.");
          return;
        }
        const mapped = parsed.map((row) => {
          const { values, customerId, customerNameRaw } = mapRowToBooking(row, customers);
          return { values, customerId, customerNameRaw };
        });
        setRows(mapped);
        setMode("spreadsheet");
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Couldn't read that file.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleCreateAll() {
    setIsCreating(true);
    let success = 0;
    let failed = 0;
    for (const row of rows) {
      if (!row.customerId) {
        failed++;
        continue;
      }
      try {
        await api.post("/api/bookings", { customerId: row.customerId, ...row.values });
        success++;
      } catch {
        failed++;
      }
    }
    setIsCreating(false);
    setResults({ success, failed });
    if (success > 0) {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    }
  }

  function downloadSample() {
    const csv = toCsv(SAMPLE_HEADERS, [
      [
        "Acme Exports Pvt Ltd",
        "Acme Exports",
        "Mundra, India",
        "Rotterdam, Netherlands",
        "Maersk",
        "MAERSK EDMONTON",
        "2026-08-20",
        "2026-09-15",
        "FOB",
        "Cotton Textiles",
        "2026-09-20",
      ],
    ]);
    downloadCsv("booking-import-template.csv", csv);
  }

  function reset() {
    setMode("picker");
    setFileName("");
    setParseError(null);
    setRows([]);
    setResults(null);
    setPdfValues(null);
    setPdfCustomerId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const readyCount = rows.filter((r) => r.customerId).length;

  if (mode === "pdf") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            Auto-filled from <span className="font-medium text-foreground">{fileName}</span>
          </p>
          <Button variant="ghost" size="sm" onClick={reset}>
            Choose a different file
          </Button>
        </div>
        {parseError && <p className="text-sm text-amber-600">{parseError}</p>}
        <BookingForm
          customers={customers}
          initialValues={pdfValues ?? undefined}
          initialCustomerId={pdfCustomerId}
        />
      </div>
    );
  }

  if (mode === "spreadsheet") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="size-4" />
            {rows.length} row{rows.length === 1 ? "" : "s"} parsed from{" "}
            <span className="font-medium text-foreground">{fileName}</span>
          </p>
          <Button variant="ghost" size="sm" onClick={reset}>
            Choose a different file
          </Button>
        </div>

        {results ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <p className="text-sm">
                Created <span className="font-semibold">{results.success}</span> booking
                {results.success === 1 ? "" : "s"}
                {results.failed > 0 && (
                  <>
                    {" "}
                    — <span className="font-semibold text-destructive">{results.failed}</span> row
                    {results.failed === 1 ? "" : "s"} failed (missing/unmatched consignee or a
                    rejected request)
                  </>
                )}
                .
              </p>
              <div className="flex gap-2">
                <Button nativeButton={false} render={<Link href="/bookings" />}>
                  Go to Bookings
                </Button>
                <Button variant="outline" onClick={reset}>
                  Import another file
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consignee</TableHead>
                    {Object.values(BOOKING_FIELD_LABELS).map((label) => (
                      <TableHead key={label}>{label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {row.customerId ? (
                          <Badge variant="secondary">
                            {customers.find((c) => c.id === row.customerId)?.name}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="size-3" />
                            {row.customerNameRaw ? `"${row.customerNameRaw}" not found` : "No consignee"}
                          </Badge>
                        )}
                      </TableCell>
                      {(Object.keys(BOOKING_FIELD_LABELS) as (keyof BookingImportValues)[]).map(
                        (key) => (
                          <TableCell key={key} className="whitespace-nowrap text-sm">
                            {row.values[key] || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Rows with an unmatched consignee will be skipped — fix the name in your file (or add
              the consignee first) and re-import if needed.
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreateAll} disabled={isCreating || readyCount === 0}>
                {isCreating ? (
                  <>
                    <Loader2 className="animate-spin" /> Creating…
                  </>
                ) : (
                  `Create ${readyCount} Booking${readyCount === 1 ? "" : "s"}`
                )}
              </Button>
              <Button variant="outline" onClick={reset} disabled={isCreating}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-dashed"
      >
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          {isParsing ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-8 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Drop a file here, or browse</p>
            <p className="text-xs text-muted-foreground">
              Excel (.xlsx), CSV, or a PDF booking confirmation — details are auto-filled for you.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
          >
            Browse files
          </Button>
        </CardContent>
      </Card>

      {parseError && <p className="text-sm text-destructive">{parseError}</p>}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Excel/CSV imports create multiple bookings at once. A PDF pre-fills one booking for you to review.</span>
        <Button variant="ghost" size="sm" onClick={downloadSample}>
          <Download className="size-3.5" />
          Sample template
        </Button>
      </div>
    </div>
  );
}
