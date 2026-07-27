import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { uploadDocumentFile } from "@/lib/supabase/storage";
import { SiDocument } from "@/lib/pdf/si-document";

export async function generateSiPdf(siId: string, organizationId: string) {
  const si = await prisma.shippingInstruction.findFirstOrThrow({
    where: { id: siId, organizationId },
    include: { shipment: true, organization: true },
  });

  const buffer = await renderToBuffer(
    SiDocument({ si, shipment: si.shipment, organization: si.organization })
  );

  const path = await uploadDocumentFile(
    organizationId,
    "si-pdf",
    `SI-${si.shipment.shipmentNumber}.pdf`,
    buffer,
    "application/pdf"
  );

  await prisma.shippingInstruction.update({ where: { id: siId }, data: { pdfUrl: path } });
  return path;
}
