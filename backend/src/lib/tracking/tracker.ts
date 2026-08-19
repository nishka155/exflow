import { prisma } from "../prisma";
import { fetchMaerskEvents } from "./maersk";
import { fetchEvergreenEvents } from "./evergreen";
import { fetchAkkonEvents } from "./akkon";
import { fetchHmmEvents } from "./hmm";
import { fetchHapagEventsViaScraper } from "./hapag";
import { fetchMscEvents } from "./msc";
import { fetchCmaEventsViaScraper } from "./cma";
import type { TrackingResult } from "./types";

const CACHE_TTL_MS = Number(process.env.TRACKING_CACHE_TTL_MINUTES ?? 360) * 60_000;

const SUPPORTED_PROVIDERS = new Set([
  "MAERSK", "EVERGREEN", "AKKON", "HMM", "HAPAG", "MSC", "CMA", "NONE",
]);

export async function fetchAndCacheTracking(
  bookingId: string,
  opts: { force?: boolean } = {}
): Promise<TrackingResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = await (prisma.booking as any).findFirst({
    where: { id: bookingId },
    include: {
      trackingCache: true,
      factoryStuffings: { select: { containerNumber: true } },
    },
  });
  if (!booking) {
    return { provider: "NONE", events: [], errorMessage: "booking not found" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = (booking as any).trackingCache as {
    provider: string; events: unknown; errorMessage: string | null;
    summary: string | null; latestETA: string | null; fetchedAt: Date;
  } | null;
  const fresh =
    cache &&
    SUPPORTED_PROVIDERS.has(cache.provider) &&
    Date.now() - cache.fetchedAt.getTime() < CACHE_TTL_MS;
  if (fresh && !opts.force) {
    return {
      provider: cache.provider as TrackingResult["provider"],
      events: (cache.events as unknown as TrackingResult["events"]) ?? [],
      errorMessage: cache.errorMessage ?? undefined,
      summary: cache.summary ?? undefined,
      latestETA: cache.latestETA ?? undefined,
    };
  }

  // Build reference: prefer container numbers from stuffings, then booking number.
  const containerNums = ((booking as any).factoryStuffings as Array<{ containerNumber: string }>)
    .map((s) => s.containerNumber.trim().toUpperCase())
    .filter((s) => /^[A-Z]{4}\d{7}$/.test(s));

  const reference = (
    containerNums[0] ??
    booking.bookingNumber ??
    ""
  ).trim();

  if (!reference) {
    const result: TrackingResult = { provider: "NONE", events: [], errorMessage: "no container/booking# to query" };
    await writeCache(bookingId, booking.organizationId, result);
    return result;
  }

  const line = (booking.shippingLine ?? "").toLowerCase();

  const isMaersk = line.includes("maersk") && !!process.env.MAERSK_CLIENT_ID;
  const isEvergreen = line.includes("evergreen") || line.includes("eglv") || /^EGLV/i.test(reference);
  const isAkkon = line.includes("akkon") || /^AKKNEM/i.test(reference);
  const isHmm =
    (line.includes("hmm") || line.includes("hyundai merchant") || /^(HDMU|HMMU|HAMU|KOCU|GHMU|HDGU|HMRU)\d+/i.test(reference)) &&
    !!process.env.HMM_API_KEY;
  const isHapag =
    line.includes("hapag") || line.includes("hlag") || line.includes("hapag-lloyd") ||
    /^(HLBU|HLXU|HAMU|TGHU|UACU|CAIU)\d+/i.test(reference);
  const isMsc =
    line.includes("msc") || line.includes("mediterranean shipping") ||
    /^(MSCU|MEDU|MSDU)\d+/i.test(reference);
  const isCma =
    line.includes("cma") || line.includes("cgm") || line.includes("anl ") || line === "anl" || line.includes("apl") ||
    /^(CMAU|CGMU|ECMU|APHU|APZU|APRU|CXDU|GESU|TLLU|BMOU|TRHU|CAXU)\d+/i.test(reference);

  let final: TrackingResult;
  if (isMaersk) {
    final = await fetchMaerskEvents({ bookingNumber: booking.bookingNumber ?? undefined, containers: containerNums });
  } else if (isEvergreen) {
    final = await fetchEvergreenEvents(reference);
  } else if (isAkkon) {
    final = await fetchAkkonEvents(reference);
  } else if (isHmm) {
    final = await fetchHmmEvents(reference);
  } else if (isHapag) {
    const hapagRef =
      containerNums.find((s) => /^(HLBU|HLXU|HAMU|TGHU|UACU|CAIU)\d+/i.test(s)) ??
      booking.bookingNumber ??
      reference;
    final = await fetchHapagEventsViaScraper(hapagRef);
  } else if (isMsc) {
    const mscContainerRef = containerNums.find((s) => /^(MSCU|MEDU|MSDU)\d+/i.test(s));
    const mscRef = mscContainerRef ?? booking.bookingNumber ?? reference;
    const isBooking = !mscContainerRef && !!booking.bookingNumber;
    final = await fetchMscEvents(mscRef, { isBooking });
  } else if (isCma) {
    const cmaRef =
      booking.bookingNumber ??
      containerNums.find((s) => /^[A-Z]{4}\d{7}$/i.test(s)) ??
      reference;
    final = await fetchCmaEventsViaScraper(cmaRef);
  } else {
    final = { provider: "NONE", events: [], errorMessage: "no tracking provider configured for this shipping line" };
  }

  await writeCache(bookingId, booking.organizationId, final);
  return final;
}

async function writeCache(bookingId: string, organizationId: string, r: TrackingResult): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).trackingCache.upsert({
    where: { bookingId },
    create: {
      bookingId,
      organizationId,
      provider: r.provider,
      events: r.events as unknown as object,
      rawResponse: (r.raw as object | undefined) ?? undefined,
      errorMessage: r.errorMessage ?? null,
      summary: r.summary ?? null,
      latestETA: r.latestETA ?? null,
    },
    update: {
      provider: r.provider,
      events: r.events as unknown as object,
      rawResponse: (r.raw as object | undefined) ?? undefined,
      errorMessage: r.errorMessage ?? null,
      summary: r.summary ?? null,
      latestETA: r.latestETA ?? null,
      fetchedAt: new Date(),
    },
  });
}
