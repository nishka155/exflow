import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { uploadDocumentFile } from "@/lib/supabase/storage";
import { BlDocument } from "@/lib/pdf/bl-document";

export async function generateBlPdf(blId: string, organizationId: string) {
  const bl = await prisma.billOfLading.findFirstOrThrow({
    where: { id: blId, organizationId },
    include: { shipment: true, organization: true },
  });

  const buffer = await renderToBuffer(
    BlDocument({ bl, shipment: bl.shipment, organization: bl.organization })
  );

  const path = await uploadDocumentFile(
    organizationId,
    "bl-pdf",
    `BL-${bl.shipment.shipmentNumber}.pdf`,
    buffer,
    "application/pdf"
  );

  await prisma.billOfLading.update({ where: { id: blId }, data: { pdfUrl: path } });
  return path;
}
