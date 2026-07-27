import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { getSignedDownloadUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser("invoices");
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!invoice || !invoice.pdfUrl) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }
  const url = await getSignedDownloadUrl(invoice.pdfUrl);
  return NextResponse.redirect(url);
}
