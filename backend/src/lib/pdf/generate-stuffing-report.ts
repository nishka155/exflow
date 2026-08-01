import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "../prisma";
import { uploadDocumentFile } from "../storage/s3";
import { StuffingReportDocument } from "./stuffing-document";

export async function generateStuffingReport(stuffingId: string, organizationId: string) {
  const stuffing = await prisma.factoryStuffing.findFirstOrThrow({
    where: { id: stuffingId, organizationId },
    include: { booking: true, organization: true },
  });

  const buffer = await renderToBuffer(
    StuffingReportDocument({
      stuffing,
      booking: stuffing.booking,
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
