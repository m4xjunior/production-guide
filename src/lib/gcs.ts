import { Storage } from "@google-cloud/storage";

const BUCKET = process.env.GCS_BUCKET!;
const TENANT = process.env.GCS_TENANT || "p2v";

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (!_storage) {
    let credentials: Record<string, unknown> | undefined;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      } catch {
        // ADC local usará as credenciais padrão do ambiente
      }
    }
    _storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      ...(credentials && { credentials }),
    });
  }
  return _storage;
}

function bucket() {
  return getStorage().bucket(BUCKET);
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

// ─── Batch Signed URLs ─────────────────────────────────────────────────────
/**
 * Converte uma URL pública do GCS (`https://storage.googleapis.com/BUCKET/tenants/...`)
 * numa signed URL de `expiresInMinutes` minutos.
 * Se a URL não pertencer ao bucket configurado, retorna a URL original intacta.
 */
export async function signPublicUrl(
  publicUrl: string,
  expiresInMinutes = 60 * 24 * 7, // 7 dias
): Promise<string> {
  const prefix = `https://storage.googleapis.com/${BUCKET}/`;
  if (!publicUrl.startsWith(prefix)) return publicUrl;

  const gcsObjectPath = publicUrl.slice(prefix.length);
  const file = bucket().file(gcsObjectPath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    version: "v4",
  });
  return url;
}

/**
 * Assina em paralelo uma lista de URLs públicas do GCS.
 * Retorna null para entradas null/undefined; retorna original em caso de erro.
 */
export async function signPublicUrls(
  urls: (string | null | undefined)[],
  expiresInMinutes = 60 * 24 * 7,
): Promise<(string | null)[]> {
  return Promise.all(
    urls.map((url) =>
      url ? signPublicUrl(url, expiresInMinutes).catch(() => url) : Promise.resolve(null),
    ),
  );
}
