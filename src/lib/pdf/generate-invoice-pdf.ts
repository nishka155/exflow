import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { uploadDocumentFile } from "@/lib/storage/s3";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";

export async function generateInvoicePdf(invoiceId: string, organizationId: string) {
  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId },
    include: { customer: true, organization: true },
  });

  const buffer = await renderToBuffer(
    InvoiceDocument({
      invoice,
      customer: invoice.customer,
      organization: invoice.organization,
    })
  );

  const path = await uploadDocumentFile(
    organizationId,
    "invoice-pdf",
    `${invoice.invoiceNumber}.pdf`,
    buffer,
    "application/pdf"
  );

  await prisma.invoice.update({ where: { id: invoiceId }, data: { pdfUrl: path } });
  return path;
}
