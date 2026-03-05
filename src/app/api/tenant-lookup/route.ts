import { NextRequest, NextResponse } from "next/server";
import { getTenantFromCache, setTenantCache } from "@/lib/tenant-cache";
import { prisma } from "@/lib/db";

/**
 * Rota interna usada pelo middleware Edge Runtime para resolver tenantId.
 * Roda no Node.js runtime — pode usar Prisma/pg sem restrições.
 * Apenas aceita chamadas do próprio middleware (header x-internal-middleware).
 *
 * Retorna também os hashes dos admins do tenant para verificação no Edge.
 */
export async function GET(request: NextRequest) {
  // Só aceitar chamadas internas do middleware — validar shared secret
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "INTERNAL_API_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("x-internal-middleware") !== internalSecret) {
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
    // Mesmo com cache, buscar admin hashes (são rápidos de consultar)
    const admins = await prisma.tenantAdmin.findMany({
      where: { tenantId: cached.id, isActive: true },
      select: { passwordHash: true },
    }).catch(() => []);
    return NextResponse.json({
      tenantId: cached.id,
      adminHashes: admins.map((a) => a.passwordHash),
    });
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

    // Buscar admin hashes para verificação no Edge
    const admins = await prisma.tenantAdmin.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { passwordHash: true },
    });

    return NextResponse.json({
      tenantId: tenant.id,
      slug: tenant.slug,
      adminHashes: admins.map((a) => a.passwordHash),
    });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 503 });
  }
}
