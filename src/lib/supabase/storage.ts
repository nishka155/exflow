import "server-only";
import { nanoid } from "nanoid";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "documents";

export async function uploadDocumentFile(
  organizationId: string,
  category: string,
  fileName: string,
  data: Buffer | Blob,
  contentType?: string
) {
  const admin = createSupabaseAdminClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${organizationId}/${category}/${nanoid()}-${safeName}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, data, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return path;
}

export async function getSignedDownloadUrl(path: string, expiresInSeconds = 3600) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Could not sign URL: ${error.message}`);
  return data.signedUrl;
}

export async function deleteDocumentFile(path: string) {
  const admin = createSupabaseAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}
