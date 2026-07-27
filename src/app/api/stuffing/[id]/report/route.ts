import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { getSignedDownloadUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser("stuffing");
  const stuffing = await prisma.factoryStuffing.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!stuffing || !stuffing.reportUrl) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  const url = await getSignedDownloadUrl(stuffing.reportUrl);
  return NextResponse.redirect(url);
}
