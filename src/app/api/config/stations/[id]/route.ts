import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, prisma, requireTenantId } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const db = getTenantPrisma(tenantOrError);

  const { id } = await params;

  // Verificar que la estación pertenece al tenant
  const station = await db.station.findFirst({ where: { id } });
  if (!station) {
    return NextResponse.json(
      { error: "Estación no encontrada" },
      { status: 404 }
    );
  }

  const settings = await prisma.stationSettings.upsert({
    where: { stationId: id },
    create: { stationId: id },
    update: {},
  });
  return NextResponse.json({ settings });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;
  const db = getTenantPrisma(tenantId);

  try {
    const { id } = await params;

    // Verificar que la estación pertenece al tenant
    const station = await db.station.findFirst({ where: { id } });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowed = ["ttsVoiceId", "fontSize", "backgroundColor", "accentColor", "autoAdvanceDelay"];
    const current = await prisma.stationSettings.findUnique({ where: { stationId: id } });
    const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    const settings = await prisma.stationSettings.upsert({
      where: { stationId: id },
      create: { stationId: id, ...data, updatedBy: "admin" },
      update: { ...data, updatedBy: "admin" },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "UPDATE_STATION_SETTINGS",
        entityType: "StationSettings",
        entityId: id,
        oldValue: (current as object) ?? {},
        newValue: settings as object,
        performedBy: "admin",
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error al actualizar configuración de estación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
