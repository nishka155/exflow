/**
 * Static POL -> POD average transit-day reference table for common Indian
 * export lanes. A real ETA model would use carrier schedules and live
 * vessel tracking; this is a lightweight stand-in so planners get a
 * reasonable starting estimate without one.
 */
const TRANSIT_DAYS: { pol: RegExp; pod: RegExp; days: number }[] = [
  { pol: /mundra/i, pod: /dubai|jebel ali|uae/i, days: 6 },
  { pol: /mundra/i, pod: /vietnam|ho chi minh/i, days: 18 },
  { pol: /mundra/i, pod: /sweden|gothenburg|europe/i, days: 24 },
  { pol: /kandla/i, pod: /dubai|jebel ali|uae/i, days: 5 },
  { pol: /kandla/i, pod: /vietnam|ho chi minh/i, days: 19 },
  { pol: /nhava sheva|jnpt/i, pod: /europe|rotterdam|hamburg/i, days: 22 },
  { pol: /chennai/i, pod: /vietnam|ho chi minh|singapore/i, days: 12 },
];

export function estimateTransitDays(pol: string, pod: string): number | null {
  const match = TRANSIT_DAYS.find((r) => r.pol.test(pol) && r.pod.test(pod));
  return match?.days ?? null;
}
