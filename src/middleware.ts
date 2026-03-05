import { NextRequest, NextResponse } from "next/server";
import { extractSubdomain } from "@/lib/tenant-cache";
import { verifyPassword } from "@/lib/password";

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "kh";

function constantTimeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < maxLen; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashCacheKey(tenantId: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${tenantId}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(hash)).slice(0, 32);
}

/**
 * Middleware multi-tenant (Edge Runtime compatible).
 * 1. Extrae subdomínio → passa slug como header.
 * 2. Resolve tenant ID via API route interna (/api/tenant-lookup).
 * 3. Injeta x-tenant-id e x-tenant-slug nos headers.
 * 4. Valida admin per-tenant (TenantAdmin) com fallback para ADMIN_PASSWORD.
 */

const RUTAS_PROTEGIDAS_ESCRITURA = [
  "/api/stations",
  "/api/step-logs",
  "/api/upload",
  "/api/config",
  "/api/tts",
  "/api/reports",
];

// Rotas que requerem admin mesmo para GET (dados sensíveis)
const RUTAS_PROTEGIDAS_LECTURA = [
  "/api/reports",
  "/api/config/audit",
];

const METODOS_PUBLICOS = ["GET", "HEAD", "OPTIONS"];

const RUTAS_OPERARIO = [
  "/api/sessions",
  "/api/step-logs",
  "/api/validate/barcode",
  "/api/validate/operator",
  "/api/stops",
];

// Rota interna de tenant lookup — não proteger para evitar loop
const RUTAS_INTERNAS = ["/api/tenant-lookup"];

// Cache de tenant no Edge — persiste dentro do mesmo isolate V8
type TenantCacheEntry = { tenantId: string; adminHashes: string[]; expiresAt: number };
const edgeTenantCache = new Map<string, TenantCacheEntry>();
const EDGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const MAX_EDGE_TENANT_CACHE = 200;

// Cache de verificação de password — evita PBKDF2 em cada request
const adminVerifyCache = new Map<string, { ok: boolean; expiresAt: number }>();
const VERIFY_CACHE_TTL = 5 * 60 * 1000;
const MAX_VERIFY_CACHE = 50;

function requiereAdmin(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const metodo = request.method;

  if (pathname.startsWith("/api/admin")) return true;

  // Rotas com dados sensíveis requerem admin mesmo para GET
  for (const ruta of RUTAS_PROTEGIDAS_LECTURA) {
    if (pathname.startsWith(ruta)) return true;
  }

  if (METODOS_PUBLICOS.includes(metodo)) return false;

  for (const ruta of RUTAS_OPERARIO) {
    if (pathname.startsWith(ruta)) return false;
  }

  for (const ruta of RUTAS_PROTEGIDAS_ESCRITURA) {
    if (pathname.startsWith(ruta)) return true;
  }

  return false;
}

/**
 * Verifica a password do admin:
 * 1. Fast path: ADMIN_PASSWORD env var (constant-time, instant)
 * 2. Per-tenant: TenantAdmin hashes via PBKDF2 (cached 5 min)
 */
async function checkAdminPassword(
  password: string,
  tenantId: string,
  adminHashes: string[],
): Promise<boolean> {
  // 1. Fast path: global ADMIN_PASSWORD (backward compat)
  const globalPassword = process.env.ADMIN_PASSWORD;
  if (globalPassword && constantTimeEqual(password, globalPassword)) {
    return true;
  }

  // 2. Check verify cache (SHA-256 of full password to avoid prefix collisions)
  const cacheKey = await hashCacheKey(tenantId, password);
  const cached = adminVerifyCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.ok;
  }

  // 3. Verify against TenantAdmin PBKDF2 hashes
  if (adminHashes.length === 0) return false;

  let ok = false;
  for (const hash of adminHashes) {
    if (await verifyPassword(password, hash)) {
      ok = true;
      break;
    }
  }

  // Cache result (sweep expired first, then FIFO evict if still full)
  if (adminVerifyCache.size >= MAX_VERIFY_CACHE) {
    const now = Date.now();
    for (const [key, val] of adminVerifyCache) {
      if (now >= val.expiresAt) adminVerifyCache.delete(key);
    }
    if (adminVerifyCache.size >= MAX_VERIFY_CACHE) {
      const firstKey = adminVerifyCache.keys().next().value;
      if (firstKey) adminVerifyCache.delete(firstKey);
    }
  }
  adminVerifyCache.set(cacheKey, { ok, expiresAt: Date.now() + VERIFY_CACHE_TTL });
  return ok;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Não interceptar rotas internas do próprio middleware
  for (const ruta of RUTAS_INTERNAS) {
    if (pathname.startsWith(ruta)) return NextResponse.next();
  }

  const hostname = request.headers.get("host") || "localhost";
  const slug = extractSubdomain(hostname) ?? DEFAULT_TENANT_SLUG;

  // Resolver tenant via API route interna (sem usar Prisma diretamente — Edge Runtime)
  let tenantId: string | null = null;
  let adminHashes: string[] = [];

  const cachedTenant = edgeTenantCache.get(slug);
  if (cachedTenant && Date.now() < cachedTenant.expiresAt) {
    tenantId = cachedTenant.tenantId;
    adminHashes = cachedTenant.adminHashes;
  } else {
    try {
      const lookupUrl = new URL(`/api/tenant-lookup?slug=${encodeURIComponent(slug)}&domain=${encodeURIComponent(hostname)}`, request.url);
      const internalSecret = process.env.INTERNAL_API_SECRET;
      if (!internalSecret) {
        console.error("INTERNAL_API_SECRET not configured");
        if (pathname.startsWith("/api")) {
          return NextResponse.json({ error: "Configuración de servidor incompleta" }, { status: 500 });
        }
        return NextResponse.next();
      }
      const res = await fetch(lookupUrl.toString(), {
        headers: { "x-internal-middleware": internalSecret },
      });
      if (res.ok) {
        const data = await res.json() as { tenantId?: string; adminHashes?: string[]; error?: string };
        if (data.tenantId) {
          tenantId = data.tenantId;
          adminHashes = data.adminHashes ?? [];
          if (edgeTenantCache.size >= MAX_EDGE_TENANT_CACHE) {
            const firstKey = edgeTenantCache.keys().next().value;
            if (firstKey) edgeTenantCache.delete(firstKey);
          }
          edgeTenantCache.set(slug, { tenantId, adminHashes, expiresAt: Date.now() + EDGE_CACHE_TTL });
        } else if (data.error) {
          if (!pathname.startsWith("/api")) {
            const response = NextResponse.next();
            response.headers.set("x-tenant-slug", slug);
            return response;
          }
          return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
        }
      }
    } catch {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Servicio temporalmente no disponible" }, { status: 503 });
      }
    }
  }

  // Se não resolvemos tenant para rotas API, retornar erro
  if (!tenantId && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Tenant no identificado" }, { status: 503 });
  }

  // Validar admin para rotas protegidas (per-tenant + fallback global)
  if (pathname.startsWith("/api") && requiereAdmin(request)) {
    const passwordRecibida = request.headers.get("X-Admin-Password");
    if (!passwordRecibida) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere la cabecera X-Admin-Password" },
        { status: 401 },
      );
    }

    const isValid = await checkAdminPassword(passwordRecibida, tenantId || "", adminHashes);
    if (!isValid) {
      return NextResponse.json(
        { error: "Contraseña de administrador incorrecta" },
        { status: 401 },
      );
    }
  }

  // Injetar headers de tenant
  const requestHeaders = new Headers(request.headers);
  if (tenantId) requestHeaders.set("x-tenant-id", tenantId);
  requestHeaders.set("x-tenant-slug", slug);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (tenantId) response.headers.set("x-tenant-id", tenantId);
  response.headers.set("x-tenant-slug", slug);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
