import { NextRequest, NextResponse } from "next/server";
import { extractSubdomain } from "@/lib/tenant-cache";

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "kh";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Middleware multi-tenant (Edge Runtime compatible).
 * 1. Extrae subdomínio → passa slug como header.
 * 2. Resolve tenant ID via API route interna (/api/tenant-lookup).
 * 3. Injeta x-tenant-id e x-tenant-slug nos headers.
 * 4. Valida X-Admin-Password para rotas protegidas.
 */

const RUTAS_PROTEGIDAS_ESCRITURA = [
  "/api/stations",
  "/api/step-logs",
  "/api/upload",
  "/api/config",
  "/api/tts",
];

const METODOS_PUBLICOS = ["GET", "HEAD", "OPTIONS"];

const RUTAS_OPERARIO = [
  "/api/sessions",
  "/api/step-logs",
  "/api/validate/barcode",
  "/api/validate/operator",
  "/api/voice-commands",
];

// Rota interna de tenant lookup — não proteger para evitar loop
const RUTAS_INTERNAS = ["/api/tenant-lookup"];

function requiereAdmin(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const metodo = request.method;

  if (pathname.startsWith("/api/admin")) return true;
  if (METODOS_PUBLICOS.includes(metodo)) return false;

  for (const ruta of RUTAS_OPERARIO) {
    if (pathname.startsWith(ruta)) return false;
  }

  for (const ruta of RUTAS_PROTEGIDAS_ESCRITURA) {
    if (pathname.startsWith(ruta)) return true;
  }

  return false;
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
  let tenantId = "00000000-0000-0000-0000-000000000000";
  try {
    const lookupUrl = new URL(`/api/tenant-lookup?slug=${encodeURIComponent(slug)}&domain=${encodeURIComponent(hostname)}`, request.url);
    const res = await fetch(lookupUrl.toString(), {
      headers: { "x-internal-middleware": "1" },
    });
    if (res.ok) {
      const data = await res.json() as { tenantId?: string; error?: string };
      if (data.tenantId) {
        tenantId = data.tenantId;
      } else if (data.error) {
        // Tenant não encontrado — páginas frontend: deixar passar
        if (!pathname.startsWith("/api")) {
          const response = NextResponse.next();
          response.headers.set("x-tenant-slug", slug);
          return response;
        }
        return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
      }
    }
  } catch {
    // Fallback para dev sem DB
  }

  // Validar admin para rotas protegidas
  if (pathname.startsWith("/api") && requiereAdmin(request)) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error("ADMIN_PASSWORD no configurada en variables de entorno");
      return NextResponse.json(
        { error: "Configuración de servidor incompleta" },
        { status: 500 }
      );
    }

    const passwordRecibida = request.headers.get("X-Admin-Password");
    if (!passwordRecibida) {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere la cabecera X-Admin-Password" },
        { status: 401 }
      );
    }
    if (!constantTimeEqual(passwordRecibida, adminPassword)) {
      return NextResponse.json(
        { error: "Contraseña de administrador incorrecta" },
        { status: 401 }
      );
    }
  }

  // Injetar headers de tenant
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);
  requestHeaders.set("x-tenant-slug", slug);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-tenant-id", tenantId);
  response.headers.set("x-tenant-slug", slug);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
