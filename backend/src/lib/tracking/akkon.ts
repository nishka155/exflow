/**
 * Akkon Lines tracking scraper.
 *
 * There's no API; the only source is the public tracking form at
 *   https://sap.akkonlines.com/index.aspx
 *
 * The site is a classic ASP.NET Web Forms page with a full-postback
 * search: we POST the hidden __VIEWSTATE / __VIEWSTATEGENERATOR /
 * __EVENTVALIDATION tokens back along with the form fields, and the
 * response HTML embeds a `<table>` with one row per container.
 *
 * Verified against BL AKKNEM26029315: 12 container rows, columns
 *   Akkon BL / Container / Vessel / Voyage / POL / ETS /
 *   POD / ETA / T/S Vessel / T/S Voyage / Final Destination /
 *   Final ETA.
 *
 * Unlike Evergreen (which serves a full move-history per container),
 * Akkon just gives the schedule. We turn each row into two events:
 *   1. Sailing at POL on ETS
 *   2. Arrival at POD on ETA
 * plus we pick `latestETA` as the row's Final ETA if set, otherwise
 * the plain ETA.
 *
 * Failure modes handled:
 *   - Invalid BL → response embeds `showModal('Not Found', ...)`;
 *     we surface that as errorMessage.
 *   - HTML layout change → return errorMessage rather than
 *     throwing so the tracker surfaces a clean error to the UI.
 */

import type { TrackingEvent, TrackingResult } from "./types";

const FORM_URL = "https://sap.akkonlines.com/index.aspx";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";

/** ddlCountry value the form expects. Format is "COUNTRY|SBOACCOUNT".
 *  Turkey is the vast majority of Three A's Akkon traffic and works
 *  as a global default. Override via env if a Belgium/China origin
 *  ever needs a different region. */
const DEFAULT_COUNTRY = process.env.AKKON_COUNTRY ?? "TURKEY|SBOAKKON";

interface BootstrapTokens {
  viewState: string;
  viewStateGenerator: string;
  eventValidation: string;
  cookie: string;
}

interface AkkonRow {
  blNumber: string;
  containerNumber: string;
  vesselName: string;
  voyage: string;
  pol: string;
  ets: string; // dd/MM/yyyy
  pod: string;
  eta: string; // dd/MM/yyyy
  tsVessel: string;
  tsVoyage: string;
  finalDestination: string;
  finalETA: string; // dd/MM/yyyy or blank
}

export async function fetchAkkonEvents(
  reference: string
): Promise<TrackingResult> {
  const cleaned = reference.trim().toUpperCase();
  if (!cleaned) {
    return { provider: "NONE", events: [], errorMessage: "no reference" };
  }

  let tokens: BootstrapTokens;
  try {
    tokens = await bootstrap();
  } catch (e) {
    return {
      provider: "NONE",
      events: [],
      errorMessage: `akkon bootstrap failed: ${(e as Error).message}`,
    };
  }

  // Decide which text field the reference goes in. BLs are exactly
  // 14 chars in Akkon's format (AKKNEM<8 digits>). Containers are
  // the standard ISO 11 chars but with letters/digits — never 14.
  // Anything else, try BL first (most references are BLs).
  const isContainer = /^[A-Z]{4}\d{7}$/.test(cleaned);
  const blField = isContainer ? "" : cleaned;
  const cntrField = isContainer ? cleaned : "";

  let html: string;
  try {
    html = await postSearch(tokens, blField, cntrField);
  } catch (e) {
    return {
      provider: "NONE",
      events: [],
      errorMessage: `akkon search failed: ${(e as Error).message}`,
    };
  }

  const notFound = html.match(/showModal\('Not Found',\s*'([^']+)'/i);
  if (notFound) {
    return {
      provider: "AKKON",
      events: [],
      errorMessage: notFound[1],
    };
  }

  const rows = parseRows(html);
  if (rows.length === 0) {
    return {
      provider: "AKKON",
      events: [],
      errorMessage:
        "akkon response parsed but no rows were found; template may have changed",
    };
  }

  const events: TrackingEvent[] = [];
  for (const r of rows) {
    const ets = ddmmyyyyToIso(r.ets);
    const eta = ddmmyyyyToIso(r.finalETA || r.eta);
    if (ets) {
      events.push({
        eventTime: ets,
        eventType: `Sailed on ${r.vesselName} ${r.voyage}`.trim(),
        location: r.pol || undefined,
        vesselName: r.vesselName || undefined,
        voyageNumber: r.voyage || undefined,
        containerNumber: r.containerNumber,
      });
    }
    if (eta) {
      const dest = r.finalDestination || r.pod;
      events.push({
        eventTime: eta,
        eventType: r.tsVessel
          ? `ETA at ${dest} via T/S ${r.tsVessel} ${r.tsVoyage}`.trim()
          : `ETA at ${dest}`,
        location: dest || undefined,
        vesselName: r.tsVessel || r.vesselName || undefined,
        voyageNumber: r.tsVoyage || r.voyage || undefined,
        isEstimate: true,
        containerNumber: r.containerNumber,
      });
    }
  }
  events.sort((a, b) => a.eventTime.localeCompare(b.eventTime));

  // Pick the shipment-level latestETA: prefer Final ETA (any row),
  // fall back to plain ETA (any row). All containers on a BL are
  // scheduled to the same POD normally, so picking the max lands
  // on the most conservative published arrival.
  const finalETAs = rows
    .map((r) => ddmmyyyyToIso(r.finalETA || r.eta))
    .filter((s): s is string => Boolean(s));
  const latestETA =
    finalETAs.length > 0 ? finalETAs.reduce((a, b) => (a > b ? a : b)) : undefined;

  const first = rows[0];
  const summary = [
    first.vesselName && `vessel ${first.vesselName}`,
    first.voyage && `voyage ${first.voyage}`,
    latestETA && `ETA ${first.finalETA || first.eta}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    provider: "AKKON",
    events,
    summary: summary || undefined,
    latestETA,
  };
}

async function bootstrap(): Promise<BootstrapTokens> {
  const res = await fetch(FORM_URL, {
    method: "GET",
    headers: { "User-Agent": UA },
  });
  const html = await res.text();
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookieParts = setCookie
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .filter((c) => /=/.test(c));
  const cookie = cookieParts.join("; ");
  return {
    viewState: pluck(html, "__VIEWSTATE") ?? "",
    viewStateGenerator: pluck(html, "__VIEWSTATEGENERATOR") ?? "",
    eventValidation: pluck(html, "__EVENTVALIDATION") ?? "",
    cookie,
  };
}

function pluck(html: string, name: string): string | null {
  const re = new RegExp(`${name}"\\s+value="([^"]*)"`, "i");
  return html.match(re)?.[1] ?? null;
}

async function postSearch(
  tokens: BootstrapTokens,
  bl: string,
  cntr: string
): Promise<string> {
  const params = new URLSearchParams();
  params.append("__EVENTTARGET", "");
  params.append("__EVENTARGUMENT", "");
  params.append("__VIEWSTATE", tokens.viewState);
  params.append("__VIEWSTATEGENERATOR", tokens.viewStateGenerator);
  params.append("__EVENTVALIDATION", tokens.eventValidation);
  params.append("ddlCountry", DEFAULT_COUNTRY);
  params.append("TextBox1", bl);
  params.append("TextBox2", cntr);
  params.append("Button1", "Search");
  const res = await fetch(FORM_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: FORM_URL,
      Cookie: tokens.cookie,
    },
    body: params.toString(),
  });
  return res.text();
}

/** Match every <tr> that has 12 <td> cells — the schedule rows —
 *  and pull them into structured objects. The header row uses <th>
 *  so it's naturally excluded by the <td>-count match.
 *  Cells can contain &nbsp; when empty; we clean those out. */
function parseRows(html: string): AkkonRow[] {
  const rows: AkkonRow[] = [];
  const rowRegex =
    /<tr[^>]*>\s*(?:<td[^>]*>[\s\S]*?<\/td>\s*){12}<\/tr>/g;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    const cells: string[] = [];
    let c: RegExpExecArray | null;
    cellRegex.lastIndex = 0;
    while ((c = cellRegex.exec(match[0])) !== null) {
      cells.push(cleanCell(c[1]));
    }
    if (cells.length !== 12) continue;
    // Sanity check: BL column typically starts with 3-6 letters
    // followed by digits. Skip anything that doesn't look like a
    // real result row (headers, empty separator rows, etc.).
    if (!/^[A-Z]{3,}\d/.test(cells[0])) continue;
    rows.push({
      blNumber: cells[0],
      containerNumber: cells[1],
      vesselName: cells[2],
      voyage: cells[3],
      pol: cells[4],
      ets: cells[5],
      pod: cells[6],
      eta: cells[7],
      tsVessel: cells[8],
      tsVoyage: cells[9],
      finalDestination: cells[10],
      finalETA: cells[11],
    });
  }
  return rows;
}

function cleanCell(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function ddmmyyyyToIso(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}T00:00:00.000Z`;
}
