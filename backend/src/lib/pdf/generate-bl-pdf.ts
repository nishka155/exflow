import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "../prisma";
import { uploadDocumentFile } from "../storage/s3";
import { BlDocument } from "./bl-document";

export async function generateBlPdf(blId: string, organizationId: string) {
  const bl = await prisma.billOfLading.findFirstOrThrow({
    where: { id: blId, organizationId },
    include: { booking: true, organization: true },
  });

  const buffer = await renderToBuffer(
    BlDocument({ bl, booking: bl.booking, organization: bl.organization })
  );

  const path = await uploadDocumentFile(
    organizationId,
    "bl-pdf",
    `BL-${bl.booking.bookingNumber}.pdf`,
    buffer,
    "application/pdf"
  );

  await prisma.billOfLading.update({ where: { id: blId }, data: { pdfUrl: path } });
  return path;
}
