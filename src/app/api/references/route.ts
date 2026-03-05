import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/db";

/**
 * GET /api/references
 * Lista todas las referencias activas sincronizadas desde Sage,
 * filtradas por tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
    }

    const db = getTenantPrisma(tenantId);
    const references = await db.reference.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, sageCode: true, name: true },
    });
    return NextResponse.json({ references });
  } catch (error) {
    console.error("Error al obtener referencias:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
