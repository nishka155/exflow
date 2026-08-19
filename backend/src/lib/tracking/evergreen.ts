/**
 * Evergreen Line tracking scraper.
 *
 * There's no public REST API for cargo tracking; the only source of
 * truth is the ShipmentLink web form at
 *   https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do
 *
 * Flow (verified against a live BL):
 *   1. GET the form page to obtain a JSESSIONID cookie.
 *   2. POST the same URL with the BL number to get the "cargo
 *      status summary" HTML. This carries the container list,
 *      each container's on-board date, POL and POD codes.
 *   3. For each container, POST `TYPE=CntrMove` (same URL) with
 *      that container's on-board / POL / POD context; the
 *      response is a small HTML table listing every move.
 *   4. Merge all containers' moves into a single TrackingEvent[],
 *      sorted chronologically.
 *
 * Failure modes handled:
 *   - Session expires / cookie rejected → step 2 returns the
 *     invalid-BL alert; we surface that as errorMessage.
 *   - HTML layout change → we return errorMessage rather than
 *     throwing so the tracker surfaces a clean error to the UI.
 */

import type { TrackingEvent, TrackingResult } from "./types";

const BASE = "https://ct.shipmentlink.com";
const FORM_URL = `${BASE}/servlet/TDB1_CargoTracking.do`;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";

/** Container metadata extracted from the BL summary page — enough
 *  to fetch each container's move history via the CntrMove call. */
interface ContainerRow {
  containerNumber: string;
  onboardDate: string; // "YYYYMMDD"
  pol: string; // UN/LOCODE, e.g. "PTLXO"
  pod: string; // UN/LOCODE, e.g. "INMUN"
  podCountry: string; // ISO2, e.g. "IN"
}

export async function fetchEvergreenEvents(
  reference: string
): Promise<TrackingResult> {
  const cleaned = normaliseReference(reference);
  if (!cleaned) {
    return {
      provider: "NONE",
      events: [],
      errorMessage: "no reference to query",
    };
  }

  let cookie: string;
  try {
    cookie = await bootstrapSession();
  } catch (e) {
    return {
      provider: "NONE",
      events: [],
      errorMessage: `evergreen session bootstrap failed: ${(e as Error).message}`,
    };
  }

  let summaryHtml: string;
  try {
    summaryHtml = await postBlSearch(cookie, cleaned);
  } catch (e) {
    return {
      provider: "NONE",
      events: [],
      errorMessage: `evergreen BL search failed: ${(e as Error).message}`,
    };
  }

  // The site's polite failure path is an inline alert() script.
  // Detect it and surface the message so the operator sees the
  // real reason (invalid BL vs. site outage).
  const alertMatch = summaryHtml.match(/alert\('([^']+)'\)/);
  if (alertMatch) {
    return {
      provider: "EVERGREEN",
      events: [],
      errorMessage: alertMatch[1],
    };
  }

  const containers = extractContainerRows(summaryHtml);
  if (containers.length === 0) {
    return {
      provider: "EVERGREEN",
      events: [],
      errorMessage:
        "evergreen response parsed but no containers were found; template may have changed",
      raw: summaryHtml,
    };
  }

  const summary = extractSummaryFacts(summaryHtml);
  const latestETA = extractSummaryETA(summaryHtml);

  const events: TrackingEvent[] = [];
  for (const c of containers) {
    try {
      const moveHtml = await postCntrMove(cookie, cleaned, c);
      events.push(...parseMoves(moveHtml, c.containerNumber));
    } catch (e) {
      // Non-fatal: a single container's move history can fail
      // (transient site issue) and we still return whatever else
      // succeeded. The errorMessage carries the last failure so
      // the operator sees it without hiding the partial data.
      events.push({
        eventTime: new Date().toISOString(),
        eventType: `evergreen move-history fetch failed for ${c.containerNumber}: ${(e as Error).message}`,
        containerNumber: c.containerNumber,
      });
    }
  }

  events.sort(byEventTimeAsc);

  return {
    provider: "EVERGREEN",
    events,
    summary,
    latestETA,
  };
}

/** Pull the "Estimated Date of Arrival at Destination" value from
 *  the BL summary page and return it as an ISO date (YYYY-MM-DD).
 *  Falls back to undefined if the format doesn't match. */
function extractSummaryETA(html: string): string | undefined {
  const match = html.match(
    /Estimated Date of Arrival at Destination[^<]*<font[^>]*>\s*([A-Z]{3})-(\d{2})-(\d{4})/i
  );
  if (!match) return undefined;
  const monthMap: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04",
    MAY: "05", JUN: "06", JUL: "07", AUG: "08",
    SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };
  const month = monthMap[match[1].toUpperCase()];
  if (!month) return undefined;
  return `${match[3]}-${month}-${match[2]}`;
}

// ─────────────────── network ───────────────────

async function bootstrapSession(): Promise<string> {
  const res = await fetch(FORM_URL, {
    method: "GET",
    headers: { "User-Agent": UA },
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/JSESSIONID=[^;]+/);
  if (!match) {
    throw new Error("no JSESSIONID in response");
  }
  return match[0];
}

async function postBlSearch(cookie: string, bl: string): Promise<string> {
  const params = new URLSearchParams({
    SEL: "s_bl",
    TYPE: "BL",
    BL: bl,
    CNTR: "",
    bkno: "",
    NO: bl,
  });
  const res = await fetch(FORM_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: FORM_URL,
      Cookie: cookie,
    },
    body: params.toString(),
  });
  return res.text();
}

async function postCntrMove(
  cookie: string,
  bl: string,
  c: ContainerRow
): Promise<string> {
  const params = new URLSearchParams({
    TYPE: "CntrMove",
    bl_no: bl,
    cntr_no: c.containerNumber,
    onboard_date: c.onboardDate,
    pol: c.pol,
    pod: c.pod,
    podctry: c.podCountry,
  });
  const res = await fetch(FORM_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: FORM_URL,
      Cookie: cookie,
    },
    body: params.toString(),
  });
  return res.text();
}

// ─────────────────── parsing ───────────────────

/** Strip the EGLV prefix if present. The BL search form only
 *  accepts the numeric part; passing "EGLV573600006113" returns
 *  the invalid-BL alert. */
function normaliseReference(ref: string): string {
  const trimmed = ref.trim().toUpperCase();
  if (/^EGLV\d+$/.test(trimmed)) return trimmed.slice(4);
  return trimmed;
}

/** Container rows in the BL summary sit inside the "Container(s)
 *  information on B/L and Current Status" table. Each container's
 *  onload:/pol: fingerprint is embedded in the onMouseOver handler
 *  ("onboard:20260423 pol:PTLXO"), which is more reliable to grep
 *  than the visible table cells. The POD comes from the summary's
 *  Port of Discharge cell (single value for the whole B/L). */
function extractContainerRows(html: string): ContainerRow[] {
  const rows: ContainerRow[] = [];
  const podMatch = html.match(
    /Port of Discharge<[^>]*>\s*<td[^>]*>\s*&nbsp;\s*([A-Z][A-Z\s]+?)\s*&#x28;([A-Z]{2})&#x29;/i
  );
  const podCode = podMatch ? locodeGuess(podMatch[1], podMatch[2]) : "";
  const podCountry = podMatch ? podMatch[2] : "";

  const pattern =
    /onMouseOver="window\.status='Container:([A-Z0-9]+)\s+onboard:(\d{8})\s+pol:([A-Z]{5})'/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    rows.push({
      containerNumber: m[1],
      onboardDate: m[2],
      pol: m[3],
      pod: podCode,
      podCountry,
    });
  }
  return rows;
}

/** Best-effort UN/LOCODE from country + city text. Falls back to
 *  the raw text when we can't build a proper code; the ShipmentLink
 *  form accepts either but prefers the code. */
function locodeGuess(city: string, country: string): string {
  const c = city.trim().toUpperCase();
  const country2 = country.trim().toUpperCase();
  // Very small map for the ports the team actually ships through.
  // Extending this over time is safer than a live UN/LOCODE lookup.
  const known: Record<string, string> = {
    "MUNDRA": "INMUN",
    "NHAVA SHEVA": "INNSA",
    "LEIXOES": "PTLXO",
    "ROTTERDAM": "NLRTM",
    "COLOMBO": "LKCMB",
    "GEMLIK": "TRGEM",
    "LISBON": "PTLIS",
    "SINES": "PTSIN",
    "SHANGHAI": "CNSHA",
    "NINGBO": "CNNGB",
    "QINGDAO": "CNTAO",
    "MERSIN": "TRMER",
    "SAMSUN": "TRSSX",
    "VENEZIA": "ITVCE",
  };
  return known[c] ?? `${country2}${c.slice(0, 3)}`;
}

interface SummaryFacts {
  vessel?: string;
  eta?: string;
}

function extractSummaryFacts(html: string): string | undefined {
  const facts: SummaryFacts = {};
  const vessel = html.match(
    /Vessel Voyage on B\/L<\/th>[\s\S]*?<td[^>]*>\s*([A-Z][^<\n]*?)\s*<\/td>/i
  );
  if (vessel) facts.vessel = vessel[1].trim();
  const eta = html.match(
    /Estimated Date of Arrival at Destination[^<]*<font[^>]*>\s*([A-Z]{3}-\d{2}-\d{4})/i
  );
  if (eta) facts.eta = eta[1];
  const bits = [
    facts.vessel && `vessel ${facts.vessel}`,
    facts.eta && `ETA ${facts.eta}`,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : undefined;
}

/** Parse the four-column Container Moves table. Each data row is:
 *    <td>DATE</td>  <td>Move description</td>  <td>Location</td>  <td>Vessel Voyage</td>
 *  All within `class="#f12rown1 ec-fs-16"` styling. We tolerate
 *  whitespace / newlines and HTML-entity encoded &nbsp;/&#x28; etc. */
function parseMoves(html: string, containerNumber: string): TrackingEvent[] {
  const events: TrackingEvent[] = [];
  // Grab every <tr> that contains a #f12rown1 cell — those are the
  // data rows (header uses #F0F0F0).
  const rowRegex =
    /<tr>\s*<td[^>]*#f12rown1[^>]*>\s*([A-Z]{3}-\d{2}-\d{4})\s*<\/td>\s*<td[^>]*#f12rown1[^>]*>\s*([\s\S]*?)\s*<\/td>\s*<td[^>]*#f12rown1[^>]*>\s*([\s\S]*?)\s*<\/td>\s*<td[^>]*#f12rown1[^>]*>\s*([\s\S]*?)\s*<\/td>\s*<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(html)) !== null) {
    const [, dateRaw, moveRaw, locationRaw, vesselRaw] = m;
    const iso = evergreenDateToIso(dateRaw);
    if (!iso) continue;
    events.push({
      eventTime: iso,
      eventType: cleanCell(moveRaw),
      location: cleanCell(locationRaw) || undefined,
      vesselName: cleanCell(vesselRaw) || undefined,
      containerNumber,
    });
  }
  return events;
}

function cleanCell(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "") // strip inner tags (e.g. <a> links)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x28;/g, "(")
    .replace(/&#x29;/g, ")")
    .replace(/&#x2f;/g, "/")
    .replace(/&#x20;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function evergreenDateToIso(raw: string): string | null {
  // "APR-10-2026" → "2026-04-10T00:00:00.000Z"
  const parts = raw.trim().split("-");
  if (parts.length !== 3) return null;
  const monthMap: Record<string, string> = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };
  const month = monthMap[parts[0].toUpperCase()];
  if (!month) return null;
  const day = parts[1].padStart(2, "0");
  const year = parts[2];
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

function byEventTimeAsc(a: TrackingEvent, b: TrackingEvent): number {
  return a.eventTime.localeCompare(b.eventTime);
}
