import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { getCustomerForPortalUser } from "@/lib/queries/customer-portal";
import { getSignedDownloadUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  const bl = await prisma.billOfLading.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { shipment: { select: { customerId: true } } },
  });
  if (!bl || !bl.pdfUrl) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  if (user.role === "CUSTOMER") {
    const customer = await getCustomerForPortalUser(user.id);
    if (!customer || bl.shipment.customerId !== customer.id) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }
  }

  const url = await getSignedDownloadUrl(bl.pdfUrl);
  return NextResponse.redirect(url);
}
