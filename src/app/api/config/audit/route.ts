import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

    const db = getTenantPrisma(tenantId);
    const logs = await db.auditLog.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { performedAt: "desc" },
      take: limit,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error al obtener logs de auditoría:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
