import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "../prisma";
import { uploadDocumentFile } from "../storage/s3";
import { SiDocument } from "./si-document";

export async function generateSiPdf(siId: string, organizationId: string) {
  const si = await prisma.shippingInstruction.findFirstOrThrow({
    where: { id: siId, organizationId },
    include: { booking: true, organization: true },
  });

  const buffer = await renderToBuffer(
    SiDocument({ si, booking: si.booking, organization: si.organization })
  );

  const path = await uploadDocumentFile(
    organizationId,
    "si-pdf",
    `SI-${si.booking.bookingNumber}.pdf`,
    buffer,
    "application/pdf"
  );

  await prisma.shippingInstruction.update({ where: { id: siId }, data: { pdfUrl: path } });
  return path;
}
