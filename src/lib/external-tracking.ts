export function marineTrafficVesselUrl(vesselName: string | null | undefined): string | null {
  if (!vesselName?.trim()) return null;
  const q = encodeURIComponent(vesselName.trim());
  return `https://www.marinetraffic.com/en/ais/index/search/all/keyword:${q}`;
}

export interface CarrierLink {
  carrier: string;
  url: string;
  reference: string;
  autoSearches: boolean;
}

export interface TrackingReferences {
  booking?: string | null;
  mbl?: string | null;
}

export function carrierTrackingUrl(
  shippingLine: string | null | undefined,
  refs: TrackingReferences
): CarrierLink | null {
  const line = (shippingLine ?? "").trim().toLowerCase();
  if (!line) return null;
  const booking = (refs.booking ?? "").trim();
  const mbl = (refs.mbl ?? "").trim();
  const generic = booking || mbl;
  const enc = (s: string) => encodeURIComponent(s);
  const hash = (ref: string) => `#cf-ref=${enc(ref)}`;

  if (line.includes("maersk")) {
    if (!generic) return null;
    return { carrier: "Maersk", url: `https://www.maersk.com/tracking/${enc(generic)}`, reference: generic, autoSearches: true };
  }
  if (line.includes("msc") || line.includes("mediterranean shipping")) {
    const ref = mbl || booking;
    if (!ref) return null;
    const searchType = ref === mbl ? "BL" : "BOOKING";
    return { carrier: "MSC", url: `https://www.msc.com/track-a-shipment?agencyPath=msc&searchNumber=${enc(ref)}&searchType=${searchType}`, reference: ref, autoSearches: true };
  }
  if (line.includes("cma") || line.includes("cgm")) {
    if (!generic) return null;
    return { carrier: "CMA-CGM", url: `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference=${enc(generic)}`, reference: generic, autoSearches: true };
  }
  if (line.includes("zim")) {
    if (!generic) return null;
    return { carrier: "ZIM", url: `https://www.zim.com/tools/track-a-shipment?consnumber=${enc(generic)}`, reference: generic, autoSearches: true };
  }
  if (line.includes("cosco")) {
    if (!generic) return null;
    return { carrier: "COSCO", url: `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BILLOFLADING&number=${enc(generic)}`, reference: generic, autoSearches: true };
  }
  if (line.includes("one") || line.includes("ocean network")) {
    if (!generic) return null;
    return { carrier: "ONE", url: `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?cqr=${enc(generic)}`, reference: generic, autoSearches: true };
  }
  if (line.includes("hapag")) {
    if (!generic) return null;
    return { carrier: "Hapag-Lloyd", url: `https://www.hapag-lloyd.com/en/online-business/tracing/tracing-by-booking.html?blno=${enc(generic)}${hash(generic)}`, reference: generic, autoSearches: false };
  }
  if (line.includes("wan hai") || line.includes("wanhai")) {
    if (!generic) return null;
    return { carrier: "Wan Hai", url: `https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml?MBL=${enc(generic)}${hash(generic)}`, reference: generic, autoSearches: false };
  }
  if (line.includes("hmm")) {
    if (!generic) return null;
    return { carrier: "HMM", url: `https://www.hmm21.com/cms/business/ebiz/trackTrace/trackTrace/index.jsp?type=1&number=${enc(generic)}${hash(generic)}`, reference: generic, autoSearches: false };
  }
  if (line.includes("evergreen")) {
    if (!generic) return null;
    return { carrier: "Evergreen", url: `https://www.shipmentlink.com/servlet/TUF1_CargoTracking.do?BL=${enc(generic)}${hash(generic)}`, reference: generic, autoSearches: false };
  }
  if (line.includes("oocl")) {
    if (!generic) return null;
    return { carrier: "OOCL", url: `https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx?BLNUMBER=${enc(generic)}${hash(generic)}`, reference: generic, autoSearches: false };
  }
  if (line.includes("yang ming") || line.includes("yangming")) {
    if (!generic) return null;
    return { carrier: "Yang Ming", url: `https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx?rdolType=BL&ctnrno=${enc(generic)}${hash(generic)}`, reference: generic, autoSearches: false };
  }
  if (line.includes("akkon")) {
    if (!generic) return null;
    return { carrier: "Akkon Line", url: `https://sap.akkonlines.com/index.aspx${hash(generic)}`, reference: generic, autoSearches: false };
  }
  return null;
}
