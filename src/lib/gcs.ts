import { Storage } from "@google-cloud/storage";

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : undefined;

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  ...(credentials && { credentials }),
});

const BUCKET = process.env.GCS_BUCKET!;
const TENANT = process.env.GCS_TENANT || "p2v";

function bucket() {
  return storage.bucket(BUCKET);
}

function tenantPath(path: string): string {
  return `tenants/${TENANT}/${path}`;
}

// ─── Upload ────────────────────────────────────────────────
export async function uploadFile(
  localPath: string,
  gcsPath: string,
  contentType?: string
): Promise<string> {
  const destination = tenantPath(gcsPath);
  await bucket().upload(localPath, {
    destination,
    contentType,
    metadata: { cacheControl: "public, max-age=3600" },
  });
  return `gs://${BUCKET}/${destination}`;
}

export async function uploadBuffer(
  buffer: Buffer,
  gcsPath: string,
  contentType: string
): Promise<string> {
  const destination = tenantPath(gcsPath);
  const file = bucket().file(destination);
  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: "public, max-age=3600" },
  });
  return `gs://${BUCKET}/${destination}`;
}

// ─── Download ──────────────────────────────────────────────
export async function downloadJson<T>(gcsPath: string): Promise<T> {
  const file = bucket().file(tenantPath(gcsPath));
  const [content] = await file.download();
  return JSON.parse(content.toString()) as T;
}

export async function downloadBuffer(gcsPath: string): Promise<Buffer> {
  const file = bucket().file(tenantPath(gcsPath));
  const [content] = await file.download();
  return content;
}

// ─── Upload JSON ───────────────────────────────────────────
export async function uploadJson(gcsPath: string, data: unknown): Promise<string> {
  const destination = tenantPath(gcsPath);
  const file = bucket().file(destination);
  await file.save(JSON.stringify(data, null, 2), {
    contentType: "application/json",
    metadata: { cacheControl: "no-cache" },
  });
  return `gs://${BUCKET}/${destination}`;
}

// ─── List ──────────────────────────────────────────────────
export async function listFiles(prefix: string): Promise<string[]> {
  const [files] = await bucket().getFiles({
    prefix: tenantPath(prefix),
  });
  return files.map((f) => f.name);
}

// ─── Signed URL (para imagens privadas) ────────────────────
export async function getSignedUrl(
  gcsPath: string,
  expiresInMinutes = 60
): Promise<string> {
  const file = bucket().file(tenantPath(gcsPath));
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

// ─── Public URL ────────────────────────────────────────────
export function getPublicUrl(gcsPath: string): string {
  return `https://storage.googleapis.com/${BUCKET}/${tenantPath(gcsPath)}`;
}

// ─── Delete ────────────────────────────────────────────────
export async function deleteFile(gcsPath: string): Promise<void> {
  const file = bucket().file(tenantPath(gcsPath));
  await file.delete({ ignoreNotFound: true });
}

// ─── Exists ────────────────────────────────────────────────
export async function fileExists(gcsPath: string): Promise<boolean> {
  const file = bucket().file(tenantPath(gcsPath));
  const [exists] = await file.exists();
  return exists;
}
