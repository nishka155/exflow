import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { getCustomerForPortalUser } from "@/lib/queries/customer-portal";
import { getSignedDownloadUrl } from "@/lib/storage/s3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  const document = await prisma.document.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { shipment: { select: { customerId: true } } },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (user.role === "CUSTOMER") {
    const customer = await getCustomerForPortalUser(user.id);
    if (!customer || document.shipment?.customerId !== customer.id) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
  }

  const url = await getSignedDownloadUrl(document.fileUrl);
  return NextResponse.redirect(url);
}
