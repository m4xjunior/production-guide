import { NextRequest, NextResponse } from "next/server";
import { getTenantFromCache, setTenantCache } from "@/lib/tenant-cache";
import { prisma } from "@/lib/db";

/**
 * Rota interna usada pelo middleware Edge Runtime para resolver tenantId.
 * Roda no Node.js runtime — pode usar Prisma/pg sem restrições.
 * Apenas aceita chamadas do próprio middleware (header x-internal-middleware).
 */
export async function GET(request: NextRequest) {
  // Só aceitar chamadas internas do middleware
  if (!request.headers.get("x-internal-middleware")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  const domain = request.nextUrl.searchParams.get("domain");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  // Cache em memória (no mesmo worker Node.js)
  const cached = getTenantFromCache(slug);
  if (cached) {
    return NextResponse.json({ tenantId: cached.id });

  }

  try {
    // 1. Buscar por slug
    let tenant = await prisma.tenant.findUnique({ where: { slug } });

    // 2. Fallback: buscar por customDomain (ex: p2v.lexusfx.com → tenant kh)
    if ((!tenant || !tenant.isActive) && domain) {
      tenant = await prisma.tenant.findUnique({ where: { customDomain: domain } });
    }

    if (!tenant || !tenant.isActive) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }
    setTenantCache(slug, tenant.id);
    return NextResponse.json({ tenantId: tenant.id, slug: tenant.slug });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
