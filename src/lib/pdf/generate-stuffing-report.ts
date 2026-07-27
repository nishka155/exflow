import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { uploadDocumentFile } from "@/lib/supabase/storage";
import { StuffingReportDocument } from "@/lib/pdf/stuffing-document";

export async function generateStuffingReport(stuffingId: string, organizationId: string) {
  const stuffing = await prisma.factoryStuffing.findFirstOrThrow({
    where: { id: stuffingId, organizationId },
    include: { shipment: true, organization: true },
  });

  const buffer = await renderToBuffer(
    StuffingReportDocument({
      stuffing,
      shipment: stuffing.shipment,
      organization: stuffing.organization,
    })
  );

  const path = await uploadDocumentFile(
    organizationId,
    "stuffing-report",
    `stuffing-report-${stuffing.containerNumber}.pdf`,
    buffer,
    "application/pdf"
  );

  await prisma.factoryStuffing.update({ where: { id: stuffingId }, data: { reportUrl: path } });
  return path;
}
