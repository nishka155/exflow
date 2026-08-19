import type { Browser } from "playwright";
import type { TrackingEvent, TrackingResult } from "./types";
import { getChromium, proxyOptions } from "./browser";

const API_ORIGIN = "https://tracking.api.hlag.cloud";
const API_PATH = "/api/tracking/events";

interface HapagEvent {
  containerNumber?: string;
  eventDescription?: string;
  eventLocation?: string;
  eventDate?: string;
  eventTime?: string;
  eventTransport?: string;
  eventVoyageNo?: string;
  eventClassifierCode?: "Actual" | "Planned" | string;
}

interface HapagGroup {
  containerNumber?: string;
  events?: HapagEvent[];
}

interface HapagSuccessResponse { groups?: HapagGroup[] }
interface HapagErrorResponse { errorKey?: string }

const NAV_TIMEOUT_MS = 30_000;
const API_TIMEOUT_MS = 20_000;

export async function fetchHapagEventsViaScraper(reference: string): Promise<TrackingResult> {
  const ref = reference.trim();
  if (!ref) return { provider: "HAPAG", events: [], errorMessage: "empty reference" };

  let browser: Browser | null = null;
  try {
    const chromium = await getChromium();
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
    });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      timezoneId: "Europe/Berlin",
      proxy: proxyOptions(),
    });
    const page = await context.newPage();
    await page.goto(API_ORIGIN, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT_MS });

    const result = await page.evaluate(
      async ({ path, reference: ref, timeoutMs }: { path: string; reference: string; timeoutMs: number }) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(`${path}?reference=${encodeURIComponent(ref)}`, {
            method: "GET",
            headers: { Accept: "application/json, text/plain, */*", "X-Token": "public" },
            signal: controller.signal,
          });
          const body = await res.text();
          return { ok: res.ok, status: res.status, body };
        } finally { clearTimeout(timer); }
      },
      { path: API_PATH, reference: ref, timeoutMs: API_TIMEOUT_MS }
    );

    if (result.status === 200) {
      let json: HapagSuccessResponse;
      try { json = JSON.parse(result.body) as HapagSuccessResponse; } catch {
        return { provider: "HAPAG", events: [], errorMessage: "hapag: could not parse API response as JSON" };
      }
      const parsed = parseHapagResponse(json);
      if (parsed.events.length === 0) {
        return { provider: "HAPAG", events: [], errorMessage: "hapag: reference matched but no events on file yet", raw: json };
      }
      return { provider: "HAPAG", events: parsed.events, latestETA: parsed.latestETA, summary: parsed.summary, raw: json };
    }

    let errorKey: string | undefined;
    try { errorKey = (JSON.parse(result.body) as HapagErrorResponse).errorKey; } catch { /* non-JSON */ }
    return { provider: "HAPAG", events: [], errorMessage: errorKey ? `hapag: ${errorKey}` : `hapag tracking API ${result.status}` };
  } catch (e) {
    return { provider: "HAPAG", events: [], errorMessage: `hapag tracking failed: ${(e as Error).message}` };
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

function parseHapagResponse(json: HapagSuccessResponse): { events: TrackingEvent[]; latestETA?: string; summary?: string } {
  const events: TrackingEvent[] = [];
  for (const group of json.groups ?? []) {
    for (const ev of group.events ?? []) {
      if (!ev.eventDate) continue;
      events.push({
        eventTime: normaliseDateTime(ev.eventDate, ev.eventTime),
        location: ev.eventLocation || undefined,
        eventType: ev.eventDescription || "Event",
        vesselName: ev.eventTransport && ev.eventTransport !== "Truck" ? ev.eventTransport : undefined,
        voyageNumber: ev.eventVoyageNo || undefined,
        containerNumber: ev.containerNumber || group.containerNumber,
        isEstimate: ev.eventClassifierCode === "Planned",
      });
    }
  }
  events.sort((a, b) => (a.eventTime > b.eventTime ? 1 : -1));
  const last = events[events.length - 1];
  const latestETA = last?.isEstimate ? last.eventTime : undefined;
  const lastActual = [...events].reverse().find((e) => !e.isEstimate);
  const summary = lastActual ? `${lastActual.eventType}${lastActual.location ? ` @ ${lastActual.location}` : ""}` : undefined;
  return { events, latestETA, summary };
}

function normaliseDateTime(date: string, time?: string): string {
  const iso = `${date}T${time ? `${time}:00` : "00:00:00"}Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toISOString();
}
