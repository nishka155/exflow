import { parseCsv } from "@/lib/csv";

/** The subset of Booking fields we can reasonably auto-fill from an
 *  imported file. Matches the inputs on <BookingForm>. */
export interface BookingImportValues {
  exporterName?: string;
  buyerName?: string;
  pol?: string;
  pod?: string;
  shippingLine?: string;
  vessel?: string;
  etd?: string;
  eta?: string;
  freightTerms?: string;
  commodity?: string;
  deliveryDate?: string;
}

export const BOOKING_FIELD_LABELS: Record<keyof BookingImportValues, string> = {
  exporterName: "Exporter Name",
  buyerName: "Buyer Name",
  pol: "POL",
  pod: "POD",
  shippingLine: "Shipping Line",
  vessel: "Vessel",
  etd: "ETD",
  eta: "ETA",
  freightTerms: "Freight Terms",
  commodity: "Commodity",
  deliveryDate: "Delivery Date",
};

/** Header/label aliases used to recognize a column (Excel/CSV) or a
 *  "Label: value" line (PDF) as belonging to a given booking field.
 *  Order matters within a field's list — first match wins when several
 *  aliases could apply to the same text. Longest/most-specific aliases
 *  are listed first so e.g. "port of loading" beats a bare "port". */
const FIELD_ALIASES: Record<"customer" | keyof BookingImportValues, string[]> = {
  customer: ["customer name", "customer"],
  exporterName: ["exporter name", "exporter", "shipper name", "shipper"],
  buyerName: ["buyer name", "buyer", "consignee", "importer", "notify party"],
  pol: ["port of loading", "port of load", "loading port", "origin port", "pol"],
  pod: [
    "port of discharge",
    "port of destination",
    "discharge port",
    "destination port",
    "pod",
  ],
  shippingLine: ["shipping line", "steamship line", "carrier", "line"],
  vessel: ["vessel name", "vessel / voyage", "vessel", "ship name"],
  etd: [
    "estimated time of departure",
    "estimated departure",
    "departure date",
    "sailing date",
    "etd",
  ],
  eta: ["estimated time of arrival", "estimated arrival", "arrival date", "eta"],
  freightTerms: [
    "freight terms",
    "incoterms",
    "incoterm",
    "terms of sale",
    "payment terms",
  ],
  commodity: ["description of goods", "commodity description", "commodity", "goods", "product"],
  deliveryDate: ["expected delivery date", "cargo delivery date", "delivery date"],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[_\-.]/g, " ").replace(/\s+/g, " ").trim();
}

/** Best-effort date normalizer → "YYYY-MM-DD" for <input type="date">.
 *  Handles ISO, "DD/MM/YYYY" or "DD-MM-YYYY" (day-first, matches the
 *  export/logistics convention used elsewhere in this app), and
 *  worded dates like "4 Aug 2026" / "Aug 4, 2026". Returns undefined
 *  if nothing recognizable is found. */
export function normalizeDate(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slash) {
    let [, d, m, y] = slash;
    if (y.length === 2) y = `20${y}`;
    if (Number(d) > 12) {
      // unambiguous day-first
    } else if (Number(m) > 12) {
      [d, m] = [m, d];
    }
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    // Read back local (not UTC) components: Date.parse interprets
    // non-ISO strings like "4 Aug 2026" as local midnight, so
    // round-tripping through toISOString() (UTC) shifts the date by
    // a day in any timezone ahead of UTC. Local getters avoid that.
    const dt = new Date(parsed);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return undefined;
}

/** Reads a .csv, .xls, or .xlsx file and returns rows as header→value
 *  objects (first row = headers), using the `xlsx` package already
 *  used elsewhere in the app for Excel export. */
export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const isCsv = /\.csv$/i.test(file.name);
  if (isCsv) {
    const text = await file.text();
    return parseCsv(text);
  }
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim();
    }
    return out;
  });
}

/** Maps one parsed spreadsheet row to booking fields + a resolved
 *  customer, matching column headers loosely against FIELD_ALIASES and
 *  the "Customer" column against an existing customer by name. */
export function mapRowToBooking(
  row: Record<string, string>,
  customers: { id: string; name: string }[]
): { values: BookingImportValues; customerId: string | null; customerNameRaw: string } {
  const values: BookingImportValues = {};
  let customerNameRaw = "";

  for (const [header, rawValue] of Object.entries(row)) {
    const value = String(rawValue ?? "").trim();
    if (!value) continue;
    const normalized = normalizeHeader(header);

    if (FIELD_ALIASES.customer.some((a) => normalized === a)) {
      customerNameRaw = value;
      continue;
    }
    for (const field of Object.keys(FIELD_ALIASES) as (keyof typeof FIELD_ALIASES)[]) {
      if (field === "customer") continue;
      if (FIELD_ALIASES[field].some((a) => normalized === a)) {
        const key = field as keyof BookingImportValues;
        values[key] = key === "etd" || key === "eta" || key === "deliveryDate"
          ? normalizeDate(value) ?? value
          : value;
        break;
      }
    }
  }

  const customerId = matchCustomer(customerNameRaw, customers);
  return { values, customerId, customerNameRaw };
}

export function matchCustomer(
  nameRaw: string,
  customers: { id: string; name: string }[]
): string | null {
  if (!nameRaw) return null;
  const needle = nameRaw.trim().toLowerCase();
  const exact = customers.find((c) => c.name.trim().toLowerCase() === needle);
  if (exact) return exact.id;
  const partial = customers.find(
    (c) =>
      c.name.trim().toLowerCase().includes(needle) ||
      needle.includes(c.name.trim().toLowerCase())
  );
  return partial?.id ?? null;
}

/** Extracts raw text from every page of a PDF, client-side, via
 *  pdfjs-dist. Dynamically imported so it never lands in the main
 *  bundle for users who never touch the import flow. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Group items into lines by their y-position so "Label: value"
    // pairs that pdf.js splits into separate text runs stay together.
    const lines = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5]);
      const bucket = [...lines.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!lines.has(bucket)) lines.set(bucket, []);
      lines.get(bucket)!.push({ x: item.transform[4], text: item.str });
    }
    const ordered = [...lines.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, items] of ordered) {
      pageTexts.push(
        items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.text)
          .join(" ")
          .trim()
      );
    }
  }
  return pageTexts.filter(Boolean).join("\n");
}

/** Runs the same field-alias dictionary against free-form "Label: value"
 *  lines of extracted PDF text. Best-effort — always meant to prefill a
 *  form for human review, never to auto-submit. */
export function extractBookingFieldsFromText(
  text: string,
  customers: { id: string; name: string }[]
): { values: BookingImportValues; customerId: string | null; customerNameRaw: string } {
  const values: BookingImportValues = {};
  let customerNameRaw = "";
  const lines = text.split("\n");

  for (const line of lines) {
    const match = line.match(/^(.{2,40}?)\s*[:\-]\s*(.+)$/);
    if (!match) continue;
    const label = normalizeHeader(match[1]);
    const value = match[2].trim();
    if (!value) continue;

    if (FIELD_ALIASES.customer.some((a) => label === a) && !customerNameRaw) {
      customerNameRaw = value;
      continue;
    }
    for (const field of Object.keys(FIELD_ALIASES) as (keyof typeof FIELD_ALIASES)[]) {
      if (field === "customer") continue;
      const key = field as keyof BookingImportValues;
      if (values[key]) continue;
      if (FIELD_ALIASES[field].some((a) => label === a)) {
        values[key] =
          key === "etd" || key === "eta" || key === "deliveryDate"
            ? normalizeDate(value) ?? value
            : value;
        break;
      }
    }
  }

  const customerId = matchCustomer(customerNameRaw, customers);
  return { values, customerId, customerNameRaw };
}
