import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { getSignedDownloadUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  const document = await prisma.document.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const url = await getSignedDownloadUrl(document.fileUrl);
  return NextResponse.redirect(url);
}
