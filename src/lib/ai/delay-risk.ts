import { prisma } from "@/lib/prisma";

/**
 * Heuristic delay-risk scoring — no ML model, just two signals:
 * 1. A dispatch is "overdue" if it's still PENDING/DISPATCHED past its
 *    expected factory arrival date.
 * 2. A transporter's historical delay rate (share of past dispatches that
 *    ended up DELAY) is used to flag dispatches that are approaching their
 *    expected arrival with a historically delay-prone transporter.
 */
export interface AtRiskDispatch {
  id: string;
  truckNumber: string;
  shipmentNumber: string;
  transporterName: string;
  expectedFactoryArrival: Date;
  reason: "overdue" | "transporter_history";
  transporterDelayRate: number;
}

export async function getAtRiskDispatches(organizationId: string): Promise<AtRiskDispatch[]> {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const active = await prisma.truckDispatch.findMany({
    where: { organizationId, status: { in: ["PENDING", "DISPATCHED"] } },
    include: { shipment: true, transporter: true },
  });

  if (active.length === 0) return [];

  const transporterStats = await prisma.truckDispatch.groupBy({
    by: ["transporterId", "status"],
    where: { organizationId, status: { in: ["DELAY", "REACHED_FACTORY"] } },
    _count: { _all: true },
  });

  const delayRateByTransporter = new Map<string, number>();
  const grouped = new Map<string, { delay: number; ok: number }>();
  for (const row of transporterStats) {
    const entry = grouped.get(row.transporterId) ?? { delay: 0, ok: 0 };
    if (row.status === "DELAY") entry.delay += row._count._all;
    else entry.ok += row._count._all;
    grouped.set(row.transporterId, entry);
  }
  for (const [transporterId, { delay, ok }] of grouped) {
    const total = delay + ok;
    if (total > 0) delayRateByTransporter.set(transporterId, delay / total);
  }

  const results: AtRiskDispatch[] = [];
  for (const d of active) {
    const rate = delayRateByTransporter.get(d.transporterId) ?? 0;
    const isOverdue = d.expectedFactoryArrival < now;
    const isApproachingWithRiskyTransporter = d.expectedFactoryArrival <= soon && rate >= 0.3;

    if (isOverdue) {
      results.push({
        id: d.id,
        truckNumber: d.truckNumber,
        shipmentNumber: d.shipment.shipmentNumber,
        transporterName: d.transporter.name,
        expectedFactoryArrival: d.expectedFactoryArrival,
        reason: "overdue",
        transporterDelayRate: rate,
      });
    } else if (isApproachingWithRiskyTransporter) {
      results.push({
        id: d.id,
        truckNumber: d.truckNumber,
        shipmentNumber: d.shipment.shipmentNumber,
        transporterName: d.transporter.name,
        expectedFactoryArrival: d.expectedFactoryArrival,
        reason: "transporter_history",
        transporterDelayRate: rate,
      });
    }
  }

  return results.sort((a, b) => a.expectedFactoryArrival.getTime() - b.expectedFactoryArrival.getTime());
}
