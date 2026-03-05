import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, prisma, requireTenantId } from "@/lib/db";

/**
 * POST /api/sessions
 * Iniciar sesión de operario.
 * Body: { operatorNumber, stationId }
 * Desactiva cualquier sesión activa previa del mismo operario EN EL MISMO TENANT.
 */
export async function POST(request: NextRequest) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;
  const db = getTenantPrisma(tenantId);

  try {
    const body = await request.json();
    const { operatorNumber, stationId, referenceId } = body;

    if (!operatorNumber || typeof operatorNumber !== "string") {
      return NextResponse.json(
        { error: "El campo 'operatorNumber' es obligatorio" },
        { status: 400 },
      );
    }
    if (!stationId || typeof stationId !== "string") {
      return NextResponse.json(
        { error: "El campo 'stationId' es obligatorio" },
        { status: 400 },
      );
    }
    if (referenceId !== undefined && typeof referenceId !== "string") {
      return NextResponse.json(
        { error: "El campo 'referenceId' debe ser un string" },
        { status: 400 },
      );
    }

    // Verificar que la estación existe, está activa y pertenece al tenant (filtro automático via db)
    const station = await db.station.findFirst({
      where: { id: stationId, isActive: true },
    });
    if (!station) {
      return NextResponse.json(
        { error: "Estación no encontrada o no está activa" },
        { status: 404 },
      );
    }

    if (referenceId) {
      const linked = await prisma.stationReference.findFirst({
        where: {
          stationId,
          referenceId,
          reference: { isActive: true },
        },
      });
      if (!linked) {
        return NextResponse.json(
          { error: "La referencia no está vinculada a esta estación o no está activa" },
          { status: 400 },
        );
      }
    }

    // Desactivar sesiones activas previas — scoped por estaciones del tenant
    await prisma.operatorSession.updateMany({
      where: {
        operatorNumber,
        isActive: true,
        station: { tenantId },
      },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    const session = await prisma.operatorSession.create({
      data: {
        operatorNumber,
        stationId,
        ...(referenceId !== undefined && { referenceId }),
      },
    });

    const steps = await prisma.step.findMany({
      where: { stationId },
      orderBy: { orderNum: "asc" },
    });

    return NextResponse.json({ session, steps }, { status: 201 });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
