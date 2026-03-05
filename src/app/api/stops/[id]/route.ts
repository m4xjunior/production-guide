import { NextRequest, NextResponse } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";

/**
 * PATCH /api/stops/:id
 * Cierra un paro de estacion.
 * Body: { endAt? } — si no se proporciona, usa now()
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantOrError = requireTenantId(request);
  if (tenantOrError instanceof Response) return tenantOrError;
  const tenantId = tenantOrError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { endAt } = body;

    // Verificar que el stop pertenece al tenant via station
    const existing = await prisma.stationStop.findUnique({
      where: { id },
      include: { station: { select: { tenantId: true } } },
    });
    if (!existing || existing.station.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Paro no encontrado" },
        { status: 404 }
      );
    }

    const stop = await prisma.stationStop.update({
      where: { id },
      data: {
        endAt: endAt ? new Date(endAt) : new Date(),
      },
    });

    return NextResponse.json({ stop });
  } catch (error) {
    console.error("Error al cerrar paro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
