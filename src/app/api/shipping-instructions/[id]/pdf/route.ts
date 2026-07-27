import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { getSignedDownloadUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser("shipping-instructions");
  const si = await prisma.shippingInstruction.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!si || !si.pdfUrl) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }
  const url = await getSignedDownloadUrl(si.pdfUrl);
  return NextResponse.redirect(url);
}
