import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  try {
    const { id } = await params;
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
