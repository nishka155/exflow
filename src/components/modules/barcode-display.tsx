"use client";

import * as React from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeDisplayProps {
  value: string;
  label?: string;
  showPrint?: boolean;
}

export function BarcodeDisplay({ value, label, showPrint = true }: BarcodeDisplayProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 8,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // Invalid barcode value — render nothing
    }
  }, [value]);

  function handlePrint() {
    if (!svgRef.current) return;
    const svgHtml = svgRef.current.outerHTML;
    const win = window.open("", "_blank", "width=400,height=300");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode — ${label ?? value}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
            h2 { font-size: 14px; margin: 0 0 8px; }
            svg { display: block; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          ${label ? `<h2>${label}</h2>` : ""}
          ${svgHtml}
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  if (!value) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-lg border bg-white p-3">
        <svg ref={svgRef} />
      </div>
      {showPrint && (
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-3.5" />
          Print Label
        </Button>
      )}
    </div>
  );
}
