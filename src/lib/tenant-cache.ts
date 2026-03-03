type TenantEntry = {
  id: string;
  slug: string;
  expiresAt: number;
};

const cache = new Map<string, TenantEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutos

export function getTenantFromCache(slug: string): TenantEntry | null {
  const entry = cache.get(slug);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(slug);
    return null;
  }
  return entry;
}

export function setTenantCache(slug: string, id: string): void {
  cache.set(slug, { id, slug, expiresAt: Date.now() + TTL_MS });
}

export function extractSubdomain(hostname: string): string | null {
  // "kh.sao.app" → "kh"
  // "localhost" | "sao.app" → null (usa DEFAULT_TENANT_SLUG)
  // IPs como "192.168.1.1" → null
  const hostWithoutPort = hostname.split(":")[0];
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostWithoutPort) ||
    hostWithoutPort === "localhost" ||
    hostWithoutPort.includes(":");  // IPv6
  if (isIp) return null;

  const parts = hostWithoutPort.split(".");
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (sub === "www" || sub === "app") return null;
  return sub;
}
