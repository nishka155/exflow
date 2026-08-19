import type { Browser } from "playwright";
import type { TrackingEvent, TrackingResult } from "./types";
import { getChromium, proxyOptions } from "./browser";

const TRACKING_PAGE_URL = "https://www.msc.com/en/track-a-shipment";
const API_PATH = "/api/feature/tools/TrackingInfo";

interface MscEvent { Date?: string; Location?: string; Description?: string }
interface MscContainerInfo { ContainerNumber?: string; LatestMove?: string; PodEtaDate?: string; Events?: MscEvent[] }
interface MscBillOfLading { GeneralTrackingInfo?: { FinalPodEtaDate?: string }; ContainersInfo?: MscContainerInfo[] }
interface MscApiResponse { IsSuccess: boolean; Data?: { BillOfLadings?: MscBillOfLading[] } | string }

const NAV_TIMEOUT_MS = 30_000;
const API_TIMEOUT_MS = 20_000;

export async function fetchMscEvents(reference: string, opts: { isBooking?: boolean } = {}): Promise<TrackingResult> {
  const ref = reference.trim();
  if (!ref) return { provider: "MSC", events: [], errorMessage: "empty reference" };

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
      timezoneId: "America/New_York",
      proxy: proxyOptions(),
    });
    const page = await context.newPage();
    await page.goto(TRACKING_PAGE_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });

    const result = await page.evaluate(
      async ({ path, trackingNumber, trackingMode, timeoutMs }: { path: string; trackingNumber: string; trackingMode: string; timeoutMs: number }) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", Accept: "application/json, text/plain, */*" },
            body: JSON.stringify({ trackingNumber, trackingMode }),
            signal: controller.signal,
          });
          const body = await res.text();
          return { ok: res.ok, status: res.status, body };
        } finally { clearTimeout(timer); }
      },
      { path: API_PATH, trackingNumber: ref, trackingMode: opts.isBooking ? "1" : "0", timeoutMs: API_TIMEOUT_MS }
    );

    if (!result.ok) return { provider: "MSC", events: [], errorMessage: `MSC tracking API ${result.status}` };

    let json: MscApiResponse;
    try { json = JSON.parse(result.body) as MscApiResponse; } catch {
      return { provider: "MSC", events: [], errorMessage: "MSC: could not parse API response as JSON" };
    }

    if (!json.IsSuccess || typeof json.Data === "string" || !json.Data) {
      return { provider: "MSC", events: [], errorMessage: typeof json.Data === "string" ? json.Data : "MSC: no data returned" };
    }

    const events: TrackingEvent[] = [];
    let latestETA: string | undefined;
    let summary: string | undefined;
    for (const bol of json.Data.BillOfLadings ?? []) {
      if (!latestETA && bol.GeneralTrackingInfo?.FinalPodEtaDate) latestETA = normaliseDate(bol.GeneralTrackingInfo.FinalPodEtaDate);
      for (const container of bol.ContainersInfo ?? []) {
        if (!summary && container.LatestMove) summary = container.LatestMove;
        if (!latestETA && container.PodEtaDate) latestETA = normaliseDate(container.PodEtaDate);
        for (const ev of container.Events ?? []) {
          if (!ev.Date) continue;
          events.push({
            eventTime: normaliseDate(ev.Date),
            location: ev.Location || undefined,
            eventType: ev.Description || "Event",
            containerNumber: container.ContainerNumber,
            isEstimate: /estimated|forecast/i.test(ev.Description ?? ""),
          });
        }
      }
    }
    events.sort((a, b) => (a.eventTime > b.eventTime ? 1 : -1));
    if (events.length === 0) return { provider: "MSC", events: [], errorMessage: "MSC: reference matched but no events on file yet", raw: json };
    return { provider: "MSC", events, latestETA, summary, raw: json };
  } catch (e) {
    return { provider: "MSC", events: [], errorMessage: `msc tracking failed: ${(e as Error).message}` };
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

function normaliseDate(s: string): string {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return s;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? s : parsed.toISOString();
}
