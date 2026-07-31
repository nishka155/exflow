import { nanoid } from "nanoid";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET!;

// S3_ENDPOINT is only set for S3-compatible providers other than AWS itself
// (Cloudflare R2, Backblaze B2, MinIO, etc.) — omit it to talk to real AWS S3.
const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export async function uploadDocumentFile(
  organizationId: string,
  category: string,
  fileName: string,
  data: Buffer | Blob,
  contentType?: string
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${organizationId}/${category}/${nanoid()}-${safeName}`;

  const body = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      Body: body,
      ContentType: contentType,
    })
  );

  return path;
}

export async function getSignedDownloadUrl(path: string, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: path });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function deleteDocumentFile(path: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: path }));
}
