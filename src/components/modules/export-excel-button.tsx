"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportExcelButton({
  data,
  filename,
}: {
  data: Record<string, unknown>[];
  filename: string;
}) {
  async function handleExport() {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
      <Download />
      Export to Excel
    </Button>
  );
}
