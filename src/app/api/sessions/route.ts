import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/sessions
 * Iniciar sesión de operario.
 * Body: { operatorNumber, stationId }
 * Desactiva cualquier sesión activa previa del mismo operario.
 */
export async function POST(request: NextRequest) {
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

    // Verificar que la estación existe, está activa y pertenece al tenant
    const tenantId = request.headers.get("x-tenant-id");
    const station = await prisma.station.findUnique({
      where: { id: stationId },
    });
    if (!station || !station.isActive || (tenantId && station.tenantId !== tenantId)) {
      return NextResponse.json(
        { error: "Estación no encontrada o no está activa" },
        { status: 404 },
      );
    }

    // Verificar que referenceId está vinculado a la estación y está activo
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

    // Desactivar sesiones activas previas de este operario
    await prisma.operatorSession.updateMany({
      where: {
        operatorNumber,
        isActive: true,
      },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    // Crear nueva sesión
    const session = await prisma.operatorSession.create({
      data: {
        operatorNumber,
        stationId,
        ...(referenceId !== undefined && { referenceId }),
      },
    });

    // Obtener los pasos de la estación ordenados
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
